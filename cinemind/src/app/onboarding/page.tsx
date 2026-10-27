import type { Metadata } from "next";
import { OnboardingForm } from "@/components/OnboardingForm";
import { requireVerifiedUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { listGenres, listMovies } from "@/lib/movies/repository";
import { getPreferences } from "@/lib/preferences/repository";

export const metadata: Metadata = { title: "Your taste" };

export default async function OnboardingPage() {
  const user = await requireVerifiedUser("/onboarding");
  const [genres, movies, prefs, rated] = await Promise.all([
    listGenres(),
    listMovies({ sort: "popular", limit: 18 }),
    getPreferences(user.id),
    query<{ movie_id: number }>("SELECT movie_id FROM user_ratings WHERE user_id = $1", [user.id]),
  ]);

  return (
    <div className="container">
      <div className="page-head">
        <h1>{prefs.onboarded ? "Update your taste" : `Welcome, ${user.name}!`}</h1>
        <p className="muted">Tell CineMind what you enjoy and we&apos;ll tailor recommendations to you.</p>
      </div>
      <OnboardingForm
        genres={genres}
        movies={movies}
        selectedGenreIds={prefs.favoriteGenreIds}
        ratedMovieIds={rated.rows.map((r) => r.movie_id)}
      />
    </div>
  );
}
