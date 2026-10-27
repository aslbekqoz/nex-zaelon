-- CineMind AI: stage 2 schema (people, cast and crew credits, filter indexes)

CREATE TABLE people (
  id                   BIGSERIAL PRIMARY KEY,
  tmdb_id              INTEGER UNIQUE,
  name                 TEXT NOT NULL,
  profile_url          TEXT,
  known_for_department TEXT,
  biography            TEXT,
  birthday             DATE,
  deathday             DATE,
  place_of_birth       TEXT,
  popularity           DOUBLE PRECISION NOT NULL DEFAULT 0,
  -- When the biography and filmography were last fetched from TMDB
  details_synced_at    TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX people_name_trgm ON people USING gin (name gin_trgm_ops);

-- role is the character (cast) or the job (crew); ord keeps TMDB's billing order
CREATE TABLE movie_credits (
  movie_id   BIGINT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  person_id  BIGINT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('cast', 'crew')),
  role       TEXT NOT NULL DEFAULT '',
  department TEXT,
  ord        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (movie_id, person_id, kind, role)
);
CREATE INDEX movie_credits_person_idx ON movie_credits (person_id);

CREATE INDEX movies_release_date_idx ON movies (release_date);
CREATE INDEX movies_language_idx ON movies (original_language);
CREATE INDEX movies_rating_idx ON movies (rating);

-- Re-fetch details once so existing TMDB movies get their cast and crew
UPDATE movies SET details_synced_at = NULL WHERE tmdb_id IS NOT NULL AND NOT sync_locked;
