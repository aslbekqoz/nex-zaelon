export type Genre = {
  id: number;
  slug: string;
  name: string;
  nameUz: string;
};

export type Movie = {
  id: number;
  tmdbId: number | null;
  title: string;
  titleUz: string | null;
  originalTitle: string | null;
  overview: string | null;
  overviewUz: string | null;
  director: string | null;
  releaseDate: string | null;
  year: number | null;
  runtime: number | null;
  rating: number | null;
  voteCount: number | null;
  originalLanguage: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerKey: string | null;
  genres: Genre[];
};

export type SortKey = "popular" | "rating" | "newest" | "title";

export type SearchParams = {
  q?: string;
  genre?: string;
  sort?: SortKey;
  page?: number;
};

export function displayTitle(m: Pick<Movie, "title">) {
  return m.title;
}
