'use client';

import { createContext, useContext } from 'react';
import { useMAGI } from '@/hooks/useMAGI';

type MAGIContextValue = ReturnType<typeof useMAGI>;

const MAGIContext = createContext<MAGIContextValue | null>(null);

export function MAGIProvider({ children }: { children: React.ReactNode }) {
  const magi = useMAGI();
  return <MAGIContext.Provider value={magi}>{children}</MAGIContext.Provider>;
}

export function useMAGIContext(): MAGIContextValue {
  const ctx = useContext(MAGIContext);
  if (!ctx) throw new Error('useMAGIContext must be used within MAGIProvider');
  return ctx;
}
