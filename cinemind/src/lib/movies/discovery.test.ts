import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KEY_JOBS, MAX_CAST, pickCredits } from "./credits.ts";
import { filterParams, hasFilters, languageName, parseFilters } from "./filters.ts";
import { backdropImage, posterImage, tmdbSized } from "./images.ts";

describe("images", () => {
  const url = "https://image.tmdb.org/t/p/w500/abc.jpg";
  it("resizes TMDB urls and leaves others alone", () => {
    assert.equal(tmdbSized(url, "w185"), "https://image.tmdb.org/t/p/w185/abc.jpg");
    assert.equal(tmdbSized("https://example.org/p.jpg", "w185"), "https://example.org/p.jpg");
  });
  it("builds responsive sources", () => {
    const card = posterImage(url);
    assert.equal(card.src, "https://image.tmdb.org/t/p/w342/abc.jpg");
    assert.match(card.srcSet!, /w185\/abc\.jpg 185w, .*w342\/abc\.jpg 342w/);
    assert.deepEqual(posterImage("https://example.org/p.jpg"), { src: "https://example.org/p.jpg" });
    assert.match(backdropImage("https://image.tmdb.org/t/p/w1280/b.jpg").srcSet!, /w780\/b\.jpg 780w/);
  });
});

describe("pickCredits", () => {
  const cast = Array.from({ length: 20 }, (_, i) => ({ id: 100 + i, name: `Actor ${i}`, character: ` Role ${i} `, order: 19 - i }));
  const crew = [
    { id: 1, name: "Prod A", job: "Producer", popularity: 1 },
    { id: 2, name: "Prod B", job: "Producer", popularity: 5 },
    { id: 3, name: "Prod C", job: "Producer", popularity: 3 },
    { id: 4, name: "Prod D", job: "Producer", popularity: 2 },
    { id: 5, name: "Christopher Nolan", job: "Director" },
    { id: 5, name: "Christopher Nolan", job: "Director" },
    { id: 5, name: "Christopher Nolan", job: "Writer" },
    { id: 6, name: "Hans Zimmer", job: "Original Music Composer" },
    { id: 7, name: "Grip", job: "Key Grip" },
  ];
  const picks = pickCredits({ cast, crew });

  it("keeps the top-billed cast in order with trimmed roles", () => {
    const c = picks.filter((p) => p.kind === "cast");
    assert.equal(c.length, MAX_CAST);
    assert.equal(c[0].name, "Actor 19");
    assert.equal(c[0].role, "Role 19");
    assert.deepEqual(c.map((p) => p.ord), [...Array(MAX_CAST).keys()]);
  });
  it("keeps key crew jobs in display order, deduplicated and capped", () => {
    const c = picks.filter((p) => p.kind === "crew");
    assert.deepEqual(c.map((p) => `${p.name}/${p.role}`), [
      "Christopher Nolan/Director",
      "Christopher Nolan/Writer",
      "Hans Zimmer/Original Music Composer",
      "Prod B/Producer",
      "Prod C/Producer",
      "Prod D/Producer",
    ]);
    assert.ok(c.every((p) => KEY_JOBS.includes(p.role)));
  });
  it("handles missing credits", () => {
    assert.deepEqual(pickCredits(undefined), []);
  });
});

describe("parseFilters", () => {
  const now = new Date("2026-10-27");
  it("parses valid values and swaps a reversed year range", () => {
    const f = parseFilters({ from: "2010", to: "1990", lang: "EN", rating: "7.5" }, now);
    assert.deepEqual(f, { yearFrom: 1990, yearTo: 2010, language: "en", minRating: 7.5 });
    assert.equal(hasFilters(f), true);
    assert.deepEqual(filterParams(f), { from: "1990", to: "2010", lang: "en", rating: "7.5" });
  });
  it("drops invalid values", () => {
    const f = parseFilters({ from: "19", to: "3000", lang: "english", rating: "7.3" }, now);
    assert.deepEqual(f, { yearFrom: undefined, yearTo: undefined, language: undefined, minRating: undefined });
    assert.equal(hasFilters(f), false);
  });
  it("names languages", () => {
    assert.equal(languageName("ko"), "Korean");
    assert.equal(languageName("xx"), "XX");
  });
});
