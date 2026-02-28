'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MAGISettings, PersonalityId } from '@/types/magi';
import { DEFAULT_PERSONALITIES } from '@/lib/personalities';

const STORAGE_KEY = 'magi-settings';
const DEFAULT_MODEL = 'gpt-oss:20b';

function getDefaultSettings(): MAGISettings {
  return {
    model: DEFAULT_MODEL,
    personalities: {
      MELCHIOR: DEFAULT_PERSONALITIES.MELCHIOR.systemPrompt,
      BALTHASAR: DEFAULT_PERSONALITIES.BALTHASAR.systemPrompt,
      CASPER: DEFAULT_PERSONALITIES.CASPER.systemPrompt,
    },
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<MAGISettings>(getDefaultSettings);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<MAGISettings>;
        setSettings((prev) => ({
          model: parsed.model ?? prev.model,
          personalities: {
            ...prev.personalities,
            ...(parsed.personalities ?? {}),
          },
        }));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const saveSettings = useCallback((updates: Partial<MAGISettings>) => {
    setSettings((prev) => {
      const next: MAGISettings = {
        model: updates.model ?? prev.model,
        personalities: {
          ...prev.personalities,
          ...(updates.personalities ?? {}),
        },
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const updateModel = useCallback(
    (model: string) => saveSettings({ model }),
    [saveSettings],
  );

  const updatePersonality = useCallback(
    (id: PersonalityId, prompt: string) =>
      saveSettings({ personalities: { [id]: prompt } as Record<PersonalityId, string> }),
    [saveSettings],
  );

  const resetSettings = useCallback(() => {
    const defaults = getDefaultSettings();
    setSettings(defaults);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { settings, updateModel, updatePersonality, resetSettings };
}
