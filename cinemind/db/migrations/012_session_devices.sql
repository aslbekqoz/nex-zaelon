-- Signed-in devices: each session gets a public id (the token hash never leaves the server),
-- the browser's user agent and when it was last used.
ALTER TABLE sessions ADD COLUMN id BIGSERIAL UNIQUE;
ALTER TABLE sessions ADD COLUMN user_agent TEXT;
ALTER TABLE sessions ADD COLUMN last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();
UPDATE sessions SET last_seen_at = created_at;
