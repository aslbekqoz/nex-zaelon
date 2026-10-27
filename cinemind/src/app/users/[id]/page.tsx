import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewCard } from "@/components/ReviewList";
import { UserAvatar } from "@/components/UserAvatar";
import { posterImage } from "@/lib/movies/images";
import { getReviewerProfile, listUserReviews } from "@/lib/reviews/repository";

type Props = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const profile = id ? await getReviewerProfile(id) : null;
  // Members' pages stay out of search engines; their reviews are indexed on the movie pages
  return { title: profile ? `${profile.name}'s reviews` : "Not found", robots: { index: false, follow: true } };
}

export default async function ReviewerPage({ params }: Props) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const [profile, reviews] = await Promise.all([getReviewerProfile(id), listUserReviews(id)]);
  if (!profile) notFound();
  const rated = reviews.filter((r) => r.rating);
  const average = rated.length ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length : null;

  return (
    <div className="container reviews">
      <div className="page-head reviewer-head">
        <UserAvatar name={profile.name} avatarKey={profile.avatarKey} size={72} />
        <div>
          <h1>{profile.name}</h1>
          <p className="muted">
            {profile.reviews} review{profile.reviews === 1 ? "" : "s"}
            {average !== null ? ` · average rating ${average.toFixed(1)}/10` : ""} · member since{" "}
            {profile.joinedAt.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
      <div className="review-list">
        {reviews.map((r) => {
          const poster = r.posterUrl ? posterImage(r.posterUrl) : null;
          return (
            <div key={r.movieId} className="profile-review">
              <Link href={`/movies/${r.movieId}#reviews`} className="profile-review-movie">
                <span className="profile-review-poster" aria-hidden="true">
                  {poster ? <img src={poster.src} alt="" loading="lazy" /> : null}
                </span>
                <span>
                  <strong>{r.movieTitle}</strong>
                  {r.movieYear ? <span className="faint"> ({r.movieYear})</span> : null}
                </span>
              </Link>
              <ReviewCard review={r} linkAuthor={false} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
