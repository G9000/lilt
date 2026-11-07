import test from "node:test";
import assert from "node:assert/strict";
import { createDataClient } from "./dataGeneration.ts";

const reply = (generation?: string) => new Response("{}", { headers: generation ? { "X-Lilt-Generation": generation } : {} });

test("loaded form data keeps its generation after a restore response arrives", async () => {
  const sent: (string | null)[] = [];
  let generation = "before";
  const client = createDataClient(async (_url, init) => {
    sent.push(new Headers(init?.headers).get("X-Lilt-Generation"));
    return reply(generation);
  });
  await client.fetch("/api/profile");
  generation = "after";
  await client.fetch("/api/profile");
  await client.fetch("/api/profile", { method: "PUT", body: "{}" });
  assert.equal(client.generation(), "before");
  assert.equal(sent.at(-1), "before");
});

test("a first mutation discovers the generation before sending any data", async () => {
  const sent: { url: string; generation: string | null }[] = [];
  const client = createDataClient(async (url, init) => {
    sent.push({ url: String(url), generation: new Headers(init?.headers).get("X-Lilt-Generation") });
    return reply("current");
  });
  await client.fetch("/api/sessions", { method: "POST" });
  assert.deepEqual(sent, [{ url: "/healthz", generation: null }, { url: "/api/sessions", generation: "current" }]);
});

test("buffered audio keeps its original generation, including legacy audio without one", async () => {
  const sent: (string | null)[] = [];
  const client = createDataClient(async (_url, init) => {
    sent.push(new Headers(init?.headers).get("X-Lilt-Generation"));
    return reply("restored");
  });
  await client.fetch("/api/profile");
  await client.fetch("/api/takes/t/chunks/0", { method: "PUT" }, "old-recording");
  await client.fetch("/api/takes/t/finalize", { method: "POST" }, null);
  assert.deepEqual(sent, [null, "old-recording", null]);
  assert.equal(client.generation(), "restored");
});

test("concurrent first mutations share one discovery and preserve other headers", async () => {
  let discoveries = 0;
  const client = createDataClient(async (url, init) => {
    if (url === "/healthz") { discoveries++; return reply("same"); }
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("X-Lilt-Generation"), "same");
    assert.equal(headers.get("content-type"), "application/json");
    return reply("same");
  });
  await Promise.all([1, 2].map(() => client.fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" } })));
  assert.equal(discoveries, 1);
});

test("a new reset marker blocks old-page writes without replacing its generation", async () => {
  let marker = "old";
  const observed: string[] = [];
  let writes = 0;
  const client = createDataClient(async (_url, init) => {
    if (init?.method === "POST") writes++;
    return new Response("{}", { headers: { "X-Lilt-Generation": marker, "X-Lilt-Reset": marker } });
  });
  client.watchReset("old", id => { observed.push(id); });
  await client.fetch("/api/profile");
  marker = "new";
  await client.fetch("/api/profile");
  await assert.rejects(client.fetch("/api/sessions", { method: "POST" }), /reset/);
  assert.equal(client.generation(), "old");
  assert.deepEqual(observed, ["new"]);
  assert.equal(writes, 0);
});

test("reconnecting after offline startup detects reset before sending the first mutation", async () => {
  const urls: string[] = [];
  const client = createDataClient(async url => {
    urls.push(String(url));
    return new Response("{}", { headers: { "X-Lilt-Generation": "fresh", "X-Lilt-Reset": "fresh" } });
  });
  client.watchReset(null, () => {});
  await assert.rejects(client.fetch("/api/profile", { method: "PUT", body: "{}" }), /reset/);
  assert.deepEqual(urls, ["/healthz"]);
});
