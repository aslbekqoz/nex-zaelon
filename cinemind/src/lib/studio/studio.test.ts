import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { Movie } from "../movies/types";
import { buildContext, firstSentence, formatRuntime, movieWarnings, weekRange, type BrandSettings } from "./context.ts";
import { toHtml, toMarkdown, toPlainText } from "./format.ts";
import { placeholders, renderTemplate } from "./render.ts";

const brand: BrandSettings = {
  brandName: "CineMind AI", signature: "🎬 CineMind AI", hashtags: "#CineMind #kino", siteUrl: "https://cinemind.uz/",
  includeRating: true, includeRuntime: true, includeGenres: true, includeDirector: true, includeTrailer: true,
};

function movie(over: Partial<Movie> = {}): Movie {
  return {
    id: 5, tmdbId: 157336, title: "Interstellar", titleUz: "Yulduzlararo", originalTitle: "Interstellar",
    overview: "Earth is dying. Cooper leaves to find a new home.", overviewUz: "Yer halokat yoqasida. Kuper yangi uy izlab ketadi.",
    director: "Christopher Nolan", releaseDate: "2014-11-05", year: 2014, runtime: 169, rating: 8.4, voteCount: 30000,
    originalLanguage: "en", posterUrl: null, backdropUrl: null, trailerKey: "zSWdZVtXT7E",
    genres: [{ id: 12, slug: "adventure", name: "Adventure", nameUz: "Sarguzasht" }, { id: 878, slug: "science-fiction", name: "Science Fiction", nameUz: "Ilmiy fantastika" }],
    ...over,
  };
}

// Default templates live in the migration; extract them so tests cover the shipped text
const sql = readFileSync(new URL("../../../db/migrations/003_studio.sql", import.meta.url), "utf8");
function template(kind: string, lang: string) {
  const m = sql.match(new RegExp(`\\('${kind}', '${lang}', '(?:[^']|'')*', true,\\n'((?:[^']|'')*)'\\)`));
  assert.ok(m, `template ${kind}/${lang} not found`);
  return m[1].replace(/''/g, "'");
}

describe("renderTemplate", () => {
  it("fills values and hides empty blocks", () => {
    const t = "A {{x}}{{#y}} (y={{y}}){{/y}}{{^y}} no y{{/y}}";
    assert.equal(renderTemplate(t, { x: 1, y: "" }), "A 1 no y");
    assert.equal(renderTemplate(t, { x: 1, y: "z" }), "A 1 (y=z)");
  });

  it("repeats list blocks with item fields shadowing outer ones", () => {
    const t = "{{#items}}{{index}}. {{name}} {{sig}}\n{{/items}}";
    assert.equal(renderTemplate(t, { sig: "!", items: [{ index: 1, name: "a" }, { index: 2, name: "b", sig: "?" }] }), "1. a !\n2. b ?");
  });

  it("collapses blank lines and lists placeholders", () => {
    assert.equal(renderTemplate("a\n\n\n\n{{gone}}\n\nb  ", {}), "a\n\nb");
    assert.deepEqual(placeholders("{{#movies}}{{title}}{{/movies}} {{signature}}"), ["movies", "title", "signature"]);
  });
});

describe("formatters", () => {
  const body = "**Yulduzlararo** _Interstellar_\nhttps://youtu.be/x?a=1. snake_case_name <b>";
  it("plain text strips markup but keeps snake_case", () => {
    assert.equal(toPlainText(body), "Yulduzlararo Interstellar\nhttps://youtu.be/x?a=1. snake_case_name <b>");
  });
  it("markdown keeps bold and uses *italic*", () => {
    assert.equal(toMarkdown("_Interstellar_ snake_case"), "*Interstellar* snake_case");
  });
  it("html escapes input, links URLs and keeps line breaks", () => {
    const html = toHtml(body);
    assert.match(html, /<b>Yulduzlararo<\/b> <i>Interstellar<\/i><br>/);
    assert.match(html, /<a href="https:\/\/youtu.be\/x\?a=1">https:\/\/youtu.be\/x\?a=1<\/a>\./);
    assert.match(html, /&lt;b&gt;$/);
  });
});

describe("context helpers", () => {
  it("formats runtime and week ranges in both languages", () => {
    assert.equal(formatRuntime(169, "uz"), "2 soat 49 daqiqa");
    assert.equal(formatRuntime(60, "en"), "1h");
    assert.equal(weekRange(new Date("2026-10-27T12:00:00Z"), "uz"), "26-oktabr – 1-noyabr, 2026");
    assert.equal(weekRange(new Date("2026-10-27T12:00:00Z"), "en"), "October 26 – November 1, 2026");
  });
  it("takes the first sentence for taglines", () => {
    assert.equal(firstSentence("One. Two."), "One.");
    assert.equal(firstSentence("No full stop"), "No full stop");
  });
  it("warns about missing Uzbek content", () => {
    assert.equal(movieWarnings(movie({ overviewUz: null }), "uz").length, 1);
    assert.equal(movieWarnings(movie(), "uz").length, 0);
    assert.equal(movieWarnings(movie({ overviewUz: null }), "en").length, 0);
  });
});

describe("default templates", () => {
  const now = new Date("2026-10-27T12:00:00Z");

  it("renders an Uzbek movie card", () => {
    const ctx = buildContext({ kind: "movie_card", lang: "uz", movies: [movie()], facts: [], brand, now });
    assert.equal(
      renderTemplate(template("movie_card", "uz"), ctx),
      [
        "🎬 **Yulduzlararo** (2014)",
        "_Interstellar_",
        "",
        "⭐ Reyting: 8.4/10",
        "🎭 Janr: Sarguzasht, Ilmiy fantastika",
        "⏱ Davomiyligi: 2 soat 49 daqiqa",
        "🎥 Rejissyor: Christopher Nolan",
        "",
        "Yer halokat yoqasida. Kuper yangi uy izlab ketadi.",
        "",
        "▶️ Treyler: https://www.youtube.com/watch?v=zSWdZVtXT7E",
        "",
        "🔗 https://cinemind.uz/movies/5",
        "",
        "🎬 CineMind AI",
        "#CineMind #kino",
      ].join("\n"),
    );
  });

  it("respects brand toggles and missing data", () => {
    const b = { ...brand, includeRating: false, includeTrailer: false, siteUrl: "" };
    const ctx = buildContext({ kind: "movie_card", lang: "en", movies: [movie({ runtime: null })], facts: [], brand: b, now });
    const out = renderTemplate(template("movie_card", "en"), ctx);
    assert.doesNotMatch(out, /Rating|Trailer|Runtime|🔗/);
    assert.match(out, /^🎬 \*\*Interstellar\*\* \(2014\)\n\n🎭 Genre: Adventure, Science Fiction/);
  });

  it("renders a numbered weekly collection", () => {
    const movies = [movie(), movie({ id: 9, title: "Coco", titleUz: "Koko", overviewUz: "Migel musiqani sevadi. Oila qarshi.", year: 2017, genres: [] })];
    const out = renderTemplate(template("weekly", "uz"), buildContext({ kind: "weekly", lang: "uz", movies, facts: [], brand, now }));
    assert.match(out, /^🍿 \*\*Haftaning kinolari\*\*\n26-oktabr – 1-noyabr, 2026\n\n1\. \*\*Yulduzlararo\*\* \(2014\) — Sarguzasht, Ilmiy fantastika\nYer halokat yoqasida\.\n\n2\. \*\*Koko\*\* \(2017\)\nMigel musiqani sevadi\./);
  });

  it("renders facts with their sources", () => {
    const facts = [{ text: "Fakt bir.", sourceUrl: "https://example.org/a", sourceTitle: "Example" }];
    const out = renderTemplate(template("facts", "uz"), buildContext({ kind: "facts", lang: "uz", movies: [movie()], facts, brand, now }));
    assert.match(out, /«Yulduzlararo» haqida qiziqarli faktlar\*\*\n\n1\. Fakt bir\.\nManba: Example — https:\/\/example\.org\/a\n\n🎬 CineMind AI/);
  });
});
