-- CineMind AI: stage 3 schema (ratings, taste preferences, onboarding)

ALTER TABLE users ADD COLUMN onboarded_at TIMESTAMPTZ;

CREATE TABLE user_ratings (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id   BIGINT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 10),
  rated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, movie_id)
);
CREATE INDEX user_ratings_movie_idx ON user_ratings(movie_id);

CREATE TABLE user_favorite_genres (
  user_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, genre_id)
);
