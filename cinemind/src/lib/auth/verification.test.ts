import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyEmailMessage } from "../email/templates.ts";
import { mustConfirmEmail, verificationMode, verifyProblem } from "./verification.ts";

describe("verifyProblem", () => {
  const now = new Date("2026-10-27T12:00:00Z");
  const ok = { expiresAt: new Date("2026-10-28T12:00:00Z"), usedAt: null, linkEmail: "Ada@Example.com", currentEmail: "ada@example.com" };
  it("accepts a fresh link for the current address (case-insensitive)", () => assert.equal(verifyProblem(ok, now), null));
  it("rejects missing, used, expired and changed-address links", () => {
    assert.match(verifyProblem(null, now)!, /invalid/);
    assert.match(verifyProblem({ ...ok, usedAt: now }, now)!, /already been used/);
    assert.match(verifyProblem({ ...ok, expiresAt: now }, now)!, /expired/);
    assert.match(verifyProblem({ ...ok, currentEmail: "new@example.com" }, now)!, /different email/);
  });
});

describe("verifyEmailMessage", () => {
  it("includes the link and escapes the name", () => {
    const e = verifyEmailMessage({ name: "<b>Bo</b>", link: "https://cinemind.example/verify-email?token=abc", hours: 48 });
    assert.equal(e.subject, "Confirm your email for CineMind AI");
    assert.match(e.text, /verify-email\?token=abc/);
    assert.match(e.text, /expires in 48 hours/);
    assert.match(e.html, /Hi &lt;b&gt;Bo&lt;\/b&gt;/);
    assert.match(e.text, /\n\nhttps:\/\/cinemind\.example/);
  });
});

describe("verification mode", () => {
  it("is required unless explicitly optional", () => {
    assert.equal(verificationMode(undefined), "required");
    assert.equal(verificationMode(""), "required");
    assert.equal(verificationMode("yes"), "required");
    assert.equal(verificationMode(" Optional "), "optional");
  });
  it("only blocks unconfirmed users in required mode", () => {
    assert.equal(mustConfirmEmail({ emailVerified: false }, "required"), true);
    assert.equal(mustConfirmEmail({ emailVerified: true }, "required"), false);
    assert.equal(mustConfirmEmail({ emailVerified: false }, "optional"), false);
  });
});
