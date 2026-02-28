'use client';

import { useState } from 'react';
import type { ConversationTurn, PersonalityId } from '@/types/magi';
import { DEFAULT_PERSONALITIES, PERSONALITY_IDS } from '@/lib/personalities';

interface ConversationHistoryProps {
  history: ConversationTurn[];
}

function TurnSummary({ turn }: { turn: ConversationTurn }) {
  const [expanded, setExpanded] = useState(false);
  const isApproved = turn.approvedCount >= 2;

  return (
    <div className="border border-gray-800 rounded-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-black bg-opacity-40 hover:bg-opacity-60 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-xs font-mono font-bold tracking-widest shrink-0 ${isApproved ? 'text-green-400' : 'text-red-400'}`}>
            {turn.approvedCount}/3
          </span>
          <span className="text-gray-400 text-sm font-mono truncate">{turn.query}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-gray-600 text-xs font-mono">
            {new Date(turn.timestamp).toLocaleTimeString()}
          </span>
          <span className="text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-3">
          {PERSONALITY_IDS.map((id) => {
            const config = DEFAULT_PERSONALITIES[id as PersonalityId];
            const output = turn.outputs[id as PersonalityId];
            return (
              <div key={id} className="space-y-1">
                <div className={`text-xs font-mono ${config.color} tracking-widest`}>
                  {config.name}
                  {output.vote && (
                    <span
                      className={`ml-2 ${
                        output.vote === '承認'
                          ? 'text-green-400'
                          : output.vote === '否決'
                            ? 'text-red-400'
                            : 'text-yellow-400'
                      }`}
                    >
                      [{output.vote}]
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-xs font-mono leading-relaxed pl-2">
                  {output.phase2 || output.phase1 || '—'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ConversationHistory({ history }: ConversationHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div id="conversation-history" className="w-full mt-8">
      <div className="text-xs font-mono text-gray-600 tracking-widest mb-3">
        ── CONVERSATION HISTORY ({history.length}) ──
      </div>
      <div className="space-y-2">
        {[...history].reverse().map((turn) => (
          <TurnSummary key={turn.id} turn={turn} />
        ))}
      </div>
    </div>
  );
}
