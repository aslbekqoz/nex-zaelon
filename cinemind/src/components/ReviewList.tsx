import type { Review } from "@/lib/reviews/repository";
import { UserAvatar } from "./UserAvatar";

function day(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ReviewCard({ review, own = false }: { review: Review; own?: boolean }) {
  const edited = review.updatedAt.getTime() - review.createdAt.getTime() > 60_000;
  return (
    <article className={`review${review.hidden ? " is-hidden" : ""}`}>
      <header className="review-head">
        <UserAvatar name={review.authorName} avatarKey={review.avatarKey} size={36} />
        <div className="review-meta">
          <strong>{own ? "Your review" : review.authorName}</strong>
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
    </article>
  );
}
