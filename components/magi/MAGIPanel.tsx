'use client';

import type { PersonalityId, PersonalityOutput, DebatePhase } from '@/types/magi';
import { DEFAULT_PERSONALITIES } from '@/lib/personalities';
import { StreamingText } from './StreamingText';

interface MAGIPanelProps {
  personalityId: PersonalityId;
  output: PersonalityOutput;
  debatePhase: DebatePhase;
}

function StatusBadge({ status }: { status: PersonalityOutput['status'] }) {
  const labels: Record<PersonalityOutput['status'], string> = {
    idle: 'STANDBY',
    thinking: 'PROCESSING',
    streaming: 'TRANSMITTING',
    done: 'COMPLETE',
  };
  const colors: Record<PersonalityOutput['status'], string> = {
    idle: 'text-gray-500 border-gray-700',
    thinking: 'text-yellow-400 border-yellow-600 animate-pulse',
    streaming: 'text-green-400 border-green-600',
    done: 'text-gray-400 border-gray-600',
  };

  return (
    <span className={`text-xs font-mono border px-2 py-0.5 ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

export function MAGIPanel({ personalityId, output, debatePhase }: MAGIPanelProps) {
  const config = DEFAULT_PERSONALITIES[personalityId];
  const isActive = output.status === 'thinking' || output.status === 'streaming';
  const isDone = output.status === 'done';
  const isComplete = debatePhase === 'complete';

  const borderStyle = isActive
    ? `border-2 ${config.borderColor} shadow-[0_0_20px_var(--glow)]`
    : isDone
      ? `border ${config.borderColor} opacity-80`
      : 'border border-gray-800';

  // Show current phase content or phase1/phase2 summaries when complete
  const displayContent = isActive ? output.content : '';
  const phase1Content = output.phase1;
  const phase2Content = output.phase2;

  return (
    <div
      className={`flex flex-col h-full rounded-sm transition-all duration-300 ${borderStyle} overflow-hidden`}
      style={{ '--glow': config.glowColor } as React.CSSProperties}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-2 border-b ${isDone || isComplete ? `border-current ${config.color} bg-black bg-opacity-60` : 'border-gray-800 bg-black bg-opacity-40'}`}
      >
        <div>
          <div className={`font-mono font-bold text-sm tracking-widest ${config.color}`}>
            {config.name}
          </div>
          <div className="text-gray-500 text-xs">{config.subtitle}</div>
        </div>
        <StatusBadge status={output.status} />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black bg-opacity-20">
        {/* Active streaming */}
        {isActive && (
          <StreamingText
            text={output.content}
            isStreaming={output.status === 'streaming'}
            className={`${config.color}`}
          />
        )}

        {/* Phase 1 output (shown when phase >= 2 or complete) */}
        {phase1Content && !isActive && (
          <div>
            <div className={`text-xs font-mono mb-1 ${config.color} opacity-60`}>
              ▶ PHASE 1: 初期見解
            </div>
            <StreamingText text={phase1Content} isStreaming={false} className="text-gray-300" />
          </div>
        )}

        {/* Phase 2 output (shown when complete) */}
        {phase2Content && !isActive && (
          <div>
            <div className={`text-xs font-mono mb-1 ${config.color} opacity-60`}>
              ▶ PHASE 2: 反論・補足
            </div>
            <StreamingText text={phase2Content} isStreaming={false} className="text-gray-300" />
          </div>
        )}

        {/* Idle state */}
        {output.status === 'idle' && !phase1Content && (
          <div className="text-gray-700 font-mono text-xs text-center mt-8">
            [ AWAITING INPUT ]
          </div>
        )}
      </div>

    </div>
  );
}
