// Run: node e2e/feedback.mjs (starts and closes its own local Vite server).
// Synthetic analysis, no microphone or user recordings. Exercises real React component lifetimes.
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({ server: { host: "127.0.0.1", port: 0, strictPort: false }, logLevel: "error" });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}e2e/fixtures/feedback.html`);
  await page.waitForFunction(() => !!window.feedbackTest);
  await page.evaluate(() => window.feedbackTest.render("first"));
  await page.locator("#insight .prc-insight").waitFor();
  await page.locator("#result .tr-head").waitFor();
  await page.locator("#resonance .rz").waitFor();
  await page.locator("#scale .pscale").waitFor();
  await page.evaluate(() => window.feedbackTest.render("second"));
  const stale = await page.evaluate(() => ({
    insight: !!document.querySelector("#insight .prc-insight"),
    result: !!document.querySelector("#result .tr-head"),
    resonance: !!document.querySelector("#resonance .rz"),
  }));
  assert.deepEqual(stale, { insight: false, result: false, resonance: false }, "switching takes must immediately clear every old measurement");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("lilt:pitch-scale", { detail: false })));
  await page.waitForFunction(() => !document.querySelector("#scale .pscale"));
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("lilt:pitch-scale", { detail: true })));
  await page.locator("#scale .pscale").waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS: take switches clear pitch, suggestions and resonance; scale setting updates mounted views.");
} finally {
  await browser?.close();
  await server.close();
}
