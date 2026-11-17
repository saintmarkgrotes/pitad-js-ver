export const RECORDING_SCHEMA = `
CREATE TABLE IF NOT EXISTS local_runs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('recording', 'paused', 'finished')),
  started_at INTEGER NOT NULL,
  state_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS one_unfinished_run ON local_runs((1)) WHERE status != 'finished';
CREATE INDEX IF NOT EXISTS runs_by_user ON local_runs(user_id, started_at DESC);
CREATE TABLE IF NOT EXISTS local_points (
  run_id TEXT NOT NULL REFERENCES local_runs(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  point_json TEXT NOT NULL,
  PRIMARY KEY (run_id, seq),
  UNIQUE (run_id, timestamp)
);
PRAGMA user_version = 1;
`;
