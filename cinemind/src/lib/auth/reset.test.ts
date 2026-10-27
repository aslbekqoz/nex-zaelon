import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { passwordResetEmail } from "../email/templates.ts";
import { passwordError } from "./password.ts";
import { looksLikeToken, resetProblem } from "./reset-token.ts";

describe("passwordError", () => {
  it("enforces length and confirmation", () => {
    assert.equal(passwordError("short"), "Password must be at least 8 characters.");
    assert.equal(passwordError("long enough"), null);
    assert.equal(passwordError("long enough", "different"), "The two passwords don't match.");
    assert.equal(passwordError("long enough", "long enough"), null);
  });
  it("counts bytes for the bcrypt limit", () => {
    assert.equal(passwordError("a".repeat(72)), null);
    assert.match(passwordError("ö".repeat(40))!, /at most 72/); // 80 bytes
  });
});

describe("resetProblem", () => {
  const now = new Date("2026-10-27T12:00:00Z");
  const later = new Date("2026-10-27T13:00:00Z");
  const ok = { expiresAt: later, usedAt: null, userDisabled: false };
  it("accepts a fresh, unused token", () => assert.equal(resetProblem(ok, now), null));
  it("rejects missing, used, expired and disabled", () => {
    assert.match(resetProblem(null, now)!, /invalid/);
    assert.match(resetProblem({ ...ok, usedAt: now }, now)!, /already been used/);
    assert.match(resetProblem({ ...ok, expiresAt: now }, now)!, /expired/);
    assert.match(resetProblem({ ...ok, userDisabled: true }, now)!, /disabled/);
  });
  it("checks token shape before any lookup", () => {
    assert.equal(looksLikeToken("A".repeat(43)), true);
    assert.equal(looksLikeToken("A".repeat(42)), false);
    assert.equal(looksLikeToken("x' OR 1=1 --" + "A".repeat(31)), false);
    assert.equal(looksLikeToken(undefined), false);
  });
});

describe("passwordResetEmail", () => {
  it("includes the link and escapes HTML", () => {
    const e = passwordResetEmail({ name: "<Ada>", link: "https://cinemind.example/reset-password?token=abc&x=1", minutes: 60 });
    assert.equal(e.subject, "Reset your CineMind AI password");
    assert.match(e.text, /https:\/\/cinemind\.example\/reset-password\?token=abc&x=1/);
    assert.match(e.text, /expires in 60 minutes/);
    assert.match(e.html, /Hi &lt;Ada&gt;/);
    assert.match(e.html, /href="https:\/\/cinemind\.example\/reset-password\?token=abc&amp;x=1"/);
    assert.doesNotMatch(e.html, /<Ada>/);
  });
  it("describes long windows in hours", () => {
    assert.match(passwordResetEmail({ name: "A", link: "https://x", minutes: 1440 }).text, /expires in 24 hours/);
  });
});
