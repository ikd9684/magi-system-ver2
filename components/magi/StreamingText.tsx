'use client';

import { useEffect, useRef } from 'react';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
  className?: string;
}

export function StreamingText({ text, isStreaming, className = '' }: StreamingTextProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStreaming) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [text, isStreaming]);

  return (
    <div className={`relative ${className}`}>
      <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
        {text}
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-current ml-0.5 animate-pulse align-middle" />
        )}
      </pre>
      <div ref={endRef} />
    </div>
  );
}
