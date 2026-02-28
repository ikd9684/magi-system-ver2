'use client';

import { useState } from 'react';
import type { PersonalityId } from '@/types/magi';
import { DEFAULT_PERSONALITIES, PERSONALITY_IDS } from '@/lib/personalities';

interface PersonalityEditorProps {
  personalities: Record<PersonalityId, string>;
  onChange: (id: PersonalityId, prompt: string) => void;
}

export function PersonalityEditor({ personalities, onChange }: PersonalityEditorProps) {
  const [activeTab, setActiveTab] = useState<PersonalityId>('MELCHIOR');

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {PERSONALITY_IDS.map((id) => {
          const config = DEFAULT_PERSONALITIES[id as PersonalityId];
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id as PersonalityId)}
              className={`px-4 py-2 text-xs font-mono border transition-colors ${
                activeTab === id
                  ? `${config.borderColor} ${config.color} bg-black bg-opacity-40`
                  : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
              }`}
            >
              {config.name}
            </button>
          );
        })}
      </div>

      {PERSONALITY_IDS.map((id) => {
        const config = DEFAULT_PERSONALITIES[id as PersonalityId];
        if (activeTab !== id) return null;
        return (
          <div key={id} className="space-y-2">
            <div className={`text-xs font-mono ${config.color} tracking-widest`}>
              {config.name} — {config.subtitle}
            </div>
            <textarea
              value={personalities[id as PersonalityId]}
              onChange={(e) => onChange(id as PersonalityId, e.target.value)}
              rows={10}
              className={`w-full bg-black bg-opacity-40 border ${config.borderColor} border-opacity-40 px-4 py-3 font-mono text-sm text-gray-200 resize-y focus:outline-none focus:border-opacity-100 transition-colors`}
              placeholder="システムプロンプトを入力..."
            />
          </div>
        );
      })}
    </div>
  );
}
