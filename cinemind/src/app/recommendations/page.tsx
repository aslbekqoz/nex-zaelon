import type { Metadata } from "next";
import Link from "next/link";
import { MovieGrid } from "@/components/MovieCard";
import { getCurrentUser } from "@/lib/auth/session";
import { getPreferences } from "@/lib/preferences/repository";
import { findMood, MOODS } from "@/lib/recommend/moods";
import { getRecommendations } from "@/lib/recommend/service";

export const metadata: Metadata = { title: "For you" };

type Props = { searchParams: Promise<{ mood?: string }> };

export default async function RecommendationsPage({ searchParams }: Props) {
  const mood = findMood((await searchParams).mood);
  const user = await getCurrentUser();
  const [prefs, { items, personalised }] = await Promise.all([
    user ? getPreferences(user.id) : Promise.resolve(null),
    getRecommendations({ userId: user?.id ?? null, mood, limit: 24 }),
  ]);
  const notes = new Map(items.map((i) => [i.movie.id, i.reasons]));

  const heading = mood
    ? `${mood.emoji} ${mood.label}`
    : personalised
      ? `Picked for you${user ? `, ${user.name}` : ""}`
      : "Popular picks";
  const sub = mood
    ? `${mood.description}${personalised ? ", tuned to your taste." : "."}`
    : personalised
      ? "Based on your favourite genres, ratings and watchlist."
      : "Rate a few movies or tell us your favourite genres for personal picks.";

  return (
    <div className="container">
      <div className="page-head">
        <h1>{heading}</h1>
        <p className="muted">{sub}</p>
      </div>

      <nav className="mood-chips" aria-label="Moods">
        <Link href="/recommendations" className={`chip${!mood ? " active" : ""}`}>
          ✨ For you
        </Link>
        {MOODS.map((m) => (
          <Link
            key={m.slug}
            href={`/recommendations?mood=${m.slug}`}
            className={`chip${mood?.slug === m.slug ? " active" : ""}`}
            title={m.description}
          >
            {m.emoji} {m.label}
          </Link>
        ))}
      </nav>

      {!user ? (
        <div className="banner">
          <div>
            <strong>Get recommendations that know your taste</strong>
            <span>Create a free account, pick your favourite genres and rate what you&apos;ve seen.</span>
          </div>
          <Link href="/register" className="btn btn-primary">
            Sign up
          </Link>
        </div>
      ) : !prefs?.onboarded ? (
        <div className="banner">
          <div>
            <strong>Tell us what you like</strong>
            <span>Pick a few genres and movies — it takes 30 seconds.</span>
          </div>
          <Link href="/onboarding" className="btn btn-primary">
            Set my taste
          </Link>
        </div>
      ) : null}

      {items.length ? (
        <MovieGrid movies={items.map((i) => i.movie)} notes={notes} />
      ) : (
        <div className="empty">
          <h2>Nothing to recommend yet</h2>
          <p>
            {mood?.maxRuntime
              ? "No movies with a known runtime fit this mood yet."
              : "You’ve rated or saved everything in the catalogue. Search for more movies to grow it."}
          </p>
          <Link href="/search" className="btn" style={{ marginTop: 12 }}>
            Browse movies
          </Link>
        </div>
      )}

      {user && prefs?.onboarded ? (
        <p className="faint" style={{ marginTop: 28, fontSize: 14 }}>
          Recommendations improve as you rate movies. <Link href="/onboarding" className="muted">Edit favourite genres</Link>
        </p>
      ) : null}
    </div>
  );
}
