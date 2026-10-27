import "server-only";
import { listGenres, listMoviesByIds } from "@/lib/movies/repository";
import type { Movie } from "@/lib/movies/types";
import { buildProfile, recommend } from "./engine";
import type { Mood } from "./moods";
import { loadCandidates, loadSignals } from "./repository";

export type RecommendedMovie = { movie: Movie; reasons: string[] };

export async function getRecommendations(opts: { userId: number | null; mood?: Mood; limit?: number }) {
  const [candidates, signals, genres] = await Promise.all([
    loadCandidates(),
    opts.userId ? loadSignals(opts.userId) : Promise.resolve({ favoriteGenreIds: [], ratings: [], watchlist: [] }),
    listGenres(),
  ]);
  const profile = buildProfile(signals);
  const recs = recommend(candidates, profile, {
    mood: opts.mood,
    limit: opts.limit,
    genreNames: new Map(genres.map((g) => [g.id, g.name])),
  });

  const movies = await listMoviesByIds(recs.map((r) => r.movieId));
  const byId = new Map(movies.map((m) => [m.id, m]));
  const items: RecommendedMovie[] = recs.flatMap((r) => {
    const movie = byId.get(r.movieId);
    return movie ? [{ movie, reasons: r.reasons }] : [];
  });
  return { items, personalised: profile.strength > 0 };
}
