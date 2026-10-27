// Content-based recommendation engine. Pure functions with no I/O, so it can be unit
// tested with `node --test` and reused later (e.g. by Content Studio's weekly picks).
//
// 1. buildProfile() turns a user's signals (favourite genres, ratings, watchlist) into
//    genre and director affinities plus a preferred era.
// 2. recommend() scores every candidate on genre match, director, era, quality and
//    popularity (blended with a mood when one is chosen), re-ranks for variety and
//    explains each pick.

import type { Mood } from "./moods";

export type CandidateMovie = {
  id: number;
  title: string;
  genreIds: number[];
  director: string | null;
  year: number | null;
  rating: number | null;
  voteCount: number | null;
  popularity: number;
  runtime: number | null;
};

export type RatedSignal = { movie: CandidateMovie; rating: number };
export type WatchlistSignal = { movie: CandidateMovie; watched: boolean };

export type Signals = {
  favoriteGenreIds: number[];
  ratings: RatedSignal[];
  watchlist: WatchlistSignal[];
};

type DirectorAffinity = { weight: number; title: string; rating: number | null };

export type Profile = {
  genreWeights: Map<number, number>;
  directors: Map<string, DirectorAffinity>;
  yearCenter: number | null;
  /** Number of signals behind the profile; 0 means a cold start. */
  strength: number;
  excluded: Set<number>;
};

export type Recommendation = { movieId: number; score: number; reasons: string[] };

const WEIGHTS = {
  personal: { genre: 0.5, director: 0.15, era: 0.08, quality: 0.17, popularity: 0.1 },
  moodWithProfile: { mood: 0.55, personal: 0.3, quality: 0.15 },
  moodColdStart: { mood: 0.65, quality: 0.2, popularity: 0.15 },
  coldStart: { quality: 0.5, popularity: 0.5 },
};

/** A rating of 1–10 as a signed preference: 10 → +1, 5.5 → 0, 1 → -1. */
export function ratingToSignal(rating: number) {
  return (rating - 5.5) / 4.5;
}

export function splitDirectors(director: string | null) {
  return director ? director.split(",").map((d) => d.trim()).filter(Boolean) : [];
}

export function buildProfile(signals: Signals): Profile {
  const genre = new Map<number, number>();
  const add = (id: number, w: number) => genre.set(id, (genre.get(id) ?? 0) + w);
  const directors = new Map<string, DirectorAffinity>();
  const addDirector = (name: string, w: number, title: string, rating: number | null) => {
    const prev = directors.get(name);
    // Keep the strongest liked film as the one we cite in explanations
    const cite = !prev || (rating ?? 7) > (prev.rating ?? 7) ? { title, rating } : { title: prev.title, rating: prev.rating };
    directors.set(name, { weight: (prev?.weight ?? 0) + w, ...cite });
  };
  let yearSum = 0;
  let yearWeight = 0;
  const excluded = new Set<number>();

  for (const id of signals.favoriteGenreIds) add(id, 1);

  for (const { movie, rating } of signals.ratings) {
    excluded.add(movie.id);
    const s = ratingToSignal(rating);
    for (const g of movie.genreIds) add(g, s);
    for (const d of splitDirectors(movie.director)) addDirector(d, s, movie.title, rating);
    if (rating >= 7 && movie.year) {
      yearSum += movie.year * s;
      yearWeight += s;
    }
  }

  for (const { movie, watched } of signals.watchlist) {
    excluded.add(movie.id);
    // Ratings already cover rated films; the watchlist only adds a mild positive signal
    if (signals.ratings.some((r) => r.movie.id === movie.id)) continue;
    const s = watched ? 0.5 : 0.4;
    for (const g of movie.genreIds) add(g, s);
    for (const d of splitDirectors(movie.director)) addDirector(d, s * 0.6, movie.title, null);
    if (movie.year) {
      yearSum += movie.year * s;
      yearWeight += s;
    }
  }

  // Normalise genre weights into [-1, 1]
  const max = Math.max(0, ...[...genre.values()].map(Math.abs));
  if (max > 0) for (const [id, w] of genre) genre.set(id, w / max);

  return {
    genreWeights: genre,
    directors,
    yearCenter: yearWeight > 0 ? yearSum / yearWeight : null,
    strength: signals.favoriteGenreIds.length + signals.ratings.length + signals.watchlist.length,
    excluded,
  };
}

/** How well a movie's genres match a weight map, in [0, 1] (0.5 = neutral). */
export function genreMatch(genreIds: number[], weights: Map<number, number> | Record<number, number>) {
  if (!genreIds.length) return 0.5;
  const get = (g: number) => (weights instanceof Map ? weights.get(g) : weights[g]) ?? 0;
  const values = genreIds.map(get);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const best = Math.max(...values);
  const raw = 0.6 * best + 0.4 * mean;
  return Math.min(1, Math.max(0, (raw + 1) / 2));
}

/** Rating quality in [0, 1], shrunk towards neutral when there are few votes. */
export function quality(m: CandidateMovie) {
  if (m.rating === null) return 0.5;
  const q = Math.min(1, Math.max(0, (m.rating - 5) / 4));
  const confidence = Math.min(1, (m.voteCount ?? 0) / 200);
  return 0.5 + (q - 0.5) * confidence;
}

function eraMatch(year: number | null, center: number | null) {
  if (year === null || center === null) return 0.5;
  return Math.exp(-Math.abs(year - center) / 15);
}

function directorMatch(m: CandidateMovie, profile: Profile) {
  let best: { name: string; aff: DirectorAffinity } | null = null;
  for (const name of splitDirectors(m.director)) {
    const aff = profile.directors.get(name);
    if (aff && (!best || aff.weight > best.aff.weight)) best = { name, aff };
  }
  if (!best) return { score: 0.5, best: null };
  return { score: Math.min(1, Math.max(0, 0.5 + best.aff.weight / 2)), best };
}

function listNames(names: string[]) {
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
}

type Options = {
  mood?: Mood;
  limit?: number;
  genreNames: Map<number, string>;
};

export function recommend(candidates: CandidateMovie[], profile: Profile, opts: Options): Recommendation[] {
  const limit = opts.limit ?? 24;
  const pool = candidates.filter(
    (m) =>
      !profile.excluded.has(m.id) &&
      (!opts.mood?.maxRuntime || (m.runtime !== null && m.runtime <= opts.mood.maxRuntime)),
  );

  // Popularity as a percentile, so TMDB and seed popularity scales don't matter
  const byPopularity = [...pool].sort((a, b) => a.popularity - b.popularity);
  const popRank = new Map(byPopularity.map((m, i) => [m.id, pool.length > 1 ? i / (pool.length - 1) : 1]));
  const personalised = profile.strength > 0;

  const scored = pool.map((m) => {
    const q = quality(m);
    const pop = popRank.get(m.id) ?? 0.5;
    const g = genreMatch(m.genreIds, profile.genreWeights);
    const dir = directorMatch(m, profile);
    const era = eraMatch(m.year, profile.yearCenter);
    const P = WEIGHTS.personal;
    const personal = P.genre * g + P.director * dir.score + P.era * era + P.quality * q + P.popularity * pop;

    let score: number;
    let moodFit = 0.5;
    if (opts.mood) {
      moodFit = Object.keys(opts.mood.genres).length ? genreMatch(m.genreIds, opts.mood.genres) : 0.5 + 0.5 * q;
      score = personalised
        ? WEIGHTS.moodWithProfile.mood * moodFit + WEIGHTS.moodWithProfile.personal * personal + WEIGHTS.moodWithProfile.quality * q
        : WEIGHTS.moodColdStart.mood * moodFit + WEIGHTS.moodColdStart.quality * q + WEIGHTS.moodColdStart.popularity * pop;
    } else {
      score = personalised ? personal : WEIGHTS.coldStart.quality * q + WEIGHTS.coldStart.popularity * pop;
    }

    // Explanations, most specific first
    const reasons: string[] = [];
    if (personalised && dir.best && dir.best.aff.weight > 0.3) {
      const { name, aff } = dir.best;
      reasons.push(
        aff.rating !== null
          ? `From ${name}, director of ${aff.title} (you rated it ${aff.rating}/10)`
          : `From ${name}, director of ${aff.title} on your watchlist`,
      );
    }
    if (opts.mood && moodFit >= 0.6) reasons.push(`Fits your mood: ${opts.mood.label}`);
    if (personalised) {
      const liked = m.genreIds
        .map((id) => ({ id, w: profile.genreWeights.get(id) ?? 0 }))
        .filter((x) => x.w >= 0.35)
        .sort((a, b) => b.w - a.w)
        .slice(0, 2)
        .map((x) => opts.genreNames.get(x.id))
        .filter((n): n is string => Boolean(n));
      if (liked.length) reasons.push(`Because you like ${listNames(liked)}`);
    }
    if (m.rating !== null && m.rating >= 8 && (m.voteCount ?? 0) >= 100) reasons.push(`Highly rated: ★ ${m.rating.toFixed(1)}`);
    if (!reasons.length) reasons.push(pop >= 0.7 ? "Popular on CineMind" : "A well-matched pick");

    return { movie: m, score, reasons: reasons.slice(0, 2) };
  });

  scored.sort((a, b) => b.score - a.score || b.movie.popularity - a.movie.popularity);

  // Greedy re-rank for variety: each repeat of a director costs a little
  const picked: typeof scored = [];
  const directorCount = new Map<string, number>();
  const remaining = [...scored];
  while (picked.length < limit && remaining.length) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < Math.min(remaining.length, limit * 3); i++) {
      const c = remaining[i];
      const repeats = Math.max(0, ...splitDirectors(c.movie.director).map((d) => directorCount.get(d) ?? 0));
      const adjusted = c.score - 0.04 * repeats;
      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestIdx = i;
      }
    }
    const [chosen] = remaining.splice(bestIdx, 1);
    for (const d of splitDirectors(chosen.movie.director)) directorCount.set(d, (directorCount.get(d) ?? 0) + 1);
    picked.push(chosen);
  }

  return picked.map((c) => ({ movieId: c.movie.id, score: Math.round(c.score * 1000) / 1000, reasons: c.reasons }));
}
