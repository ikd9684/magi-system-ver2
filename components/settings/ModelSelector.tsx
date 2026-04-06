'use client';

import { useState, useEffect, useCallback } from 'react';

interface ModelSelectorProps {
  model: string;
  onChange: (model: string) => void;
}

export function ModelSelector({ model, onChange }: ModelSelectorProps) {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ollama-models');
      const data = await res.json() as { models: string[]; error?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error ?? 'Failed to fetch models');
      }
      setModels(data.models);
      return data.models;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels().then((fetchedModels) => {
      if (fetchedModels.length > 0 && !fetchedModels.includes(model)) {
        onChange(fetchedModels[0]);
      }
    });
  }, [fetchModels, model, onChange]);

  return (
    <div className="space-y-3">
      <label className="text-xs font-mono text-gray-400 tracking-widest block">
        OLLAMA MODEL NAME
      </label>
      <div className="flex gap-2">
        <select
          value={loading || !!error ? '' : model}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading || !!error}
          className="flex-1 bg-black bg-opacity-40 border border-gray-700 px-4 py-2 font-mono text-sm text-gray-200 focus:outline-none focus:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && <option value="">Loading...</option>}
          {error && <option value="">Failed to load models</option>}
          {!loading && !error && models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button
          onClick={fetchModels}
          disabled={loading}
          className="bg-black bg-opacity-40 border border-gray-700 px-3 py-2 font-mono text-xs text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh model list"
        >
          ↻
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500 font-mono">{error}</p>
      )}
      <p className="text-xs text-gray-600 font-mono">
        Ollama must be running at http://localhost:11434
      </p>
    </div>
  );
}
