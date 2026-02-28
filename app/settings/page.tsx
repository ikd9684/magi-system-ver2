'use client';

import Link from 'next/link';
import { useSettings } from '@/hooks/useSettings';
import { PersonalityEditor } from '@/components/settings/PersonalityEditor';
import { ModelSelector } from '@/components/settings/ModelSelector';

export default function SettingsPage() {
  const { settings, updateModel, updatePersonality, resetSettings } = useSettings();

  return (
    <main className="min-h-screen max-w-4xl mx-auto px-6 py-8">
      <div className="border-b border-gray-800 pb-4 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-[0.2em] text-white">
            MAGI:SETTINGS
          </h1>
          <div className="text-gray-600 text-xs font-mono tracking-widest mt-1">
            SYSTEM CONFIGURATION
          </div>
        </div>
        <Link
          href="/"
          className="text-xs font-mono border border-gray-700 px-3 py-1.5 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors"
        >
          ← BACK
        </Link>
      </div>

      <div className="space-y-10">
        {/* Model selection */}
        <section>
          <div className="text-xs font-mono text-gray-500 tracking-widest mb-4">
            ── LLM MODEL ──
          </div>
          <ModelSelector model={settings.model} onChange={updateModel} />
        </section>

        {/* Personality prompts */}
        <section>
          <div className="text-xs font-mono text-gray-500 tracking-widest mb-4">
            ── PERSONALITY PROMPTS ──
          </div>
          <PersonalityEditor
            personalities={settings.personalities}
            onChange={updatePersonality}
          />
        </section>

        {/* Reset */}
        <section>
          <div className="text-xs font-mono text-gray-500 tracking-widest mb-4">
            ── RESET ──
          </div>
          <button
            onClick={resetSettings}
            className="text-xs font-mono border border-red-800 text-red-500 px-4 py-2 hover:bg-red-950 hover:bg-opacity-30 transition-colors"
          >
            RESET TO DEFAULTS
          </button>
          <p className="text-xs text-gray-600 font-mono mt-2">
            すべての設定をデフォルトに戻します（localStorage が削除されます）
          </p>
        </section>
      </div>
    </main>
  );
}
