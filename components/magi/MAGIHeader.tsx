'use client';

import Link from 'next/link';
import type { DebatePhase } from '@/types/magi';

interface MAGIHeaderProps {
  phase: DebatePhase;
}

const PHASE_LABELS: Record<DebatePhase, string> = {
  idle: 'STANDBY',
  phase1: 'PHASE 1: INITIAL ANALYSIS',
  phase2: 'PHASE 2: DEBATE & COUNTER',
  phase3: 'PHASE 3: VOTING',
  complete: 'CONSENSUS REACHED',
  error: 'SYSTEM ERROR',
};

const PHASE_COLORS: Record<DebatePhase, string> = {
  idle: 'text-gray-600',
  phase1: 'text-blue-400',
  phase2: 'text-emerald-400',
  phase3: 'text-amber-400',
  complete: 'text-green-400',
  error: 'text-red-400',
};

export function MAGIHeader({ phase }: MAGIHeaderProps) {
  return (
    <header className="border-b border-gray-800 pb-4 mb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-mono font-bold tracking-[0.3em] text-white">
            MAGI<span className="text-gray-600">:</span>SYSTEM
          </h1>
          <div className="text-gray-600 text-xs font-mono tracking-widest mt-1">
            MULTI-AGENT GENERAL INTELLIGENCE — ver.2
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`text-xs font-mono tracking-widest ${PHASE_COLORS[phase]}`}>
            <span className="text-gray-700">STATUS: </span>
            <span className={phase !== 'idle' ? 'animate-pulse' : ''}>
              {PHASE_LABELS[phase]}
            </span>
          </div>
          <Link
            href="/settings"
            className="text-xs font-mono border border-gray-700 px-3 py-1.5 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors"
          >
            SETTINGS
          </Link>
        </div>
      </div>

      {/* Phase progress bar */}
      {phase !== 'idle' && phase !== 'error' && (
        <div className="mt-4 flex gap-1">
          {(['phase1', 'phase2', 'phase3', 'complete'] as const).map((p, i) => {
            const phases: DebatePhase[] = ['phase1', 'phase2', 'phase3', 'complete'];
            const currentIdx = phases.indexOf(phase);
            const isActive = i === currentIdx;
            const isDone = i < currentIdx;
            return (
              <div
                key={p}
                className={`h-0.5 flex-1 transition-all duration-500 ${
                  isDone ? 'bg-gray-400' : isActive ? 'bg-current animate-pulse' : 'bg-gray-800'
                } ${PHASE_COLORS[p]}`}
              />
            );
          })}
        </div>
      )}
    </header>
  );
}
