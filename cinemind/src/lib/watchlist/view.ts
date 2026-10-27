// Filtering, sorting and CSV export for the watchlist page. Pure, unit tested.

import type { Movie } from "../movies/types.ts";

export type WatchlistItem = { movie: Movie; watched: boolean; addedAt: string; userRating: number | null };

export const FILTERS = { all: "All", "to-watch": "To watch", watched: "Watched" } as const;
export type WatchlistFilter = keyof typeof FILTERS;

export const SORTS = {
  added: "Recently added",
  title: "Title",
  year: "Newest first",
  rating: "Highest rated",
  mine: "My rating",
} as const;
export type WatchlistSort = keyof typeof SORTS;

export function parseWatchlistParams(sp: { show?: string; sort?: string }) {
  // Object.hasOwn, not "in": "__proto__" or "constructor" must not count as options
  const filter: WatchlistFilter = sp.show && Object.hasOwn(FILTERS, sp.show) ? (sp.show as WatchlistFilter) : "all";
  const sort: WatchlistSort = sp.sort && Object.hasOwn(SORTS, sp.sort) ? (sp.sort as WatchlistSort) : "added";
  return { filter, sort };
}

/** Missing values sort last whatever the direction. */
function desc(a: number | null, b: number | null) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

export function applyWatchlistView(items: WatchlistItem[], view: { filter: WatchlistFilter; sort: WatchlistSort }) {
  const shown = items.filter((i) => (view.filter === "all" ? true : view.filter === "watched" ? i.watched : !i.watched));
  const byTitle = (a: WatchlistItem, b: WatchlistItem) => a.movie.title.localeCompare(b.movie.title, "en", { sensitivity: "base" });
  const byAdded = (a: WatchlistItem, b: WatchlistItem) => b.addedAt.localeCompare(a.addedAt);
  const compare: Record<WatchlistSort, (a: WatchlistItem, b: WatchlistItem) => number> = {
    // In the full list, movies still to watch come before watched ones
    added: (a, b) => (view.filter === "all" ? Number(a.watched) - Number(b.watched) : 0) || byAdded(a, b),
    title: byTitle,
    year: (a, b) => desc(a.movie.year, b.movie.year) || byTitle(a, b),
    rating: (a, b) => desc(a.movie.rating, b.movie.rating) || byTitle(a, b),
    mine: (a, b) => desc(a.userRating, b.userRating) || byAdded(a, b),
  };
  return [...shown].sort(compare[view.sort]);
}

export function countWatchlist(items: WatchlistItem[]): Record<WatchlistFilter, number> {
  const watched = items.filter((i) => i.watched).length;
  return { all: items.length, "to-watch": items.length - watched, watched };
}

/**
 * One CSV cell. Quotes when needed, and defuses values a spreadsheet would run as a formula
 * (a title starting with "=", "+", "-" or "@").
 */
export function csvCell(value: string | number | boolean | null) {
  if (value === null) return "";
  let s = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function watchlistCsv(items: WatchlistItem[], base: string | null) {
  const header = ["Title", "Uzbek title", "Year", "Genres", "Watched", "My rating", "TMDB rating", "Added", "Link"];
  const rows = items.map((i) => [
    i.movie.title,
    i.movie.titleUz,
    i.movie.year,
    i.movie.genres.map((g) => g.name).join(", "),
    i.watched ? "yes" : "no",
    i.userRating,
    i.movie.rating,
    i.addedAt.slice(0, 10),
    `${base ?? ""}/movies/${i.movie.id}`,
  ]);
  // A byte-order mark so Excel reads the file as UTF-8 (Uzbek titles)
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
