// Structured data (schema.org JSON-LD) for search engines. Pure, unit tested.

import { tmdbSized } from "./movies/images.ts";
import type { Credit, Movie } from "./movies/types.ts";

/** Open Graph fields every page shares; a page's own openGraph replaces the layout's, so pages spread these in. */
export const OG_SITE = { siteName: "CineMind AI", locale: "en_US" } as const;

/** ISO 8601 duration, e.g. 125 → "PT2H5M". */
export function isoDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `PT${h ? `${h}H` : ""}${m || !h ? `${m}M` : ""}`;
}

/** Large poster for link previews and structured data. */
export function shareImage(url: string | null) {
  return url ? tmdbSized(url, "w780") : null;
}

const people = (list: Credit[], base: string) =>
  list.map((c) => ({ "@type": "Person", name: c.name, url: `${base}/people/${c.personId}` }));

export function movieJsonLd(movie: Movie, credits: { cast: Credit[]; crew: Credit[] }, base: string) {
  const alternate = [movie.titleUz, movie.originalTitle].filter((t): t is string => Boolean(t) && t !== movie.title);
  const directorCredits = credits.crew.filter((c) => c.role === "Director");
  // Credits link to person pages; seed movies only have the director's name
  const director: { "@type": string; name: string; url?: string }[] = directorCredits.length
    ? people(directorCredits, base)
    : movie.director
      ? [{ "@type": "Person", name: movie.director }]
      : [];
  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    ...(alternate.length ? { alternateName: [...new Set(alternate)] } : {}),
    url: `${base}/movies/${movie.id}`,
    ...(movie.overview || movie.overviewUz ? { description: movie.overview || movie.overviewUz } : {}),
    ...(movie.posterUrl ? { image: shareImage(movie.posterUrl) } : {}),
    // Seed movies only know their year, stored as YYYY-01-01
    ...(movie.releaseDate ? { datePublished: movie.releaseDate.endsWith("-01-01") && !movie.tmdbId ? String(movie.year) : movie.releaseDate } : {}),
    ...(movie.genres.length ? { genre: movie.genres.map((g) => g.name) } : {}),
    ...(movie.runtime ? { duration: isoDuration(movie.runtime) } : {}),
    ...(movie.originalLanguage ? { inLanguage: movie.originalLanguage } : {}),
    ...(director.length ? { director } : {}),
    ...(credits.cast.length ? { actor: people(credits.cast.slice(0, 10), base) } : {}),
    ...(movie.rating && movie.voteCount
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: movie.rating, bestRating: 10, worstRating: 0, ratingCount: movie.voteCount } }
      : {}),
    ...(movie.trailerKey
      ? {
          trailer: {
            "@type": "VideoObject",
            name: `${movie.title} — trailer`,
            embedUrl: `https://www.youtube.com/embed/${movie.trailerKey}`,
            thumbnailUrl: `https://i.ytimg.com/vi/${movie.trailerKey}/hqdefault.jpg`,
            ...(movie.overview ? { description: movie.overview } : {}),
          },
        }
      : {}),
  };
}

export function personJsonLd(
  person: { id: number; name: string; profileUrl: string | null; biography: string | null; birthday: string | null; deathday: string | null; placeOfBirth: string | null },
  base: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    url: `${base}/people/${person.id}`,
    ...(person.profileUrl ? { image: tmdbSized(person.profileUrl, "h632") } : {}),
    ...(person.biography ? { description: person.biography.slice(0, 500) } : {}),
    ...(person.birthday ? { birthDate: person.birthday } : {}),
    ...(person.deathday ? { deathDate: person.deathday } : {}),
    ...(person.placeOfBirth ? { birthPlace: person.placeOfBirth } : {}),
  };
}

/** JSON for a <script type="application/ld+json">: "<" is escaped so the data can't close the tag. */
export function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
