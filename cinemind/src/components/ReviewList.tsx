import Link from "next/link";
import type { LatestReview, Review } from "@/lib/reviews/repository";
import { voteHelpful } from "@/lib/reviews/actions";
import { reviewExcerpt } from "@/lib/reviews/rules";
import { SubmitButton } from "./SubmitButton";
import { UserAvatar } from "./UserAvatar";

function day(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

type VoteProps = { canVote: boolean; voted: boolean };

export function ReviewCard({
  review,
  own = false,
  linkAuthor = true,
  vote,
}: {
  review: Review;
  own?: boolean;
  linkAuthor?: boolean;
  /** Shows the "helpful" count, and the vote button when the viewer may vote. */
  vote?: VoteProps;
}) {
  const edited = review.updatedAt.getTime() - review.createdAt.getTime() > 60_000;
  return (
    <article className={`review${review.hidden ? " is-hidden" : ""}`}>
      <header className="review-head">
        <UserAvatar name={review.authorName} avatarKey={review.avatarKey} size={36} />
        <div className="review-meta">
          <strong>
            {own ? (
              "Your review"
            ) : linkAuthor ? (
              <Link href={`/users/${review.userId}`} className="review-author">
                {review.authorName}
              </Link>
            ) : (
              review.authorName
            )}
          </strong>
          <span className="faint">
            {day(review.createdAt)}
            {edited ? " · edited" : ""}
          </span>
        </div>
        {review.rating ? <span className="review-rating" title="Their rating">★ {review.rating}/10</span> : null}
      </header>
      {review.hidden ? (
        <p className="review-note">Hidden by a moderator: only you can see this review.</p>
      ) : null}
      {review.spoilers ? (
        <details className="review-spoiler">
          <summary>Contains spoilers — show review</summary>
          <p className="review-body">{review.body}</p>
        </details>
      ) : (
        <p className="review-body">{review.body}</p>
      )}
      {vote ? (
        <footer className="review-foot">
          {vote.canVote ? (
            <form action={voteHelpful}>
              <input type="hidden" name="authorId" value={review.userId} />
              <input type="hidden" name="movieId" value={review.movieId} />
              <input type="hidden" name="helpful" value={vote.voted ? "0" : "1"} />
              <SubmitButton className={`btn btn-sm${vote.voted ? " is-on" : " btn-ghost"}`} pendingText="…">
                <span aria-hidden="true">👍</span> {vote.voted ? "You found this helpful" : "Helpful"}
              </SubmitButton>
            </form>
          ) : null}
          {review.helpful ? (
            <span className="faint">
              {review.helpful} {review.helpful === 1 ? "person" : "people"} found this helpful
            </span>
          ) : null}
        </footer>
      ) : own && review.helpful ? (
        <footer className="review-foot">
          <span className="faint">
            {review.helpful} {review.helpful === 1 ? "person" : "people"} found this helpful
          </span>
        </footer>
      ) : null}
    </article>
  );
}

export function LatestReviews({ reviews }: { reviews: LatestReview[] }) {
  if (!reviews.length) return null;
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>Latest reviews</h2>
        </div>
        <div className="review-teasers">
          {reviews.map((r) => (
            <Link key={`${r.userId}-${r.movieId}`} href={`/movies/${r.movieId}#reviews`} className="review review-teaser">
              <header className="review-head">
                <UserAvatar name={r.authorName} avatarKey={r.avatarKey} size={32} />
                <div className="review-meta">
                  <strong>{r.movieTitle}</strong>
                  <span className="faint">{r.authorName}</span>
                </div>
                {r.rating ? <span className="review-rating">★ {r.rating}/10</span> : null}
              </header>
              <p className="review-body">{reviewExcerpt(r.body)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
