import { NextRequest } from 'next/server';
import type { DebateRequest } from '@/types/magi';
import { encodeSSE } from '@/lib/sse-utils';
import { runDebate } from '@/lib/magi-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: DebateRequest;
  try {
    body = await request.json() as DebateRequest;
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  const { query, history, settings } = body;
  if (!query?.trim()) {
    return new Response('Query is required', { status: 400 });
  }

  const abortController = new AbortController();
  request.signal.addEventListener('abort', () => abortController.abort());

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await runDebate(query, history ?? [], settings, controller, abortController.signal);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(encoder.encode(encodeSSE({ type: 'error', message })));
      } finally {
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
