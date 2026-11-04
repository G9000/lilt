// Run: node --test e2e/settings-comparison.mjs. Starts and closes an isolated Vite server.
// Real React lifetimes and typing, with delayed API replies; no microphone or owner data.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { createServer } from "vite";

let server, browser;
before(async () => {
  server = await createServer({ server: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
  await server.listen();
  browser = await chromium.launch({ channel: "chrome", headless: true });
});
after(async () => { await browser?.close(); await server?.close(); });

async function fixture(t, view = "draft") {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  t.after(async () => { await page.close(); assert.deepEqual(errors, []); });
  await page.goto(`${server.resolvedUrls.local[0]}e2e/fixtures/settings-comparison.html`);
  await page.waitForFunction(() => !!window.regression);
  await page.evaluate((view) => window.regression.render(view), view);
  if (view === "draft") await page.waitForFunction(() => !!window.draft.p);
  return page;
}
const edit = (page, minutes) => page.evaluate((session_minutes) => window.draft.edit({ ...window.draft.p, session_minutes }), minutes);
const writes = (page, count) => page.waitForFunction((n) => window.regression.writes.length === n, count);
const renderPair = (page, a) => page.evaluate((a) => window.regression.render("compare", a, `${a}-b`), a);
const finishPair = (page, a) => page.evaluate((a) => window.regression.comparisons.get(a).resolve(), a);

test("an older save cannot mark a newer edit saved or discard it on leaving", async (t) => {
  const page = await fixture(t);
  await edit(page, 6);
  await writes(page, 1);
  await edit(page, 7);
  await page.evaluate(() => window.regression.writes[0].resolve());
  assert.equal(await page.locator("#save-state").textContent(), "saving");
  await page.evaluate(() => window.regression.clear());
  await writes(page, 2);
  assert.equal(await page.evaluate(() => window.regression.writes[1].profile.session_minutes), 7);
  await page.evaluate(() => window.regression.writes[1].resolve());
  assert.equal(await page.evaluate(() => window.regression.stored().session_minutes), 7);
});

test("overlapping edits are saved in order, including the final edit on leaving", async (t) => {
  const page = await fixture(t);
  await edit(page, 6);
  await writes(page, 1);
  await edit(page, 7);
  await page.waitForTimeout(700); // Let the second debounce expire while the first save is pending.
  assert.equal(await page.evaluate(() => window.regression.writes.length), 1);
  await edit(page, 8);
  await page.evaluate(() => window.regression.clear());
  await page.evaluate(() => window.regression.writes[0].resolve());
  await writes(page, 2);
  await page.evaluate(() => window.regression.writes[1].resolve());
  await writes(page, 3);
  await page.evaluate(() => window.regression.writes[2].resolve());
  assert.deepEqual(await page.evaluate(() => window.regression.writes.map(w => w.profile.session_minutes)), [6, 7, 8]);
  assert.equal(await page.evaluate(() => window.regression.stored().session_minutes), 8);
});

test("a failed older save does not replace a newer edit's status or block its save", async (t) => {
  const page = await fixture(t);
  await edit(page, 6);
  await writes(page, 1);
  await edit(page, 7);
  await page.evaluate(() => window.regression.writes[0].reject());
  assert.equal(await page.locator("#save-state").textContent(), "saving");
  await writes(page, 2);
  await page.evaluate(() => window.regression.writes[1].resolve());
  await page.waitForFunction(() => window.draft.saved === "saved");
  assert.equal(await page.evaluate(() => window.regression.stored().session_minutes), 7);
});

test("reopening settings waits for the previous draft to finish saving", async (t) => {
  const page = await fixture(t);
  await edit(page, 6);
  await writes(page, 1);
  await edit(page, 7);
  await page.evaluate(() => { window.regression.clear(); window.regression.render("draft"); });
  assert.equal(await page.evaluate(() => window.draft.p), null);
  await page.evaluate(() => window.regression.writes[0].resolve());
  await writes(page, 2);
  await page.evaluate(() => window.regression.writes[1].resolve());
  await page.waitForFunction(() => window.draft.p?.session_minutes === 7, null, { timeout: 3000 });
  await edit(page, 8);
  await writes(page, 3);
  await page.evaluate(() => window.regression.writes[2].resolve());
  await page.waitForFunction(() => window.draft.saved === "saved");
  assert.equal(await page.evaluate(() => window.regression.stored().session_minutes), 8);
});

test("qualities keep commas and spaces while typing and save separate entries", async (t) => {
  const page = await fixture(t, "settings");
  await page.locator("#desc").pressSequentially("soft, bright");
  assert.equal(await page.locator("#desc").inputValue(), "soft, bright");
  await page.evaluate(() => window.regression.clear());
  await writes(page, 1);
  assert.deepEqual(await page.evaluate(() => window.regression.writes[0].profile.goal.descriptors), ["soft", "bright"]);
});

test("changing pairs immediately clears old comparison results", async (t) => {
  const page = await fixture(t, "compare");
  await renderPair(page, "old");
  await finishPair(page, "old");
  await page.getByText("Comparison old / old-b", { exact: true }).waitFor();
  await renderPair(page, "new");
  assert.equal(await page.locator(".cmp-result").count(), 0);
  assert.equal(await page.getByText("Loading comparison…", { exact: true }).count(), 1);
});

test("late old replies cannot overwrite the current comparison", async (t) => {
  const page = await fixture(t, "compare");
  await renderPair(page, "old");
  await renderPair(page, "new");
  await finishPair(page, "new");
  await page.getByText("Comparison new / new-b", { exact: true }).waitFor();
  await finishPair(page, "old");
  await page.evaluate(() => { window.regression.analyses.get("old").resolve(); window.regression.analyses.get("old-b").resolve(); });
  assert.equal(await page.getByText("Comparison new / new-b", { exact: true }).count(), 1);
  assert.equal(await page.getByText("Comparison old / old-b", { exact: true }).count(), 0);
});

test("an old comparison error clears when selecting a new pair", async (t) => {
  const page = await fixture(t, "compare");
  await renderPair(page, "old");
  await page.evaluate(() => window.regression.comparisons.get("old").reject());
  await page.getByText("Comparison old failed", { exact: true }).waitFor();
  await renderPair(page, "new");
  await finishPair(page, "new");
  await page.getByText("Comparison new / new-b", { exact: true }).waitFor({ timeout: 3000 });
  assert.equal(await page.getByText("Comparison old failed", { exact: true }).count(), 0);
});

test("late old analysis replies cannot replace the current pair's pitch details", async (t) => {
  const page = await fixture(t, "compare");
  await renderPair(page, "old");
  await renderPair(page, "new");
  await finishPair(page, "new");
  await page.getByText("Comparison new / new-b", { exact: true }).waitFor();
  await page.evaluate(() => { window.regression.analyses.get("new").resolve(); window.regression.analyses.get("new-b").resolve(); });
  await page.waitForFunction(() => document.querySelector(".cmp-traces")?.textContent.includes("new analysis"));
  await page.evaluate(() => { window.regression.analyses.get("old").resolve(); window.regression.analyses.get("old-b").resolve(); });
  const traces = await page.locator(".cmp-traces").textContent();
  assert.ok(traces.includes("new analysis") && traces.includes("new-b analysis"));
  assert.ok(!traces.includes("old analysis"));
});
