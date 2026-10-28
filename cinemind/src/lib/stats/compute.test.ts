import assert from "node:assert/strict";
import { test } from "node:test";
import { average, favouriteDecade, formatHours, ratingDistribution, topGenres, type RatedMovie } from "./compute.ts";

const movies: RatedMovie[] = [
  { rating: 9, year: 1994, runtime: 142, genres: ["Drama", "Crime"] },
  { rating: 7, year: 1999, runtime: 136, genres: ["Action", "Science Fiction"] },
  { rating: 10, year: 1972, runtime: 175, genres: ["Drama", "Crime"] },
  { rating: 6, year: 2010, runtime: null, genres: ["Action"] },
  { rating: 8, year: null, runtime: 100, genres: ["Drama"] },
];

test("distribution has ten buckets", () => {
  const d = ratingDistribution(movies.map((m) => m.rating));
  assert.equal(d.length, 10);
  assert.deepEqual(d.filter((b) => b.count).map((b) => b.rating), [6, 7, 8, 9, 10]);
  assert.equal(ratingDistribution([]).every((b) => b.count === 0), true);
});

test("averages, genres and decades", () => {
  assert.equal(average([]), null);
  assert.equal(average([7, 8]), 7.5);
  assert.deepEqual(topGenres(movies, { limit: 3 }), [
    { genre: "Drama", count: 3, average: 9 },
    { genre: "Crime", count: 2, average: 9.5 },
    { genre: "Action", count: 2, average: 6.5 },
  ]);
  assert.deepEqual(topGenres(movies, { min: 3 }).map((g) => g.genre), ["Drama"]);
  assert.equal(favouriteDecade(movies), "1990s");
  assert.equal(favouriteDecade([]), null);
});

test("hours", () => {
  assert.equal(formatHours(553), "9 h 13 min");
  assert.equal(formatHours(120), "2 h");
  assert.equal(formatHours(45), "45 min");
  assert.equal(formatHours(0), null);
});
