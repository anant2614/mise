-- User registry (PRD §8.2): email → userId lookup for webhooks and the agent address.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free'
);
