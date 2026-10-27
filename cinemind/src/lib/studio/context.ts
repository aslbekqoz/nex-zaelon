// Builds template contexts from movies, facts and brand settings, in Uzbek or English.
// Pure: no database access, so it is unit tested and reusable.

import type { Movie } from "../movies/types";
import type { TemplateContext } from "./render";

export type Language = "uz" | "en";
export type ContentKind = "movie_card" | "description" | "weekly" | "facts";

export type BrandSettings = {
  brandName: string;
  signature: string;
  hashtags: string;
  siteUrl: string;
  includeRating: boolean;
  includeRuntime: boolean;
  includeGenres: boolean;
  includeDirector: boolean;
  includeTrailer: boolean;
};

export type FactForPost = { text: string; sourceUrl: string; sourceTitle: string | null };

const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentyabr", "oktabr", "noyabr", "dekabr"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function formatRuntime(minutes: number, lang: Language) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (lang === "uz") return [h ? `${h} soat` : "", m ? `${m} daqiqa` : ""].filter(Boolean).join(" ");
  return [h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ");
}

/** Monday–Sunday range of the week containing `date`, e.g. "27-oktabr – 2-noyabr, 2026". */
export function weekRange(date: Date, lang: Language) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const fmt = (d: Date) =>
    lang === "uz" ? `${d.getUTCDate()}-${UZ_MONTHS[d.getUTCMonth()]}` : `${EN_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return `${fmt(start)} – ${fmt(end)}, ${end.getUTCFullYear()}`;
}

/** First sentence of a synopsis, for one-line taglines in collections. */
export function firstSentence(text: string | null) {
  if (!text) return "";
  const m = text.match(/^.+?[.!?](?=\s|$)/);
  return (m ? m[0] : text).trim();
}

export function sourceLabel(f: FactForPost) {
  if (f.sourceTitle) return `${f.sourceTitle} — ${f.sourceUrl}`;
  return f.sourceUrl;
}

/** Editorial warnings about missing data, shown in the editor (never inside the post). */
export function movieWarnings(m: Movie, lang: Language) {
  const w: string[] = [];
  if (lang === "uz" && !m.overviewUz) w.push(`“${m.title}” has no Uzbek synopsis yet — the English one was used.`);
  if (lang === "uz" && !m.titleUz) w.push(`“${m.title}” has no Uzbek title yet.`);
  if (!m.overview && !m.overviewUz) w.push(`“${m.title}” has no synopsis.`);
  return w;
}

export function movieContext(m: Movie, lang: Language, brand: BrandSettings): TemplateContext {
  const uz = lang === "uz";
  const title = uz ? m.titleUz || m.title : m.title;
  const original = uz ? m.title : m.originalTitle;
  const genres = m.genres.map((g) => (uz ? g.nameUz : g.name)).join(", ");
  const site = brand.siteUrl.replace(/\/+$/, "");
  return {
    title,
    original_title: original && original !== title ? original : "",
    year: m.year ?? "",
    rating: brand.includeRating && m.rating !== null ? m.rating.toFixed(1) : "",
    runtime: brand.includeRuntime && m.runtime ? formatRuntime(m.runtime, lang) : "",
    genres: brand.includeGenres ? genres : "",
    director: brand.includeDirector ? (m.director ?? "") : "",
    overview: (uz ? m.overviewUz || m.overview : m.overview || m.overviewUz) ?? "",
    tagline: firstSentence(uz ? m.overviewUz || m.overview : m.overview || m.overviewUz),
    trailer_url: brand.includeTrailer && m.trailerKey ? `https://www.youtube.com/watch?v=${m.trailerKey}` : "",
    url: site ? `${site}/movies/${m.id}` : "",
  };
}

export function brandContext(brand: BrandSettings): TemplateContext {
  return { signature: brand.signature, hashtags: brand.hashtags, brand: brand.brandName };
}

export function draftTitle(kind: ContentKind, lang: Language, movies: Movie[], now: Date) {
  const name = (m: Movie) => (lang === "uz" ? m.titleUz || m.title : m.title);
  switch (kind) {
    case "movie_card":
      return lang === "uz" ? `Film kartasi: ${name(movies[0])}` : `Movie card: ${name(movies[0])}`;
    case "description":
      return lang === "uz" ? `Tavsif: ${name(movies[0])}` : `Description: ${name(movies[0])}`;
    case "facts":
      return lang === "uz" ? `Faktlar: ${name(movies[0])}` : `Facts: ${name(movies[0])}`;
    case "weekly":
      return lang === "uz" ? `Haftaning kinolari (${weekRange(now, lang)})` : `Movies of the week (${weekRange(now, lang)})`;
  }
}

/** Full template context for a draft of the given kind. */
export function buildContext(input: {
  kind: ContentKind;
  lang: Language;
  movies: Movie[];
  facts: FactForPost[];
  brand: BrandSettings;
  now: Date;
}): TemplateContext {
  const { kind, lang, movies, facts, brand, now } = input;
  const base = { ...brandContext(brand), week_range: weekRange(now, lang) };
  if (kind === "weekly") {
    return {
      ...base,
      movies: movies.map((m, i) => ({ ...movieContext(m, lang, brand), index: i + 1 })),
    };
  }
  const first = movies[0];
  return {
    ...base,
    ...(first ? movieContext(first, lang, brand) : {}),
    facts: facts.map((f, i) => ({ index: i + 1, text: f.text, source: sourceLabel(f) })),
  };
}
