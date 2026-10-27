-- CineMind AI: changing the account email. The address only changes after the new one is
-- confirmed; only the SHA-256 hash of each token is stored.

CREATE TABLE email_changes (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_email  TEXT NOT NULL,
  new_email  TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  -- set when the user cancels or a newer request replaces this one
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX email_changes_user_idx ON email_changes (user_id);

ALTER TABLE auth_attempts DROP CONSTRAINT auth_attempts_kind_check;
ALTER TABLE auth_attempts ADD CONSTRAINT auth_attempts_kind_check
  CHECK (kind IN ('login', 'register', 'reset', 'verify', 'email_change'));
