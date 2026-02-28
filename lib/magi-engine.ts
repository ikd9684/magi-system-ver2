import type {
  PersonalityId,
  ConversationTurn,
  MAGISettings,
  VoteResult,
} from '@/types/magi';
import { encodeSSE } from './sse-utils';
import { createOllamaClient, streamChat, chat } from './ollama';
import { DEFAULT_PERSONALITIES, PERSONALITY_IDS } from './personalities';

function buildMessageHistory(
  history: ConversationTurn[],
  personalityId: PersonalityId,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return history.flatMap((turn) => [
    { role: 'user' as const, content: turn.query },
    {
      role: 'assistant' as const,
      content:
        turn.outputs[personalityId].phase1 +
        '\n[反論・補足]\n' +
        turn.outputs[personalityId].phase2,
    },
  ]);
}

function getSystemPrompt(settings: MAGISettings, personalityId: PersonalityId): string {
  return settings.personalities[personalityId] ?? DEFAULT_PERSONALITIES[personalityId].systemPrompt;
}

export async function runDebate(
  query: string,
  history: ConversationTurn[],
  settings: MAGISettings,
  controller: ReadableStreamDefaultController<Uint8Array>,
  signal: AbortSignal,
): Promise<void> {
  const encoder = new TextEncoder();
  const send = (event: Parameters<typeof encodeSSE>[0]) => {
    controller.enqueue(encoder.encode(encodeSSE(event)));
  };

  const client = createOllamaClient();
  const model = settings.model;

  const phase1Results: Record<PersonalityId, string> = {
    MELCHIOR: '',
    BALTHASAR: '',
    CASPER: '',
  };
  const phase2Results: Record<PersonalityId, string> = {
    MELCHIOR: '',
    BALTHASAR: '',
    CASPER: '',
  };

  // Phase 1: 初期見解（逐次）
  for (const personalityId of PERSONALITY_IDS) {
    if (signal.aborted) return;

    send({ type: 'phase_start', phase: 1, personality: personalityId });

    const prevPhase1 = PERSONALITY_IDS.slice(0, PERSONALITY_IDS.indexOf(personalityId))
      .map((id) => `【${DEFAULT_PERSONALITIES[id].name}の見解】\n${phase1Results[id]}`)
      .join('\n\n');

    const userMessage =
      prevPhase1
        ? `以下の問いについて初期見解を述べてください。\n\n問い: ${query}\n\n先に発言した人格の見解:\n${prevPhase1}`
        : `以下の問いについて初期見解を述べてください。\n\n問い: ${query}`;

    const messages = [
      ...buildMessageHistory(history, personalityId),
      { role: 'user' as const, content: userMessage },
    ];

    const systemPrompt = getSystemPrompt(settings, personalityId);
    let accumulated = '';

    for await (const delta of streamChat(client, model, systemPrompt, messages)) {
      if (signal.aborted) return;
      accumulated += delta;
      send({ type: 'text_delta', personality: personalityId, phase: 1, delta });
    }

    phase1Results[personalityId] = accumulated;
    send({ type: 'personality_done', personality: personalityId, phase: 1 });
  }

  // Phase 2: 反論・議論（逐次）
  const phase1Summary = PERSONALITY_IDS.map(
    (id) => `【${DEFAULT_PERSONALITIES[id].name}の初期見解】\n${phase1Results[id]}`,
  ).join('\n\n');

  for (const personalityId of PERSONALITY_IDS) {
    if (signal.aborted) return;

    send({ type: 'phase_start', phase: 2, personality: personalityId });

    const prevPhase2 = PERSONALITY_IDS.slice(0, PERSONALITY_IDS.indexOf(personalityId))
      .map((id) => `【${DEFAULT_PERSONALITIES[id].name}の反論・補足】\n${phase2Results[id]}`)
      .join('\n\n');

    let userMessage = `元の問い: ${query}\n\n各人格の初期見解:\n${phase1Summary}\n\n上記を踏まえ、反論・補足・深化を行ってください。`;
    if (prevPhase2) {
      userMessage += `\n\n先の人格の反論:\n${prevPhase2}`;
    }

    const messages = [
      ...buildMessageHistory(history, personalityId),
      { role: 'user' as const, content: userMessage },
    ];

    const systemPrompt = getSystemPrompt(settings, personalityId);
    let accumulated = '';

    for await (const delta of streamChat(client, model, systemPrompt, messages)) {
      if (signal.aborted) return;
      accumulated += delta;
      send({ type: 'text_delta', personality: personalityId, phase: 2, delta });
    }

    phase2Results[personalityId] = accumulated;
    send({ type: 'personality_done', personality: personalityId, phase: 2 });
  }

  // Phase 3: 投票（並列実行）
  const fullDebate = `元の問い: ${query}

【Phase 1: 初期見解】
${phase1Summary}

【Phase 2: 反論・議論】
${PERSONALITY_IDS.map((id) => `【${DEFAULT_PERSONALITIES[id].name}の反論・補足】\n${phase2Results[id]}`).join('\n\n')}`;

  if (signal.aborted) return;

  const votePromises = PERSONALITY_IDS.map(async (personalityId) => {
    send({ type: 'phase_start', phase: 3, personality: personalityId });

    const voteMessage = `以下の議論を経て、最終的な投票を行ってください。

${fullDebate}

以下のJSON形式のみで回答してください（他の文章は不要）:
{"vote": "承認", "comment": "一言コメント"}

voteは「承認」「否決」「保留」のいずれかを選択してください。`;

    const messages = [
      ...buildMessageHistory(history, personalityId),
      { role: 'user' as const, content: voteMessage },
    ];

    const systemPrompt = getSystemPrompt(settings, personalityId);

    try {
      const response = await chat(client, model, systemPrompt, messages);
      const jsonMatch = response.match(/\{[^}]+\}/);
      if (!jsonMatch) throw new Error('Invalid vote response');

      const parsed = JSON.parse(jsonMatch[0]) as { vote: string; comment: string };
      const validVotes: VoteResult[] = ['承認', '否決', '保留'];
      const vote: VoteResult = validVotes.includes(parsed.vote as VoteResult)
        ? (parsed.vote as VoteResult)
        : '保留';

      send({
        type: 'vote',
        personality: personalityId,
        vote,
        comment: parsed.comment ?? '',
      });
      send({ type: 'personality_done', personality: personalityId, phase: 3 });

      return vote;
    } catch {
      send({ type: 'vote', personality: personalityId, vote: '保留', comment: '判断不能' });
      send({ type: 'personality_done', personality: personalityId, phase: 3 });
      return '保留' as VoteResult;
    }
  });

  const votes = await Promise.all(votePromises);
  const approvedCount = votes.filter((v) => v === '承認').length;

  send({ type: 'debate_complete', approvedCount });
}
