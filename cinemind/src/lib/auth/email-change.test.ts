import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emailChangeConfirmMessage, emailChangeNotice } from "../email/templates.ts";
import { emailChangeProblem, maskEmail, newEmailError, normalizeEmail } from "./email-change.ts";

describe("newEmailError", () => {
  it("validates format and rejects the current address", () => {
    assert.equal(newEmailError("a@example.com", "b@example.com"), null);
    assert.match(newEmailError("a@example.com", "not-an-email")!, /valid email/);
    assert.match(newEmailError("a@example.com", " A@Example.com ".trim())!, /already your email/);
    assert.equal(normalizeEmail("  Nodira@Example.COM "), "nodira@example.com");
  });
});

describe("maskEmail", () => {
  it("hides the local part", () => {
    assert.equal(maskEmail("nodira@example.com"), "n***@example.com");
    assert.equal(maskEmail("x@y.uz"), "x***@y.uz");
    assert.equal(maskEmail("broken"), "***");
  });
});

describe("emailChangeProblem", () => {
  const now = new Date("2026-10-27T12:00:00Z");
  const ok = { expiresAt: new Date("2026-10-28T12:00:00Z"), usedAt: null, cancelledAt: null, oldEmail: "a@example.com", currentEmail: "A@example.com" };
  it("accepts a fresh request", () => assert.equal(emailChangeProblem(ok, now), null));
  it("rejects missing, used, cancelled, expired and out-of-date requests", () => {
    assert.match(emailChangeProblem(null, now)!, /invalid/);
    assert.match(emailChangeProblem({ ...ok, usedAt: now }, now)!, /already been confirmed/);
    assert.match(emailChangeProblem({ ...ok, cancelledAt: now }, now)!, /cancelled/);
    assert.match(emailChangeProblem({ ...ok, expiresAt: now }, now)!, /expired/);
    assert.match(emailChangeProblem({ ...ok, currentEmail: "other@example.com" }, now)!, /out of date/);
  });
});

describe("email change messages", () => {
  it("confirmation goes to the new address with the link", () => {
    const m = emailChangeConfirmMessage({ name: "Ada", newEmail: "new@example.com", link: "https://x/confirm-email-change?token=t", hours: 24 });
    assert.equal(m.subject, "Confirm your new email for CineMind AI");
    assert.match(m.text, /new@example\.com/);
    assert.match(m.text, /confirm-email-change\?token=t/);
  });
  it("notices to the old address mask the new one and link to password reset", () => {
    const r = emailChangeNotice({ name: "<Ada>", maskedNewEmail: "n***@example.com", stage: "requested", resetUrl: "https://x/forgot-password" });
    assert.equal(r.subject, "Email change requested for your CineMind AI account");
    assert.match(r.text, /n\*\*\*@example\.com/);
    assert.match(r.html, /Hi &lt;Ada&gt;/);
    assert.match(r.html, /href="https:\/\/x\/forgot-password"/);
    const c = emailChangeNotice({ name: "Ada", maskedNewEmail: "n***@example.com", stage: "completed", resetUrl: "https://x/forgot-password" });
    assert.equal(c.subject, "Your CineMind AI email address was changed");
  });
});
