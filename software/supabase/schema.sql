CREATE TABLE IF NOT EXISTS public.leaderboard (
  id UUID PRIMARY KEY,
  player1_name TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  winner_name TEXT NOT NULL,
  player1_score INTEGER NOT NULL,
  player2_score INTEGER NOT NULL,
  game_duration_seconds INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrade leaderboard tables created before game duration was recorded.
ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS game_duration_seconds INTEGER;

CREATE INDEX IF NOT EXISTS leaderboard_fastest_games_idx
  ON public.leaderboard (game_duration_seconds ASC)
  WHERE winner_name <> 'draw' AND game_duration_seconds IS NOT NULL;

-- The server reads and syncs results with the service-role key. RLS bypass does
-- not replace PostgreSQL table privileges, so these grants are still required.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT ON TABLE public.leaderboard TO service_role;
