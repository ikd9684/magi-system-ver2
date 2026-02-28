import { NextResponse } from 'next/server';
import { getAllTurns, insertTurn, clearAllTurns } from '@/lib/db';
import type { ConversationTurn } from '@/types/magi';

export const runtime = 'nodejs';

export function GET() {
  const turns = getAllTurns();
  return NextResponse.json(turns);
}

export async function POST(req: Request) {
  const turn = (await req.json()) as ConversationTurn;
  insertTurn(turn);
  return NextResponse.json({ ok: true });
}

export function DELETE() {
  clearAllTurns();
  return NextResponse.json({ ok: true });
}
