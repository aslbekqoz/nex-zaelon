-- CineMind AI: stage 1 schema (users, sessions, movies, genres, watchlists)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only the SHA-256 hash of the session token is stored, never the token itself
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

-- Genre ids match TMDB's, so imports need no mapping
CREATE TABLE genres (
  id      INTEGER PRIMARY KEY,
  slug    TEXT NOT NULL UNIQUE,
  name_uz TEXT NOT NULL,
  name_en TEXT NOT NULL
);

CREATE TABLE movies (
  id                BIGSERIAL PRIMARY KEY,
  tmdb_id           INTEGER UNIQUE,
  title             TEXT NOT NULL,
  title_uz          TEXT,
  original_title    TEXT,
  overview          TEXT,
  overview_uz       TEXT,
  director          TEXT,
  release_date      DATE,
  runtime           INTEGER,
  rating            NUMERIC(3,1),
  vote_count        INTEGER,
  popularity        DOUBLE PRECISION NOT NULL DEFAULT 0,
  original_language TEXT,
  poster_url        TEXT,
  backdrop_url      TEXT,
  trailer_youtube_key TEXT,
  -- 'seed' | 'tmdb' | 'manual'
  source            TEXT NOT NULL DEFAULT 'manual',
  -- When full details (runtime, trailer) were last fetched from TMDB
  details_synced_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX movies_title_trgm ON movies USING gin (title gin_trgm_ops);
CREATE INDEX movies_title_uz_trgm ON movies USING gin (title_uz gin_trgm_ops);
CREATE INDEX movies_original_title_trgm ON movies USING gin (original_title gin_trgm_ops);
CREATE INDEX movies_popularity_idx ON movies (popularity DESC);

CREATE TABLE movie_genres (
  movie_id BIGINT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, genre_id)
);
CREATE INDEX movie_genres_genre_idx ON movie_genres(genre_id);

CREATE TABLE watchlist_items (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id   BIGINT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  watched    BOOLEAN NOT NULL DEFAULT false,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, movie_id)
);
