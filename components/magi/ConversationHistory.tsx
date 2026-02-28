'use client';

import { useState } from 'react';
import type { ConversationTurn, PersonalityId } from '@/types/magi';
import { DEFAULT_PERSONALITIES, PERSONALITY_IDS } from '@/lib/personalities';

interface ConversationHistoryProps {
  history: ConversationTurn[];
  sessionStartIndex: number;
  onDelete: (id: string) => void;
  onResumeFrom: (index: number) => void;
  onNewSession?: () => void;
}

function TurnSummary({
  turn,
  index,
  isInContext,
  onDelete,
  onResumeFrom,
}: {
  turn: ConversationTurn;
  index: number;
  isInContext: boolean;
  onDelete: (id: string) => void;
  onResumeFrom: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isApproved = turn.approvedCount >= 2;

  const handleDelete = () => {
    if (window.confirm(`この履歴を削除しますか？\n「${turn.query}」`)) {
      onDelete(turn.id);
    }
  };

  return (
    <div className={`border rounded-sm overflow-hidden ${isInContext ? 'border-gray-600' : 'border-gray-800'}`}>
      <div className="flex items-center">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center justify-between px-4 py-3 bg-black bg-opacity-40 hover:bg-opacity-60 transition-colors text-left min-w-0"
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
        <button
          onClick={() => onResumeFrom(index)}
          className="px-3 py-3 text-xs font-mono border-l border-gray-800 text-gray-600 hover:text-blue-400 hover:border-blue-900 transition-colors shrink-0"
        >
          続きから
        </button>
      </div>

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
          <div className="pt-2 border-t border-gray-800 flex justify-end">
            <button
              onClick={handleDelete}
              className="text-xs font-mono border border-gray-800 px-3 py-1 text-gray-600 hover:border-red-800 hover:text-red-500 transition-colors"
            >
              DELETE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ConversationHistory({ history, sessionStartIndex, onDelete, onResumeFrom, onNewSession }: ConversationHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div id="conversation-history" className="w-full mt-8">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-mono text-gray-600 tracking-widest">
          ── CONVERSATION HISTORY ({history.length}) ──
        </div>
        {onNewSession && (
          <button
            onClick={onNewSession}
            className="text-xs font-mono border border-gray-700 px-3 py-1 text-gray-500 hover:border-gray-400 hover:text-gray-300 transition-colors"
          >
            NEW SESSION
          </button>
        )}
      </div>
      <div className="space-y-2">
        {[...history].reverse().map((turn, displayIdx) => {
          const actualIdx = history.length - 1 - displayIdx;
          return (
            <TurnSummary
              key={turn.id}
              turn={turn}
              index={actualIdx}
              isInContext={actualIdx >= sessionStartIndex}
              onDelete={onDelete}
              onResumeFrom={onResumeFrom}
            />
          );
        })}
      </div>
    </div>
  );
}
