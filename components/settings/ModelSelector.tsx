'use client';

interface ModelSelectorProps {
  model: string;
  onChange: (model: string) => void;
}

const SUGGESTED_MODELS = [
  'gpt-oss:20b',
  'llama3.1:8b',
  'llama3.1:70b',
  'qwen2.5:14b',
  'gemma2:9b',
  'mistral:7b',
];

export function ModelSelector({ model, onChange }: ModelSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-mono text-gray-400 tracking-widest block">
        OLLAMA MODEL NAME
      </label>
      <input
        type="text"
        value={model}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. gpt-oss:20b"
        className="w-full bg-black bg-opacity-40 border border-gray-700 px-4 py-2 font-mono text-sm text-gray-200 focus:outline-none focus:border-gray-500 transition-colors"
      />
      <div className="space-y-1">
        <div className="text-xs font-mono text-gray-600 tracking-widest">SUGGESTIONS:</div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_MODELS.map((m) => (
            <button
              key={m}
              onClick={() => onChange(m)}
              className={`text-xs font-mono border px-2 py-1 transition-colors ${
                model === m
                  ? 'border-gray-400 text-gray-200'
                  : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-600 font-mono">
        Ollama must be running at http://localhost:11434
      </p>
    </div>
  );
}
