export type PersonalityId = 'MELCHIOR' | 'BALTHASAR' | 'CASPER';
export type DebatePhase = 'idle' | 'phase1' | 'phase2' | 'phase3' | 'complete' | 'error';
export type PersonalityStatus = 'idle' | 'thinking' | 'streaming' | 'done';
export type VoteResult = '承認' | '否決' | '保留';

export interface PersonalityOutput {
  status: PersonalityStatus;
  content: string;        // current phase streaming content
  phase1: string;         // 初期見解
  phase2: string;         // 反論
  vote?: VoteResult;
  voteComment?: string;
}

export type SSEEvent =
  | { type: 'phase_start'; phase: 1 | 2 | 3; personality: PersonalityId }
  | { type: 'text_delta'; personality: PersonalityId; phase: 1 | 2 | 3; delta: string }
  | { type: 'vote'; personality: PersonalityId; vote: VoteResult; comment: string }
  | { type: 'personality_done'; personality: PersonalityId; phase: 1 | 2 | 3 }
  | { type: 'debate_complete'; approvedCount: number }
  | { type: 'error'; message: string };

export interface ConversationTurn {
  id: string;
  query: string;
  outputs: Record<PersonalityId, PersonalityOutput>;
  approvedCount: number;
  timestamp: number;
}

export interface MAGIState {
  phase: DebatePhase;
  currentQuery: string;
  currentOutputs: Record<PersonalityId, PersonalityOutput>;
  history: ConversationTurn[];
  isStreaming: boolean;
  errorMessage?: string;
}

export interface PersonalityConfig {
  id: PersonalityId;
  name: string;
  subtitle: string;
  color: string;
  glowColor: string;
  borderColor: string;
  bgColor: string;
  systemPrompt: string;
}

export interface MAGISettings {
  model: string;
  personalities: Record<PersonalityId, string>;
}

export interface DebateRequest {
  query: string;
  history: ConversationTurn[];
  settings: MAGISettings;
}
