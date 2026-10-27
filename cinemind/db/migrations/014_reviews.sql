-- Movie reviews: one per user per movie. Admins can hide a review; hidden reviews stay visible
-- to their author (marked as hidden) so they know why it isn't public.
CREATE TABLE movie_reviews (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id   BIGINT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  spoilers   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hidden_at  TIMESTAMPTZ,
  hidden_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, movie_id)
);
CREATE INDEX movie_reviews_movie_idx ON movie_reviews (movie_id, created_at DESC);
CREATE INDEX movie_reviews_recent_idx ON movie_reviews (created_at DESC);

ALTER TABLE auth_attempts DROP CONSTRAINT auth_attempts_kind_check;
ALTER TABLE auth_attempts ADD CONSTRAINT auth_attempts_kind_check
  CHECK (kind IN ('login', 'register', 'reset', 'verify', 'email_change', 'avatar', 'review'));
