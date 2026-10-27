import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { UserAvatar } from "@/components/UserAvatar";
import { requireAdmin } from "@/lib/auth/session";
import { moderateReview } from "@/lib/reviews/actions";
import { listReviewsForModeration } from "@/lib/reviews/repository";
import { when } from "../describe";

export const metadata: Metadata = { title: "Reviews" };

type Props = { searchParams: Promise<{ show?: string }> };

export default async function AdminReviewsPage({ searchParams }: Props) {
  await requireAdmin("/admin/reviews");
  const show = (await searchParams).show === "hidden" ? "hidden" : "all";
  const reviews = await listReviewsForModeration({ hidden: show === "hidden" ? true : undefined });

  return (
    <>
      <nav className="chips" aria-label="Show" style={{ marginBottom: 12 }}>
        <Link href="/admin/reviews" className={`chip${show === "all" ? " active" : ""}`}>
          Newest
        </Link>
        <Link href="/admin/reviews?show=hidden" className={`chip${show === "hidden" ? " active" : ""}`}>
          Hidden
        </Link>
      </nav>
      <p className="result-info">
        {reviews.length} review{reviews.length === 1 ? "" : "s"}
        {reviews.length === 100 ? " (showing the newest 100)" : ""}
      </p>
      {reviews.length ? (
        <ul className="draft-list">
          {reviews.map((r) => (
            <li key={`${r.userId}-${r.movieId}`} className={`mod-review${r.hidden ? " is-disabled" : ""}`}>
              <div className="mod-review-head">
                <UserAvatar name={r.authorName} avatarKey={r.avatarKey} size={28} />
                <span>
                  <strong>{r.authorName}</strong> <span className="faint">{r.authorEmail}</span>
                </span>
                <span className="faint">
                  on{" "}
                  <Link href={`/movies/${r.movieId}#reviews`} className="link">
                    {r.movieTitle}
                  </Link>{" "}
                  · {when(r.createdAt.toISOString())}
                </span>
                {r.spoilers ? <span className="badge">Spoilers</span> : null}
                {r.hidden ? <span className="badge status-rejected">Hidden</span> : null}
              </div>
              <p className="review-body">{r.body}</p>
              <form action={moderateReview}>
                <input type="hidden" name="userId" value={r.userId} />
                <input type="hidden" name="movieId" value={r.movieId} />
                <input type="hidden" name="hide" value={r.hidden ? "0" : "1"} />
                <SubmitButton className={`btn btn-sm${r.hidden ? "" : " btn-ghost danger"}`} pendingText="…">
                  {r.hidden ? "Show again" : "Hide"}
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{show === "hidden" ? "No hidden reviews." : "No reviews yet."}</p>
      )}
    </>
  );
}
