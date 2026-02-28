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
  sessionStartIndex: 0,
  isStreaming: false,
};

type Action =
  | { type: 'START_DEBATE'; query: string }
  | { type: 'SSE_EVENT'; event: SSEEvent }
  | { type: 'DEBATE_ERROR'; message: string }
  | { type: 'RESET_CURRENT' }
  | { type: 'CLEAR_ALL' }
  | { type: 'LOAD_HISTORY'; turns: ConversationTurn[] }
  | { type: 'DELETE_TURN'; id: string };

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
      return {
        ...initialState,
        history: state.history,
        sessionStartIndex: state.history.length,
      };

    case 'LOAD_HISTORY':
      return {
        ...state,
        history: action.turns,
        sessionStartIndex: action.turns.length,
      };

    case 'DELETE_TURN': {
      const idx = state.history.findIndex((t) => t.id === action.id);
      if (idx === -1) return state;
      const newHistory = state.history.filter((t) => t.id !== action.id);
      // sessionStartIndex を削除位置に合わせてずらす
      const newSessionStartIndex = idx < state.sessionStartIndex
        ? Math.max(0, state.sessionStartIndex - 1)
        : state.sessionStartIndex;
      return { ...state, history: newHistory, sessionStartIndex: newSessionStartIndex };
    }

    default:
      return state;
  }
}

export function useMAGI() {
  const [state, dispatch] = useReducer(magiReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  // DB に保存済みのターン ID を追跡
  const persistedIdsRef = useRef<Set<string>>(new Set());

  // Load persisted history on mount
  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((turns: ConversationTurn[]) => {
        persistedIdsRef.current = new Set(turns.map((t) => t.id));
        if (turns.length > 0) {
          dispatch({ type: 'LOAD_HISTORY', turns });
        }
      })
      .catch(() => {/* silently ignore */});
  }, []);

  // 未保存のターンを DB に永続化（fire-and-forget）
  useEffect(() => {
    const newTurns = state.history.filter((t) => !persistedIdsRef.current.has(t.id));
    if (newTurns.length === 0) return;
    for (const turn of newTurns) {
      persistedIdsRef.current.add(turn.id);
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
            history: state.history.slice(state.sessionStartIndex),
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
    [state.isStreaming, state.history, state.sessionStartIndex],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'RESET_CURRENT' });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'RESET_CURRENT' });
  }, []);

  const deleteTurn = useCallback((id: string) => {
    persistedIdsRef.current.delete(id);
    dispatch({ type: 'DELETE_TURN', id });
    fetch(`/api/history?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      .catch(() => {/* silently ignore */});
  }, []);

  const clearAll = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'CLEAR_ALL' });
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

  return { state, submitQuery, abort, reset, clearAll, deleteTurn, personalityPhase };
}
