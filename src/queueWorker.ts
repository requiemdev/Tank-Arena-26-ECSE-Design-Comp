import { mkdirSync } from 'node:fs';
import Database from 'better-sqlite3';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { MatchResult } from './types.js';

type TimerHandle = ReturnType<typeof setInterval>;

const DB_PATH = './data/local_queue.db';
const SYNC_INTERVAL_MS = 5000;
const SYNC_TIMEOUT_MS = 4000;

mkdirSync('./data', { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS pending_matches (
    id TEXT PRIMARY KEY,
    player1_name TEXT NOT NULL,
    player2_name TEXT NOT NULL,
    winner_name TEXT NOT NULL,
    player1_score INTEGER NOT NULL,
    player2_score INTEGER NOT NULL,
    game_duration_seconds INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )
`);

const pendingMatchColumns = db.pragma('table_info(pending_matches)') as Array<{ name: string }>;
if (!pendingMatchColumns.some((column) => column.name === 'game_duration_seconds')) {
  db.exec(`
    ALTER TABLE pending_matches
    ADD COLUMN game_duration_seconds INTEGER
  `);
}

const insertMatch = db.prepare<[
  string,
  string,
  string,
  string,
  number,
  number,
  number,
  string
]>(`
  INSERT INTO pending_matches (
    id,
    player1_name,
    player2_name,
    winner_name,
    player1_score,
    player2_score,
    game_duration_seconds,
    created_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const selectOldest = db.prepare<[], MatchResult>(`
  SELECT
    id,
    player1_name,
    player2_name,
    winner_name,
    player1_score,
    player2_score,
    game_duration_seconds,
    created_at
  FROM pending_matches
  WHERE winner_name <> 'draw'
    AND game_duration_seconds IS NOT NULL
  ORDER BY created_at ASC
  LIMIT 1
`);

const deleteMatch = db.prepare<[string]>('DELETE FROM pending_matches WHERE id = ?');

let workerInterval: TimerHandle | null = null;
let isSyncing = false;
let missingConfigWarned = false;

export function enqueueMatchResult(matchData: MatchResult): void {
  insertMatch.run(
    matchData.id,
    matchData.player1_name,
    matchData.player2_name,
    matchData.winner_name,
    matchData.player1_score,
    matchData.player2_score,
    matchData.game_duration_seconds,
    matchData.created_at
  );
}

export function startQueueWorker(): void {
  if (workerInterval) {
    return;
  }

  workerInterval = setInterval(() => {
    void syncOldestPendingMatch();
  }, SYNC_INTERVAL_MS);

  void syncOldestPendingMatch();
}

export function stopQueueWorker(): void {
  if (!workerInterval) {
    return;
  }

  clearInterval(workerInterval);
  workerInterval = null;
}

export async function syncOldestPendingMatch(): Promise<void> {
  if (isSyncing) {
    return;
  }

  const row = selectOldest.get();
  if (!row) {
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    if (!missingConfigWarned) {
      console.warn('Supabase credentials are missing; pending match results will remain in SQLite.');
      missingConfigWarned = true;
    }
    return;
  }

  isSyncing = true;
  try {
    await insertLeaderboardRow(supabase, row);
    deleteMatch.run(row.id);
  } catch (error) {
    // console.warn('Supabase sync failed; will retry pending match later:', error);
  } finally {
    isSyncing = false;
  }
}

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function insertLeaderboardRow(supabase: SupabaseClient, matchData: MatchResult): Promise<void> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), SYNC_TIMEOUT_MS);

  try {
    const { error } = await supabase
      .from('leaderboard')
      .insert({
        id: matchData.id,
        player1_name: matchData.player1_name,
        player2_name: matchData.player2_name,
        winner_name: matchData.winner_name,
        player1_score: matchData.player1_score,
        player2_score: matchData.player2_score,
        game_duration_seconds: matchData.game_duration_seconds,
        created_at: matchData.created_at
      })
      .abortSignal(abortController.signal);

    if (error) {
      throw error;
    }
  } finally {
    clearTimeout(timeout);
  }
}
