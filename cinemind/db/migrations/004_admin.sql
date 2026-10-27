-- CineMind AI: stage 5 schema (admin panel: account status, sign-in rate limiting, audit log,
-- protection of manual movie edits from TMDB refreshes)

ALTER TABLE users ADD COLUMN disabled_at TIMESTAMPTZ;

-- When true, TMDB sync never overwrites this movie (set when an admin edits it by hand)
ALTER TABLE movies ADD COLUMN sync_locked BOOLEAN NOT NULL DEFAULT false;

-- Sign-in and sign-up attempts, kept for a day, used for rate limiting
CREATE TABLE auth_attempts (
  id         BIGSERIAL PRIMARY KEY,
  kind       TEXT NOT NULL CHECK (kind IN ('login', 'register')),
  email      TEXT,
  ip         TEXT,
  success    BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX auth_attempts_email_idx ON auth_attempts (email, created_at DESC);
CREATE INDEX auth_attempts_ip_idx ON auth_attempts (ip, created_at DESC);

-- Who changed what. Details hold a small JSON summary, never passwords or tokens.
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  details     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);
CREATE INDEX audit_log_action_idx ON audit_log (action, created_at DESC);
