import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nameError, normalizeName } from "./name.ts";

describe("display name", () => {
  it("normalises whitespace", () => {
    assert.equal(normalizeName("  Ada \t  Lovelace \n"), "Ada Lovelace");
  });
  it("enforces length in characters, not bytes", () => {
    assert.equal(nameError("Al"), null);
    assert.match(nameError("A")!, /2–60/);
    assert.equal(nameError("Ш".repeat(60)), null);
    assert.match(nameError("a".repeat(61))!, /2–60/);
    assert.equal(nameError("Nodira O'ktamova"), null);
  });
  it("rejects invisible and control characters", () => {
    assert.match(nameError("Ada‮ecalevol")!, /invisible/);
    assert.match(nameError("Ada​Love")!, /invisible/);
    assert.match(nameError("Ada\u0007")!, /invisible/);
  });
});
