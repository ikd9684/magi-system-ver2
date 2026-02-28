'use client';

import { useReducer, useCallback, useRef, useEffect } from 'react';
import type {
  MAGIState,
  PersonalityId,
  PersonalityOutput,
  ConversationTurn,
  SSEEvent,
  MAGISettings,
} from '@/types/magi';
import { parseSSEStream } from '@/lib/sse-utils';
import { PERSONALITY_IDS } from '@/lib/personalities';

function makeInitialOutputs(): Record<PersonalityId, PersonalityOutput> {
  return {
    MELCHIOR: { status: 'idle', content: '', phase1: '', phase2: '' },
    BALTHASAR: { status: 'idle', content: '', phase1: '', phase2: '' },
    CASPER: { status: 'idle', content: '', phase1: '', phase2: '' },
  };
}

const initialState: MAGIState = {
  phase: 'idle',
  currentQuery: '',
  currentOutputs: makeInitialOutputs(),
  history: [],
  isStreaming: false,
};

type Action =
  | { type: 'START_DEBATE'; query: string }
  | { type: 'SSE_EVENT'; event: SSEEvent }
  | { type: 'DEBATE_ERROR'; message: string }
  | { type: 'RESET_CURRENT' }
  | { type: 'CLEAR_ALL' }
  | { type: 'LOAD_HISTORY'; turns: ConversationTurn[] };

function magiReducer(state: MAGIState, action: Action): MAGIState {
  switch (action.type) {
    case 'START_DEBATE':
      return {
        ...state,
        phase: 'phase1',
        currentQuery: action.query,
        currentOutputs: makeInitialOutputs(),
        isStreaming: true,
      };

    case 'SSE_EVENT': {
      const event = action.event;

      switch (event.type) {
        case 'phase_start': {
          const phaseKey = `phase${event.phase}` as 'phase1' | 'phase2' | 'phase3';
          return {
            ...state,
            phase: phaseKey,
            currentOutputs: {
              ...state.currentOutputs,
              [event.personality]: {
                ...state.currentOutputs[event.personality],
                status: 'thinking',
                content: '',
              },
            },
          };
        }

        case 'text_delta': {
          const p = state.currentOutputs[event.personality];
          return {
            ...state,
            currentOutputs: {
              ...state.currentOutputs,
              [event.personality]: {
                ...p,
                status: 'streaming',
                content: p.content + event.delta,
              },
            },
          };
        }

        case 'vote':
          return {
            ...state,
            currentOutputs: {
              ...state.currentOutputs,
              [event.personality]: {
                ...state.currentOutputs[event.personality],
                vote: event.vote,
                voteComment: event.comment,
              },
            },
          };

        case 'personality_done': {
          const p = state.currentOutputs[event.personality];
          const phaseContent = p.content;
          const phaseUpdate =
            event.phase === 1
              ? { phase1: phaseContent }
              : event.phase === 2
                ? { phase2: phaseContent }
                : {};

          return {
            ...state,
            currentOutputs: {
              ...state.currentOutputs,
              [event.personality]: {
                ...p,
                ...phaseUpdate,
                status: event.phase === 3 ? 'done' : 'done',
                content: event.phase === 3 ? p.content : '',
              },
            },
          };
        }

        case 'debate_complete': {
          const newTurn: ConversationTurn = {
            id: Date.now().toString(),
            query: state.currentQuery,
            outputs: state.currentOutputs,
            approvedCount: event.approvedCount,
            timestamp: Date.now(),
          };
          return {
            ...state,
            phase: 'complete',
            isStreaming: false,
            history: [...state.history, newTurn],
          };
        }

        case 'error':
          return {
            ...state,
            phase: 'error',
            isStreaming: false,
            errorMessage: event.message,
          };

        default:
          return state;
      }
    }

    case 'DEBATE_ERROR':
      return { ...state, phase: 'error', isStreaming: false, errorMessage: action.message };

    case 'RESET_CURRENT':
      return {
        ...state,
        phase: 'idle',
        currentQuery: '',
        currentOutputs: makeInitialOutputs(),
        isStreaming: false,
      };

    case 'CLEAR_ALL':
      return { ...initialState };

    case 'LOAD_HISTORY':
      return { ...state, history: action.turns };

    default:
      return state;
  }
}

export function useMAGI() {
  const [state, dispatch] = useReducer(magiReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  // Tracks how many turns have already been persisted to DB
  const persistedCountRef = useRef(0);

  // Load persisted history on mount
  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((turns: ConversationTurn[]) => {
        if (turns.length > 0) {
          dispatch({ type: 'LOAD_HISTORY', turns });
          persistedCountRef.current = turns.length;
        }
      })
      .catch(() => {/* silently ignore */});
  }, []);

  // Persist any newly completed turns (fire-and-forget)
  useEffect(() => {
    const newTurns = state.history.slice(persistedCountRef.current);
    if (newTurns.length === 0) return;
    persistedCountRef.current = state.history.length;
    for (const turn of newTurns) {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(turn),
      }).catch(() => {/* silently ignore */});
    }
  }, [state.history]);

  const submitQuery = useCallback(
    async (query: string, settings: MAGISettings) => {
      if (state.isStreaming) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      dispatch({ type: 'START_DEBATE', query });

      try {
        const response = await fetch('/api/magi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            history: state.history,
            settings,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          dispatch({ type: 'DEBATE_ERROR', message: 'API request failed' });
          return;
        }

        const reader = response.body.getReader();
        for await (const event of parseSSEStream(reader)) {
          if (controller.signal.aborted) break;
          dispatch({ type: 'SSE_EVENT', event });
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        dispatch({ type: 'DEBATE_ERROR', message: String(err) });
      }
    },
    [state.isStreaming, state.history],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'RESET_CURRENT' });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'RESET_CURRENT' });
  }, []);

  const clearAll = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'CLEAR_ALL' });
    persistedCountRef.current = 0;
    fetch('/api/history', { method: 'DELETE' }).catch(() => {/* silently ignore */});
  }, []);

  // Compute overall phase for each personality
  const personalityPhase = useCallback(
    (id: PersonalityId): 1 | 2 | 3 | null => {
      if (state.phase === 'phase1') {
        const idx = PERSONALITY_IDS.indexOf(id);
        const streaming = PERSONALITY_IDS.findIndex(
          (pid) =>
            state.currentOutputs[pid].status === 'thinking' ||
            state.currentOutputs[pid].status === 'streaming',
        );
        if (streaming === idx) return 1;
        return null;
      }
      return null;
    },
    [state.phase, state.currentOutputs],
  );

  return { state, submitQuery, abort, reset, clearAll, personalityPhase };
}
