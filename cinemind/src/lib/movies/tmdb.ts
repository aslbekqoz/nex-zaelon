import "server-only";
import type { RawCast, RawCrew } from "./credits";
import type { RawWatchProviders } from "./providers";

// Thin client for TMDB (themoviedb.org). Without a key the platform runs on the local catalogue only.

// TMDB_API_URL is only for tests or a proxy; normally unset
const API = process.env.TMDB_API_URL?.trim() || "https://api.themoviedb.org/3";
const IMAGE = "https://image.tmdb.org/t/p";

export type TmdbMovieSummary = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date?: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language: string;
  genre_ids?: number[];
  adult?: boolean;
};

export type TmdbMovieDetails = Omit<TmdbMovieSummary, "genre_ids"> & {
  runtime: number | null;
  genres: { id: number; name: string }[];
  videos?: { results: { key: string; site: string; type: string; official: boolean; iso_639_1: string }[] };
  credits?: { cast?: RawCast[]; crew?: RawCrew[] };
};

export function tmdbEnabled() {
  return Boolean(process.env.TMDB_API_KEY?.trim());
}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.TMDB_API_KEY!.trim();
  const url = new URL(API + path);
  url.searchParams.set("language", process.env.TMDB_LANGUAGE?.trim() || "en-US");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  // A v4 "Read Access Token" is a JWT; a v3 key is a short hex string
  const headers: Record<string, string> = { accept: "application/json" };
  if (key.startsWith("eyJ")) headers.authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);

  const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`TMDB ${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function tmdbSearch(q: string) {
  const data = await tmdb<{ results: TmdbMovieSummary[] }>("/search/movie", { query: q, include_adult: "false" });
  return data.results.filter((m) => !m.adult);
}

export async function tmdbDetails(id: number) {
  return tmdb<TmdbMovieDetails>(`/movie/${id}`, { append_to_response: "videos,credits" });
}

export async function tmdbWatchProviders(id: number) {
  return tmdb<RawWatchProviders>(`/movie/${id}/watch/providers`);
}

export type TmdbPersonCredit = TmdbMovieSummary & { character?: string; job?: string; order?: number; department?: string };

export type TmdbPerson = {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  adult?: boolean;
  movie_credits?: { cast: TmdbPersonCredit[]; crew: TmdbPersonCredit[] };
};

export async function tmdbPerson(id: number) {
  return tmdb<TmdbPerson>(`/person/${id}`, { append_to_response: "movie_credits" });
}

export const TMDB_LISTS = {
  trending: { path: "/trending/movie/week", label: "Trending this week" },
  popular: { path: "/movie/popular", label: "Popular" },
  top_rated: { path: "/movie/top_rated", label: "Top rated" },
  now_playing: { path: "/movie/now_playing", label: "Now in cinemas" },
} as const;
export type TmdbListKey = keyof typeof TMDB_LISTS;

export async function tmdbList(list: TmdbListKey, page: number) {
  const data = await tmdb<{ results: TmdbMovieSummary[] }>(TMDB_LISTS[list].path, { page: String(page) });
  return data.results.filter((m) => !m.adult);
}

export function profileUrl(path: string | null) {
  return path ? `${IMAGE}/w185${path}` : null;
}

export function posterUrl(path: string | null) {
  return path ? `${IMAGE}/w500${path}` : null;
}

export function backdropUrl(path: string | null) {
  return path ? `${IMAGE}/w1280${path}` : null;
}

/** Picks the official YouTube trailer; otherwise any trailer or teaser. */
export function pickTrailer(details: TmdbMovieDetails) {
  const vids = (details.videos?.results ?? []).filter((v) => v.site === "YouTube");
  const score = (v: (typeof vids)[number]) =>
    (v.type === "Trailer" ? 4 : v.type === "Teaser" ? 2 : 0) + (v.official ? 1 : 0);
  const best = vids.filter((v) => score(v) >= 2).sort((a, b) => score(b) - score(a))[0];
  return best?.key ?? null;
}
