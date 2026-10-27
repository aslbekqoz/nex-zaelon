import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateLimit, evaluateVolume, retryMessage } from "../auth/rate-limit.ts";
import { parseMovieInput, parseYoutubeKey } from "./movie-input.ts";

const now = new Date("2026-10-27T12:00:00Z");
const ago = (min: number) => new Date(now.getTime() - min * 60000);
const limit = { max: 5, windowMs: 15 * 60000 };

describe("evaluateLimit", () => {
  it("allows until the limit of recent failures", () => {
    const a = [1, 2, 3, 4].map((m) => ({ success: false, at: ago(m) }));
    assert.deepEqual(evaluateLimit(a, now, limit), { blocked: false, remaining: 1 });
  });
  it("blocks at the limit and says when it unlocks", () => {
    const a = [1, 2, 3, 4, 10].map((m) => ({ success: false, at: ago(m) }));
    const r = evaluateLimit(a, now, limit);
    assert.equal(r.blocked, true);
    assert.equal(r.blocked && r.retryAfterMs, 5 * 60000); // the failure 10 min ago ages out in 5 min
  });
  it("ignores failures outside the window and before a success", () => {
    const a = [
      ...[20, 30, 40, 50, 60].map((m) => ({ success: false, at: ago(m) })),
      ...[6, 7, 8].map((m) => ({ success: false, at: ago(m) })),
      { success: true, at: ago(5) },
      ...[1, 2].map((m) => ({ success: false, at: ago(m) })),
    ];
    assert.deepEqual(evaluateLimit(a, now, limit), { blocked: false, remaining: 3 });
  });
  it("counts volume regardless of success", () => {
    const a = [1, 2, 3].map((m) => ({ success: true, at: ago(m) }));
    assert.equal(evaluateVolume(a, now, { max: 3, windowMs: 60 * 60000 }).blocked, true);
  });
  it("formats retry messages", () => {
    assert.equal(retryMessage(30_000), "Too many attempts. Please try again in 1 minute.");
    assert.equal(retryMessage(5 * 60000 + 1), "Too many attempts. Please try again in 6 minutes.");
  });
});

describe("parseYoutubeKey", () => {
  it("accepts ids and common URL shapes", () => {
    for (const v of [
      "zSWdZVtXT7E",
      "https://www.youtube.com/watch?v=zSWdZVtXT7E&t=10",
      "https://youtu.be/zSWdZVtXT7E?si=x",
      "https://www.youtube.com/embed/zSWdZVtXT7E",
      "https://m.youtube.com/shorts/zSWdZVtXT7E",
    ]) assert.equal(parseYoutubeKey(v), "zSWdZVtXT7E", v);
  });
  it("returns null for empty and undefined for invalid", () => {
    assert.equal(parseYoutubeKey("  "), null);
    assert.equal(parseYoutubeKey("https://vimeo.com/123"), undefined);
    assert.equal(parseYoutubeKey("not a key"), undefined);
  });
});

describe("parseMovieInput", () => {
  const base = { title: " Interstellar ", releaseDate: "2014", runtime: "169", originalLanguage: "EN", trailer: "https://youtu.be/zSWdZVtXT7E" };
  it("normalises valid input", () => {
    const r = parseMovieInput({ ...base, titleUz: "Yulduzlararo", syncLocked: "on" }, ["878", "12", "878", "x"]);
    assert.ok(r.ok);
    assert.equal(r.value.title, "Interstellar");
    assert.equal(r.value.releaseDate, "2014-01-01");
    assert.equal(r.value.runtime, 169);
    assert.equal(r.value.originalLanguage, "en");
    assert.equal(r.value.trailerKey, "zSWdZVtXT7E");
    assert.deepEqual(r.value.genreIds, [878, 12]);
    assert.equal(r.value.syncLocked, true);
    assert.equal(r.value.overview, null);
  });
  it("rejects bad values with a clear message", () => {
    const bad = (f: Record<string, string>) => {
      const r = parseMovieInput({ ...base, ...f }, []);
      return r.ok ? null : r.error;
    };
    assert.equal(bad({ title: "" }), "Title is required.");
    assert.match(bad({ releaseDate: "14/11/2014" })!, /YYYY/);
    assert.match(bad({ runtime: "2h" })!, /Runtime/);
    assert.match(bad({ trailer: "https://vimeo.com/1" })!, /YouTube/);
    assert.match(bad({ posterUrl: "javascript:alert(1)" })!, /Poster/);
    assert.match(bad({ originalLanguage: "English" })!, /language/);
  });
});
