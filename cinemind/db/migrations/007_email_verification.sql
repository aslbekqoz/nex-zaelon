-- CineMind AI: email address verification. Only the SHA-256 hash of a token is stored.

ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;

CREATE TABLE email_verifications (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- The address the link was sent to; the link only verifies that exact address
  email      TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX email_verifications_user_idx ON email_verifications (user_id);

-- "Resend confirmation email" is rate limited alongside the other auth actions
ALTER TABLE auth_attempts DROP CONSTRAINT auth_attempts_kind_check;
ALTER TABLE auth_attempts ADD CONSTRAINT auth_attempts_kind_check CHECK (kind IN ('login', 'register', 'reset', 'verify'));
