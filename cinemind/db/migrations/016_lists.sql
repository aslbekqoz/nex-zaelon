-- User lists: named, ordered collections of movies ("Top 10 sci-fi"). Private by default; a
-- public list can be opened by anyone with the link and appears on the owner's profile.
CREATE TABLE user_lists (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_public   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_lists_user_idx ON user_lists (user_id, updated_at DESC);

CREATE TABLE list_items (
  list_id  BIGINT NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
  movie_id BIGINT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, movie_id)
);
CREATE INDEX list_items_order_idx ON list_items (list_id, position);
