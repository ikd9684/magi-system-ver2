import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { ConversationTurn, PersonalityId, PersonalityOutput } from '@/types/magi';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const db = new Database(path.join(DATA_DIR, 'magi.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS conversation_turns (
    id             TEXT    PRIMARY KEY,
    query          TEXT    NOT NULL,
    outputs        TEXT    NOT NULL,
    approved_count INTEGER NOT NULL,
    timestamp      INTEGER NOT NULL
  )
`);

interface DbRow {
  id: string;
  query: string;
  outputs: string;
  approved_count: number;
  timestamp: number;
}

function rowToTurn(row: DbRow): ConversationTurn {
  return {
    id: row.id,
    query: row.query,
    outputs: JSON.parse(row.outputs) as Record<PersonalityId, PersonalityOutput>,
    approvedCount: row.approved_count,
    timestamp: row.timestamp,
  };
}

export function getAllTurns(): ConversationTurn[] {
  const rows = db.prepare('SELECT * FROM conversation_turns ORDER BY timestamp ASC').all() as DbRow[];
  return rows.map(rowToTurn);
}

export function insertTurn(turn: ConversationTurn): void {
  db.prepare(`
    INSERT OR REPLACE INTO conversation_turns (id, query, outputs, approved_count, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(turn.id, turn.query, JSON.stringify(turn.outputs), turn.approvedCount, turn.timestamp);
}

export function deleteTurn(id: string): void {
  db.prepare('DELETE FROM conversation_turns WHERE id = ?').run(id);
}

export function clearAllTurns(): void {
  db.prepare('DELETE FROM conversation_turns').run();
}
