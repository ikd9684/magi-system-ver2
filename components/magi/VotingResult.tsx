'use client';

import type { PersonalityId, PersonalityOutput, VoteResult } from '@/types/magi';
import { DEFAULT_PERSONALITIES, PERSONALITY_IDS } from '@/lib/personalities';

interface VotingResultProps {
  outputs: Record<PersonalityId, PersonalityOutput>;
  approvedCount: number;
}

function VoteBadge({ vote, color }: { vote: VoteResult; color: string }) {
  const bg =
    vote === '承認' ? 'bg-green-900 border-green-500 text-green-300'
    : vote === '否決' ? 'bg-red-900 border-red-500 text-red-300'
    : 'bg-yellow-900 border-yellow-500 text-yellow-300';

  return (
    <span className={`border px-3 py-1 font-mono font-bold text-sm tracking-widest ${bg}`}>
      {vote}
    </span>
  );
}

export function VotingResult({ outputs, approvedCount }: VotingResultProps) {
  const isApproved = approvedCount >= 2;
  const resultText = `${approvedCount}/3 ${isApproved ? 'APPROVED' : 'REJECTED'}`;

  return (
    <div className="border border-gray-600 rounded-sm overflow-hidden font-mono mt-6">
      {/* Individual votes */}
      <div className="grid grid-cols-3 divide-x divide-gray-700">
        {PERSONALITY_IDS.map((id) => {
          const config = DEFAULT_PERSONALITIES[id];
          const output = outputs[id];
          return (
            <div key={id} className="px-4 py-3 bg-black bg-opacity-40">
              <div className={`text-xs mb-2 ${config.color} tracking-widest`}>{config.name}</div>
              {output.vote ? (
                <>
                  <VoteBadge vote={output.vote} color={config.color} />
                  <p className="text-gray-400 text-xs mt-2 leading-relaxed">{output.voteComment}</p>
                </>
              ) : (
                <span className="text-gray-600 text-xs">PENDING...</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-700" />

      {/* Final result */}
      <div className="px-4 py-4 bg-black bg-opacity-60 text-center">
        <div
          className={`text-2xl font-bold tracking-[0.2em] ${
            isApproved
              ? 'text-green-400 drop-shadow-[0_0_10px_#4ade80]'
              : 'text-red-400 drop-shadow-[0_0_10px_#f87171]'
          }`}
        >
          MAGI SYSTEM: {resultText}
        </div>
      </div>
    </div>
  );
}
