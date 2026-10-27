import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProfile, genreMatch, quality, ratingToSignal, recommend, type CandidateMovie } from "./engine.ts";
import { findMood } from "./moods.ts";

const SCIFI = 878, DRAMA = 18, COMEDY = 35, ANIMATION = 16, HORROR = 27, FAMILY = 10751;
const genreNames = new Map([
  [SCIFI, "Science Fiction"], [DRAMA, "Drama"], [COMEDY, "Comedy"],
  [ANIMATION, "Animation"], [HORROR, "Horror"], [FAMILY, "Family"],
]);

let nextId = 1;
function movie(over: Partial<CandidateMovie>): CandidateMovie {
  return {
    id: nextId++, title: "Untitled", genreIds: [], director: null, year: 2010,
    rating: null, voteCount: null, popularity: 1, runtime: 120, ...over,
  };
}

const inception = movie({ title: "Inception", genreIds: [SCIFI], director: "Christopher Nolan", year: 2010 });
const interstellar = movie({ title: "Interstellar", genreIds: [SCIFI, DRAMA], director: "Christopher Nolan", year: 2014 });
const matrix = movie({ title: "The Matrix", genreIds: [SCIFI], director: "Lana Wachowski, Lilly Wachowski", year: 1999 });
const toyStory = movie({ title: "Toy Story", genreIds: [ANIMATION, COMEDY, FAMILY], year: 1995, runtime: 81, popularity: 50 });
const getOut = movie({ title: "Get Out", genreIds: [HORROR], year: 2017, runtime: 104 });
const comedy = movie({ title: "Comedy", genreIds: [COMEDY], year: 2014, runtime: 100 });
const all = [inception, interstellar, matrix, toyStory, getOut, comedy];

describe("helpers", () => {
  it("maps ratings to a signed signal", () => {
    assert.equal(ratingToSignal(10), 1);
    assert.equal(ratingToSignal(1), -1);
    assert.equal(ratingToSignal(5.5), 0);
  });

  it("scores genre match between 0 and 1, neutral without genres", () => {
    const w = new Map([[SCIFI, 1], [HORROR, -1]]);
    assert.equal(genreMatch([SCIFI], w), 1);
    assert.equal(genreMatch([HORROR], w), 0);
    assert.equal(genreMatch([], w), 0.5);
  });

  it("shrinks quality towards neutral when there are few votes", () => {
    assert.equal(quality(movie({ rating: null })), 0.5);
    assert.ok(quality(movie({ rating: 9, voteCount: 5000 })) > quality(movie({ rating: 9, voteCount: 10 })));
  });
});

describe("buildProfile", () => {
  it("combines favourite genres, ratings and watchlist", () => {
    const p = buildProfile({
      favoriteGenreIds: [COMEDY],
      ratings: [{ movie: inception, rating: 10 }, { movie: getOut, rating: 2 }],
      watchlist: [{ movie: interstellar, watched: false }],
    });
    assert.ok((p.genreWeights.get(SCIFI) ?? 0) > 0.9, "loved sci-fi film plus watchlist");
    assert.ok((p.genreWeights.get(HORROR) ?? 0) < 0, "disliked horror film");
    assert.ok((p.genreWeights.get(COMEDY) ?? 0) > 0, "favourite genre");
    assert.ok(p.directors.get("Christopher Nolan")!.weight > 1);
    assert.deepEqual([...p.excluded].sort(), [inception.id, getOut.id, interstellar.id].sort());
    assert.equal(p.strength, 4);
  });

  it("is empty for a new user", () => {
    const p = buildProfile({ favoriteGenreIds: [], ratings: [], watchlist: [] });
    assert.equal(p.strength, 0);
    assert.equal(p.yearCenter, null);
  });
});

describe("recommend", () => {
  it("ranks the same director and genre first and explains why", () => {
    const p = buildProfile({ favoriteGenreIds: [], ratings: [{ movie: inception, rating: 9 }], watchlist: [] });
    const recs = recommend(all, p, { genreNames });
    assert.equal(recs[0].movieId, interstellar.id);
    assert.match(recs[0].reasons[0], /Christopher Nolan, director of Inception \(you rated it 9\/10\)/);
    assert.ok(!recs.some((r) => r.movieId === inception.id), "already rated films are excluded");
  });

  it("pushes disliked genres to the bottom", () => {
    const p = buildProfile({ favoriteGenreIds: [SCIFI], ratings: [{ movie: getOut, rating: 1 }], watchlist: [] });
    const recs = recommend([...all, movie({ title: "Another horror", genreIds: [HORROR] })], p, { genreNames });
    assert.equal(genreNames.get(HORROR), "Horror");
    assert.ok(recs.findIndex((r) => r.movieId === matrix.id) < recs.length - 1);
    assert.equal(recs.at(-1)!.reasons.some((r) => r.includes("Horror")), false);
  });

  it("falls back to popularity for a cold start", () => {
    const p = buildProfile({ favoriteGenreIds: [], ratings: [], watchlist: [] });
    const recs = recommend(all, p, { genreNames });
    assert.equal(recs[0].movieId, toyStory.id);
    assert.equal(recs[0].reasons[0], "Popular on CineMind");
  });

  it("follows the chosen mood even without a profile", () => {
    const p = buildProfile({ favoriteGenreIds: [], ratings: [], watchlist: [] });
    const recs = recommend(all, p, { genreNames, mood: findMood("feel-good") });
    assert.equal(recs[0].movieId, toyStory.id);
    assert.equal(recs.at(-1)!.movieId, getOut.id);
    assert.match(recs[0].reasons.join(" "), /Fits your mood: Feel-good/);
  });

  it("applies a mood's runtime limit", () => {
    const p = buildProfile({ favoriteGenreIds: [], ratings: [], watchlist: [] });
    const recs = recommend(all, p, { genreNames, mood: findMood("short") });
    assert.deepEqual(new Set(recs.map((r) => r.movieId)), new Set([toyStory.id, getOut.id, comedy.id]));
  });

  it("varies directors when scores are close", () => {
    const nolan = Array.from({ length: 4 }, (_, i) =>
      movie({ title: `Nolan ${i}`, genreIds: [SCIFI], director: "Christopher Nolan" }));
    const other = movie({ title: "Other", genreIds: [SCIFI], director: "Someone Else" });
    const p = buildProfile({ favoriteGenreIds: [SCIFI], ratings: [], watchlist: [] });
    const recs = recommend([...nolan, other], p, { genreNames, limit: 3 });
    assert.ok(recs.some((r) => r.movieId === other.id));
  });

  it("respects the limit", () => {
    const p = buildProfile({ favoriteGenreIds: [], ratings: [], watchlist: [] });
    assert.equal(recommend(all, p, { genreNames, limit: 2 }).length, 2);
  });
});
