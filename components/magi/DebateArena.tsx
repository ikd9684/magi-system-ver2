'use client';

import type { PersonalityId, PersonalityOutput, DebatePhase } from '@/types/magi';
import { PERSONALITY_IDS } from '@/lib/personalities';
import { MAGIPanel } from './MAGIPanel';
import { VotingResult } from './VotingResult';

interface DebateArenaProps {
  outputs: Record<PersonalityId, PersonalityOutput>;
  debatePhase: DebatePhase;
  approvedCount?: number;
}

export function DebateArena({ outputs, debatePhase, approvedCount }: DebateArenaProps) {
  const isComplete = debatePhase === 'complete';
  const showVoting = isComplete && approvedCount !== undefined;

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-4 min-h-[400px]">
        {PERSONALITY_IDS.map((id) => (
          <MAGIPanel
            key={id}
            personalityId={id as PersonalityId}
            output={outputs[id as PersonalityId]}
            debatePhase={debatePhase}
          />
        ))}
      </div>

      {showVoting && (
        <VotingResult outputs={outputs} approvedCount={approvedCount!} />
      )}
    </div>
  );
}
