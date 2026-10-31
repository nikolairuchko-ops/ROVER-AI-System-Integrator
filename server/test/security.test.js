import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, createSessionToken, hashSessionToken } from "../src/security.js";

test("password hashes are salted and verify only the correct password", async () => {
  const first = await hashPassword("correct horse battery");
  const second = await hashPassword("correct horse battery");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct horse battery", first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
});

test("session tokens are random and only their digest is stored", () => {
  const first = createSessionToken();
  const second = createSessionToken();
  assert.notEqual(first, second);
  assert.equal(first.length >= 40, true);
  assert.equal(hashSessionToken(first).length, 64);
  assert.notEqual(hashSessionToken(first), first);
});
