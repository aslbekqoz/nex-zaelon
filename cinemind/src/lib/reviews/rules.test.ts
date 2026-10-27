import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeReview, reviewError } from "./rules.ts";

test("reviews are tidied without losing paragraphs", () => {
  assert.equal(normalizeReview("  First line.   \r\n\r\n\r\n\r\nSecond\tparagraph.\t \n"), "First line.\n\nSecond\tparagraph.");
  assert.equal(normalizeReview("a\nb"), "a\nb");
});

test("length and character rules", () => {
  assert.equal(reviewError("Too short."), "Write at least 20 characters.");
  assert.equal(reviewError("A good, tense thriller.\nWorth it."), null);
  assert.match(reviewError("x".repeat(4001)) ?? "", /under 4000 characters \(now 4001\)/);
  assert.equal(reviewError("o'zbekcha sharh: juda yaxshi film!"), null);
  assert.equal(reviewError("🎬".repeat(20)), null, "counts characters, not UTF-16 units");
  assert.equal(reviewError("Loved it as a developer 👨‍💻 and a fan 👨‍👩‍👧"), null, "emoji joiners are allowed");
  assert.match(reviewError("Great film, really great‮evil") ?? "", /invisible/);
  assert.match(reviewError("Great film, really great\u0007!") ?? "", /invisible/);
  assert.match(reviewError("Great film, really great​!") ?? "", /invisible/);
});
