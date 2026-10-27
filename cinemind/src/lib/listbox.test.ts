import assert from "node:assert/strict";
import { test } from "node:test";
import { moveActive } from "./listbox.ts";

test("arrow keys walk the list and wrap through 'nothing highlighted'", () => {
  assert.deepEqual([moveActive(-1, 1, 3), moveActive(0, 1, 3), moveActive(2, 1, 3)], [0, 1, -1]);
  assert.deepEqual([moveActive(-1, -1, 3), moveActive(0, -1, 3), moveActive(2, -1, 3)], [2, -1, 1]);
  assert.equal(moveActive(5, 1, 0), -1);
});
