import assert from "node:assert/strict";
import { test } from "node:test";
import type { Movie } from "./movies/types.ts";
import { isoDuration, jsonLdScript, movieJsonLd, personJsonLd } from "./seo.ts";

const movie: Movie = {
  id: 7, tmdbId: 329865, title: "Arrival", titleUz: "Kelish", originalTitle: "Arrival",
  overview: "A linguist is recruited.", overviewUz: null, director: "Denis Villeneuve",
  releaseDate: "2016-11-10", year: 2016, runtime: 116, rating: 7.6, voteCount: 18000,
  originalLanguage: "en", posterUrl: "https://image.tmdb.org/t/p/w500/abc.jpg", backdropUrl: null,
  trailerKey: "tFMo3UJ4B4g", genres: [{ id: 18, slug: "drama", name: "Drama", nameUz: "Drama" }],
};
const credits = {
  cast: [{ personId: 1, name: "Amy Adams", profileUrl: null, role: "Louise Banks" }],
  crew: [{ personId: 2, name: "Denis Villeneuve", profileUrl: null, role: "Director" }],
};

test("ISO durations", () => {
  assert.equal(isoDuration(116), "PT1H56M");
  assert.equal(isoDuration(120), "PT2H");
  assert.equal(isoDuration(45), "PT45M");
  assert.equal(isoDuration(0), "PT0M");
});

test("a movie becomes schema.org Movie data", () => {
  const ld = movieJsonLd(movie, credits, "https://cinemind.uz");
  assert.equal(ld["@type"], "Movie");
  assert.equal(ld.url, "https://cinemind.uz/movies/7");
  assert.deepEqual(ld.alternateName, ["Kelish"]);
  assert.equal(ld.image, "https://image.tmdb.org/t/p/w780/abc.jpg");
  assert.equal(ld.datePublished, "2016-11-10");
  assert.equal(ld.duration, "PT1H56M");
  assert.deepEqual(ld.genre, ["Drama"]);
  assert.deepEqual((ld as { director?: unknown }).director, [{ "@type": "Person", name: "Denis Villeneuve", url: "https://cinemind.uz/people/2" }]);
  assert.equal(ld.actor?.[0].name, "Amy Adams");
  assert.deepEqual(ld.aggregateRating, { "@type": "AggregateRating", ratingValue: 7.6, bestRating: 10, worstRating: 0, ratingCount: 18000 });
  assert.equal(ld.trailer?.embedUrl, "https://www.youtube.com/embed/tFMo3UJ4B4g");
});

test("seed movies: year only, no made-up rating, director from the catalogue", () => {
  const seed: Movie = { ...movie, tmdbId: null, releaseDate: "1994-01-01", year: 1994, rating: null, voteCount: null, trailerKey: null, posterUrl: null, runtime: null };
  const ld = movieJsonLd(seed, { cast: [], crew: [] }, "https://cinemind.uz");
  assert.equal(ld.datePublished, "1994");
  assert.ok(!("aggregateRating" in ld));
  assert.ok(!("image" in ld) && !("trailer" in ld) && !("duration" in ld) && !("actor" in ld));
  assert.deepEqual((ld as { director?: unknown }).director, [{ "@type": "Person", name: "Denis Villeneuve" }]);
});

test("people and safe embedding", () => {
  const ld = personJsonLd({ id: 1, name: "Amy Adams", profileUrl: null, biography: null, birthday: "1974-08-20", deathday: null, placeOfBirth: "Vicenza, Italy" }, "https://x.uz");
  assert.deepEqual(ld, { "@context": "https://schema.org", "@type": "Person", name: "Amy Adams", url: "https://x.uz/people/1", birthDate: "1974-08-20", birthPlace: "Vicenza, Italy" });
  assert.equal(jsonLdScript({ a: "</script><script>alert(1)</script>" }), '{"a":"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>"}');
});
