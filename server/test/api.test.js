import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { app } from "../src/app.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test("liveness endpoint returns ok", async () => {
  const response = await fetch(`${baseUrl}/health/live`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    service: "rover-ai-api"
  });
});

test("system info exposes API version and active capabilities", async () => {
  const response = await fetch(`${baseUrl}/api/v1/system/info`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.apiVersion, "v1");
  assert.equal(body.component, "API Gateway");
  assert.equal(body.capabilities.authentication, "active");
});

test("unknown routes return a stable JSON 404", async () => {
  const response = await fetch(`${baseUrl}/api/v1/does-not-exist`);
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.error.code, "NOT_FOUND");
});

test("unapproved browser origins are rejected", async () => {
  const response = await fetch(`${baseUrl}/api/v1/system/info`, {
    headers: { Origin: "https://not-allowed.example" }
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, "ORIGIN_NOT_ALLOWED");
});