import assert from "node:assert/strict";
import { test } from "node:test";
import { canUseAdmin, canUseStudio, isRole } from "./roles.ts";

test("roles and what they allow", () => {
  assert.deepEqual([canUseStudio("user"), canUseStudio("editor"), canUseStudio("admin")], [false, true, true]);
  assert.deepEqual([canUseAdmin("user"), canUseAdmin("editor"), canUseAdmin("admin")], [false, false, true]);
});

test("only known roles are accepted", () => {
  assert.ok(isRole("editor"));
  for (const bad of ["Admin", "superuser", "", null, undefined, 1]) assert.equal(isRole(bad), false, String(bad));
});
