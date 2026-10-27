-- CineMind AI: password reset tokens. Only the SHA-256 hash of a token is stored.

CREATE TABLE password_resets (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  -- 'email' (requested by the user) or 'admin' (link created by an admin)
  created_via  TEXT NOT NULL DEFAULT 'email' CHECK (created_via IN ('email', 'admin')),
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX password_resets_user_idx ON password_resets (user_id);

-- Reset requests are rate limited alongside sign-ins and sign-ups
ALTER TABLE auth_attempts DROP CONSTRAINT auth_attempts_kind_check;
ALTER TABLE auth_attempts ADD CONSTRAINT auth_attempts_kind_check CHECK (kind IN ('login', 'register', 'reset'));
