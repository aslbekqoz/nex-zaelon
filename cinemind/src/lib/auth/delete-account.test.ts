import assert from "node:assert/strict";
import { test } from "node:test";
import { accountDeletedNotice } from "../email/templates.ts";
import { deleteAccountError } from "./delete-account.ts";

test("account deletion needs the password and the typed confirmation", () => {
  assert.equal(deleteAccountError("", "DELETE"), "Enter your current password.");
  assert.equal(deleteAccountError("secret123", ""), "Type DELETE to confirm.");
  assert.equal(deleteAccountError("secret123", "delet"), "Type DELETE to confirm.");
  assert.equal(deleteAccountError("secret123", "yes"), "Type DELETE to confirm.");
  assert.equal(deleteAccountError("secret123", "DELETE"), null);
  assert.equal(deleteAccountError("secret123", "  delete "), null);
});

test("the goodbye email names the account and escapes HTML", () => {
  const mail = accountDeletedNotice({ name: "<Ada>" });
  assert.match(mail.subject, /deleted/);
  assert.match(mail.text, /Hi <Ada>,/);
  assert.match(mail.html, /Hi &lt;Ada&gt;,/);
  assert.doesNotMatch(mail.html, /<Ada>/);
});
