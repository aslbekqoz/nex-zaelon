import "server-only";

// TMDB (themoviedb.org) uchun yupqa mijoz. Kalit berilmasa, platforma faqat mahalliy katalog bilan ishlaydi.

// TMDB_API_URL faqat sinov yoki proksi uchun; odatda o'rnatilmaydi
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
  credits?: { crew: { job: string; name: string }[] };
};

export function tmdbEnabled() {
  return Boolean(process.env.TMDB_API_KEY?.trim());
}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.TMDB_API_KEY!.trim();
  const url = new URL(API + path);
  url.searchParams.set("language", process.env.TMDB_LANGUAGE?.trim() || "en-US");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  // v4 "Read Access Token" JWT ko'rinishida bo'ladi, v3 kalit esa qisqa hex satr
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

export function posterUrl(path: string | null) {
  return path ? `${IMAGE}/w500${path}` : null;
}

export function backdropUrl(path: string | null) {
  return path ? `${IMAGE}/w1280${path}` : null;
}

/** Rasmiy YouTube treylerini tanlaydi; bo'lmasa, istalgan treyler yoki tizer. */
export function pickTrailer(details: TmdbMovieDetails) {
  const vids = (details.videos?.results ?? []).filter((v) => v.site === "YouTube");
  const score = (v: (typeof vids)[number]) =>
    (v.type === "Trailer" ? 4 : v.type === "Teaser" ? 2 : 0) + (v.official ? 1 : 0);
  const best = vids.filter((v) => score(v) >= 2).sort((a, b) => score(b) - score(a))[0];
  return best?.key ?? null;
}
