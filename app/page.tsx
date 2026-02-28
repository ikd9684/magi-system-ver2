'use client';

import { useMAGIContext } from '@/contexts/MAGIContext';
import { useSettings } from '@/hooks/useSettings';
import { MAGIHeader } from '@/components/magi/MAGIHeader';
import { DebateArena } from '@/components/magi/DebateArena';
import { QueryInput } from '@/components/magi/QueryInput';
import { ConversationHistory } from '@/components/magi/ConversationHistory';

export default function HomePage() {
  const { state, submitQuery, abort, clearAll, deleteTurn } = useMAGIContext();
  const { settings } = useSettings();

  const lastTurn = state.history[state.history.length - 1];
  const showArena = state.phase !== 'idle' || state.history.length > 0;

  return (
    <main className="min-h-screen max-w-7xl mx-auto px-6 py-8">
      <MAGIHeader phase={state.phase} isStreaming={state.isStreaming} historyCount={state.history.length} />

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <QueryInput
              onSubmit={(query) => submitQuery(query, settings)}
              onAbort={abort}
              isStreaming={state.isStreaming}
              placeholder="問いを入力してください..."
            />
          </div>
          {state.history.length > 0 && !state.isStreaming && (
            <button
              onClick={clearAll}
              className="text-xs font-mono border border-gray-700 px-3 py-2 text-gray-500 hover:border-gray-400 hover:text-gray-300 transition-colors shrink-0"
            >
              NEW SESSION
            </button>
          )}
        </div>

        {/* Current debate */}
        {state.phase !== 'idle' && (
          <div className="space-y-2">
            {state.currentQuery && (
              <div className="text-xs font-mono text-gray-600 tracking-widest">
                QUERY:{' '}
                <span className="text-gray-400">{state.currentQuery}</span>
              </div>
            )}
            <DebateArena
              outputs={state.currentOutputs}
              debatePhase={state.phase}
              approvedCount={
                state.phase === 'complete' && lastTurn
                  ? lastTurn.approvedCount
                  : undefined
              }
            />
          </div>
        )}

        {/* Error state */}
        {state.phase === 'error' && (
          <div className="border border-red-800 bg-red-950 bg-opacity-20 px-4 py-3 font-mono text-sm text-red-400 space-y-1">
            <div>SYSTEM ERROR: Ollamaとの通信に失敗しました。</div>
            {state.errorMessage && (
              <div className="text-red-600 text-xs break-all">{state.errorMessage}</div>
            )}
          </div>
        )}

        {/* Idle state hint */}
        {state.phase === 'idle' && state.history.length === 0 && (
          <div className="text-center py-16 text-gray-700 font-mono text-sm space-y-2">
            <div className="text-lg tracking-widest">[ MAGI SYSTEM READY ]</div>
            <div className="text-xs tracking-widest">
              MELCHIOR · BALTHASAR · CASPER
            </div>
            <div className="text-xs text-gray-800 mt-4">
              問いを入力すると3つの人格が議論し合議を行います
            </div>
          </div>
        )}

        <ConversationHistory history={state.history} onDelete={deleteTurn} />
      </div>
    </main>
  );
}
