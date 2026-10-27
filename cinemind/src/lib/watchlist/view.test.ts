import assert from "node:assert/strict";
import { test } from "node:test";
import type { Movie } from "../movies/types.ts";
import { applyWatchlistView, countWatchlist, csvCell, parseWatchlistParams, watchlistCsv, type WatchlistItem } from "./view.ts";

const movie = (id: number, title: string, year: number | null, rating: number | null): Movie => ({
  id, tmdbId: null, title, titleUz: null, originalTitle: null, overview: null, overviewUz: null, director: null,
  releaseDate: null, year, runtime: null, rating, voteCount: null, originalLanguage: null, posterUrl: null,
  backdropUrl: null, trailerKey: null, genres: [],
});
const items: WatchlistItem[] = [
  { movie: movie(1, "Heat", 1995, 8.3), watched: true, addedAt: "2026-03-01T00:00:00.000Z", userRating: 9 },
  { movie: movie(2, "arrival", 2016, 7.6), watched: false, addedAt: "2026-02-01T00:00:00.000Z", userRating: null },
  { movie: movie(3, "Dune", 2021, null), watched: false, addedAt: "2026-04-01T00:00:00.000Z", userRating: 7 },
];
const ids = (list: WatchlistItem[]) => list.map((i) => i.movie.id);

test("unknown parameters fall back to the defaults", () => {
  assert.deepEqual(parseWatchlistParams({}), { filter: "all", sort: "added" });
  assert.deepEqual(parseWatchlistParams({ show: "watched", sort: "year" }), { filter: "watched", sort: "year" });
  assert.deepEqual(parseWatchlistParams({ show: "__proto__", sort: "constructor" }), { filter: "all", sort: "added" });
});

test("filters and counts", () => {
  assert.deepEqual(ids(applyWatchlistView(items, { filter: "watched", sort: "added" })), [1]);
  assert.deepEqual(ids(applyWatchlistView(items, { filter: "to-watch", sort: "added" })), [3, 2]);
  assert.deepEqual(countWatchlist(items), { all: 3, "to-watch": 2, watched: 1 });
});

test("sorting; missing values go last", () => {
  assert.deepEqual(ids(applyWatchlistView(items, { filter: "all", sort: "added" })), [3, 2, 1], "to watch first, newest first");
  assert.deepEqual(ids(applyWatchlistView(items, { filter: "all", sort: "title" })), [2, 3, 1], "case-insensitive");
  assert.deepEqual(ids(applyWatchlistView(items, { filter: "all", sort: "year" })), [3, 2, 1]);
  assert.deepEqual(ids(applyWatchlistView(items, { filter: "all", sort: "rating" })), [1, 2, 3]);
  assert.deepEqual(ids(applyWatchlistView(items, { filter: "all", sort: "mine" })), [1, 3, 2]);
  assert.deepEqual(ids(items), [1, 2, 3], "the input is not reordered");
});

test("CSV cells are quoted and can't become formulas", () => {
  assert.equal(csvCell("Heat"), "Heat");
  assert.equal(csvCell('Say "hi", Ann'), '"Say ""hi"", Ann"');
  assert.equal(csvCell("=HYPERLINK(\"x\")"), "\"'=HYPERLINK(\"\"x\"\")\"");
  assert.equal(csvCell("-1 point"), "'-1 point");
  assert.equal(csvCell(-1), "-1");
  assert.equal(csvCell(null), "");
});

test("the CSV export", () => {
  const csv = watchlistCsv([items[0]], "https://cinemind.uz");
  assert.ok(csv.startsWith("﻿Title,Uzbek title,Year,"));
  assert.equal(csv.split("\r\n")[1], "Heat,,1995,,yes,9,8.3,2026-03-01,https://cinemind.uz/movies/1");
});
