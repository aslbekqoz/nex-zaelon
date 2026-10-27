-- CineMind AI: profile pictures. Stored already processed (256x256 WebP, metadata stripped),
-- served at /avatars/<key> where the key is random and changes on every upload.

CREATE TABLE user_avatars (
  user_id      BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  key          TEXT NOT NULL UNIQUE,
  image        BYTEA NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/webp',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE auth_attempts DROP CONSTRAINT auth_attempts_kind_check;
ALTER TABLE auth_attempts ADD CONSTRAINT auth_attempts_kind_check
  CHECK (kind IN ('login', 'register', 'reset', 'verify', 'email_change', 'avatar'));
