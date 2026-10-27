-- "Helpful" votes on reviews: one per voter per review, removed with the review or the voter.
CREATE TABLE review_votes (
  voter_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id  BIGINT NOT NULL,
  movie_id   BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (voter_id, author_id, movie_id),
  FOREIGN KEY (author_id, movie_id) REFERENCES movie_reviews (user_id, movie_id) ON DELETE CASCADE,
  -- Nobody can vote for their own review
  CHECK (voter_id <> author_id)
);
CREATE INDEX review_votes_review_idx ON review_votes (author_id, movie_id);
