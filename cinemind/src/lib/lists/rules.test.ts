import assert from "node:assert/strict";
import { test } from "node:test";
import { listDescriptionError, listTitleError, moveItem, normalizeListDescription, normalizeListTitle } from "./rules.ts";

test("titles", () => {
  assert.equal(normalizeListTitle("  Top   10\tsci-fi "), "Top 10 sci-fi");
  assert.equal(listTitleError("Top 10 sci-fi"), null);
  assert.equal(listTitleError("Eng yaxshi o'zbek filmlari 🎬"), null);
  assert.match(listTitleError("A") ?? "", /2–80/);
  assert.match(listTitleError("x".repeat(81)) ?? "", /2–80/);
  assert.match(listTitleError("Top‮evil") ?? "", /invisible/);
});

test("descriptions", () => {
  assert.equal(normalizeListDescription("Line one.  \r\n\r\n\r\nLine two.\n"), "Line one.\n\nLine two.");
  assert.equal(listDescriptionError(""), null);
  assert.equal(listDescriptionError("Two\nlines"), null);
  assert.match(listDescriptionError("x".repeat(501)) ?? "", /500/);
  assert.match(listDescriptionError("zero​width") ?? "", /invisible/);
});

test("moving items", () => {
  assert.deepEqual(moveItem([1, 2, 3], 2, "up"), [2, 1, 3]);
  assert.deepEqual(moveItem([1, 2, 3], 2, "down"), [1, 3, 2]);
  assert.equal(moveItem([1, 2, 3], 1, "up"), null);
  assert.equal(moveItem([1, 2, 3], 3, "down"), null);
  assert.equal(moveItem([1, 2, 3], 9, "up"), null);
});
