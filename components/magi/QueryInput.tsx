'use client';

import { useState, useRef, useCallback } from 'react';

interface QueryInputProps {
  onSubmit: (query: string) => void;
  onAbort: () => void;
  isStreaming: boolean;
  placeholder?: string;
}

export function QueryInput({
  onSubmit,
  onAbort,
  isStreaming,
  placeholder = '問いを入力してください...',
}: QueryInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSubmit(trimmed);
    setValue('');
  }, [value, isStreaming, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && e.metaKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="w-full border border-gray-700 rounded-sm bg-black bg-opacity-40 focus-within:border-gray-500 transition-colors">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isStreaming}
        rows={3}
        className="w-full bg-transparent px-4 pt-3 pb-1 font-mono text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none disabled:opacity-50"
      />
      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        <span className="text-gray-600 text-xs font-mono">
          {isStreaming ? '[ PROCESSING... ]' : '⌘+Enter to submit, Enter for newline'}
        </span>
        <div className="flex gap-2">
          {isStreaming && (
            <button
              onClick={onAbort}
              className="px-4 py-1.5 text-xs font-mono border border-red-600 text-red-400 hover:bg-red-900 hover:bg-opacity-30 transition-colors"
            >
              ABORT
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isStreaming || !value.trim()}
            className="px-4 py-1.5 text-xs font-mono border border-gray-500 text-gray-300 hover:border-gray-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            SUBMIT
          </button>
        </div>
      </div>
    </div>
  );
}
