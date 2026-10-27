import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAccountExport, exportFilename, type ExportSource } from "./export-format.ts";

const d = (s: string) => new Date(s);
const source: ExportSource = {
  user: { name: "Ada", email: "ada@example.com", role: "user", createdAt: d("2026-01-02T03:04:05Z"), emailVerifiedAt: d("2026-01-02T04:00:00Z"), onboardedAt: null },
  favouriteGenres: ["Drama", "Sci-Fi"],
  watchlist: [{ movieId: 7, title: "Arrival", titleUz: "Kelish", year: 2016, watched: true, addedAt: d("2026-02-01T00:00:00Z") }],
  ratings: [{ movieId: 9, title: "Heat", titleUz: null, year: null, rating: 9, ratedAt: d("2026-03-01T00:00:00Z") }],
  pendingEmailChange: null,
  sessions: [{ userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0", createdAt: d("2026-04-01T00:00:00Z"), lastSeenAt: d("2026-04-02T00:00:00Z"), expiresAt: d("2026-05-01T00:00:00Z") }],
  avatar: { contentType: "image/webp", updatedAt: d("2026-04-02T00:00:00Z"), image: new Uint8Array([1, 2, 3]) },
  reviews: [{ movieId: 9, title: "Heat", body: "Tense and brilliant.", spoilers: true, hidden: false, createdAt: d("2026-03-02T00:00:00Z"), updatedAt: d("2026-03-02T00:00:00Z") }],
  activity: [
    { action: "auth.name_changed", createdAt: d("2026-04-03T00:00:00Z"), details: { from: "A", to: "Ada" } },
    { action: "auth.logout", createdAt: d("2026-04-04T00:00:00Z"), details: {} },
  ],
};

test("the export holds the user's data with ISO dates and absolute movie links", () => {
  const out = buildAccountExport(source, { base: "https://cinemind.uz", exportedAt: d("2026-10-27T12:00:00Z") });
  assert.equal(out.exportedAt, "2026-10-27T12:00:00.000Z");
  assert.deepEqual(out.account, {
    name: "Ada", email: "ada@example.com", emailConfirmedAt: "2026-01-02T04:00:00.000Z", role: "user",
    createdAt: "2026-01-02T03:04:05.000Z", onboardedAt: null, pendingEmailChange: null,
  });
  assert.deepEqual(out.favouriteGenres, ["Drama", "Sci-Fi"]);
  assert.deepEqual(out.watchlist[0], { title: "Arrival", titleUz: "Kelish", year: 2016, watched: true, addedAt: "2026-02-01T00:00:00.000Z", url: "https://cinemind.uz/movies/7" });
  assert.equal(out.ratings[0].rating, 9);
  assert.equal(out.ratings[0].url, "https://cinemind.uz/movies/9");
  assert.equal(out.profilePicture?.dataBase64, "AQID");
  assert.deepEqual(out.reviews, [{
    title: "Heat", review: "Tense and brilliant.", containsSpoilers: true, hiddenByModerator: false,
    writtenAt: "2026-03-02T00:00:00.000Z", updatedAt: "2026-03-02T00:00:00.000Z", url: "https://cinemind.uz/movies/9",
  }]);
  assert.deepEqual(out.signedInSessions, [{
    device: "Firefox on Linux", userAgent: source.sessions[0].userAgent, signedInAt: "2026-04-01T00:00:00.000Z",
    lastActiveAt: "2026-04-02T00:00:00.000Z", expiresAt: "2026-05-01T00:00:00.000Z",
  }]);
  assert.deepEqual(out.activity[0].details, { from: "A", to: "Ada" });
  assert.ok(!("details" in out.activity[1]));
});

test("never includes secrets, and links stay relative without a public address", () => {
  const out = buildAccountExport({ ...source, avatar: null }, { base: null, exportedAt: d("2026-10-27T12:00:00Z") });
  assert.equal(out.watchlist[0].url, "/movies/7");
  assert.equal(out.profilePicture, null);
  const keys = JSON.stringify(out, (k, v) => (k === "about" ? undefined : v));
  assert.doesNotMatch(keys, /password|token|hash/i);
});

test("the file name carries the export date", () => {
  assert.equal(exportFilename(d("2026-10-27T23:59:00Z")), "cinemind-data-2026-10-27.json");
});
