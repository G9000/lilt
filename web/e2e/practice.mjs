// End-to-end test of the Practice window with Chrome's fake microphone (fed by e2e/fake-mic.wav,
// macOS `say` synthetic speech): the first run, Home, free recording, a chapter text, a Today card,
// and the phone layout. It exercises the real recorder, upload and analysis. It is NOT a real
// microphone test. Run it against a fresh data folder, since the first run expects no range yet.
//
// Usage: LILT_URL=http://127.0.0.1:7979 node e2e/practice.mjs [screenshot-dir]

import { chromium } from "playwright-core";
import path from "node:path";
import fs from "node:fs";

const BASE = process.env.LILT_URL ?? "http://127.0.0.1:7979";
const shots = process.argv[2] ?? null;
const wav = path.resolve(path.dirname(new URL(import.meta.url).pathname), "fake-mic.wav");
if (shots) fs.mkdirSync(shots, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };
const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`) }); };

/** Record for a moment with the docked recorder, then stop. */
async function record(page, seconds = 2.5) {
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.getByRole("button", { name: "Stop recording" }).waitFor();
  await page.waitForTimeout(seconds * 1000);
  await page.getByRole("button", { name: "Stop recording" }).click();
}

async function unlocked(page) {
  for (let i = 0; i < 100; i++) {
    const held = await page.evaluate(async () => (await navigator.locks.query()).held.some((l) => l.name === "lilt-recording"));
    if (!held) return;
    await page.waitForTimeout(50);
  }
  throw new Error("Recording lock wasn't released within five seconds.");
}

async function main() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    ignoreDefaultArgs: ["--headless=old"],
    args: ["--headless=new", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wav}`, "--autoplay-policy=no-user-gesture-required"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["microphone"], colorScheme: "light" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Home: a new voice is asked to start.
  await page.goto(`${BASE}/#/studio`);
  await page.locator(".ve-start-card").waitFor({ timeout: 15000 });
  check("home shows the start card for a new voice", true);

  // First run: one take, then the range is offered and saved.
  await page.getByRole("button", { name: "Find my starting voice" }).click();
  await page.getByRole("heading", { name: "Find your starting voice" }).waitFor();
  await record(page, 3);
  await page.locator(".prc-insight").first().waitFor({ timeout: 60000 });
  check("starting-voice take gets a note in words", (await page.locator(".prc-insight .n").first().innerText()).length > 0);
  await page.getByRole("button", { name: "Use this as my range" }).click();
  await page.getByText("You're all set.").waitFor();
  const profile = await page.evaluate(() => fetch("/api/profile").then((r) => r.json()));
  check("the comfortable range is saved", Array.isArray(profile.comfort_range_hz), JSON.stringify(profile.comfort_range_hz));
  await shot(page, "1-start");

  // Home again: your practice instead of the start card.
  await page.getByRole("button", { name: "Back to Home" }).click();
  await page.locator(".ve-practice").waitFor({ timeout: 10000 });
  check("home shows your practice", /1 day of practice this month/.test(await page.locator(".ve-days").innerText()));
  check("start card is gone once a range is set", (await page.locator(".ve-start-card").count()) === 0);
  check("Home has no recorder: free talk lives in Studio", (await page.locator(".ve-dock").count()) === 0);

  // Free recording in Studio: the result shows in the page, under "Your take"; the recorder stays a small floating pill.
  await page.goto(`${BASE}/#/studio/free`);
  await page.getByRole("heading", { name: "Studio" }).waitFor();
  await record(page);
  await page.locator(".ve-free .prc-insight").waitFor({ timeout: 60000 });
  check("a free take's summary shows in the page", true);
  check("the recorder sits in the page, not floating over it", await page.locator(".ve-dock").evaluate((e) => getComputedStyle(e).position !== "absolute"));
  await shot(page, "2-free");

  // A competing tab must show a retryable recording warning, without an empty save attempt.
  const peer = await ctx.newPage();
  peer.on("pageerror", (e) => errors.push(e.message));
  await peer.goto(`${BASE}/#/studio/free`);
  await peer.getByRole("button", { name: "Start recording" }).waitFor();
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.getByRole("button", { name: "Stop recording" }).waitFor();
  await peer.getByRole("button", { name: "Start recording" }).click();
  await peer.getByRole("alert").filter({ hasText: "Lilt is already recording" }).waitFor();
  check("another tab explains why recording was refused", true);
  check("a refused start keeps Record available and offers no empty save", await peer.getByRole("button", { name: "Start recording" }).isEnabled() && await peer.getByRole("button", { name: "Retry saving" }).count() === 0);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await page.locator(".ve-state.saved").waitFor({ state: "attached" });
  await record(peer, 1);
  await peer.locator(".ve-state.saved").waitFor({ state: "attached" });
  check("the refused tab can record and save after the first stops", true);
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.getByRole("button", { name: "Stop recording" }).waitFor();
  await page.goto(`${BASE}/#/studio/warmup`); // Hash navigation unmounts the recorder without closing the tab.
  await unlocked(page);
  await record(peer, 1);
  await peer.locator(".ve-state.saved").waitFor({ state: "attached" });
  check("leaving a recorder finishes its take and releases the lock", true);
  await peer.close();

  // A chapter: its first text is up straight away (Record always records a text); pick text 1 from the tree and record it.
  await page.goto(`${BASE}/#/studio/warmup`);
  await page.locator(".ve-item").first().waitFor();
  check("a chapter opens with its first text up", (await page.locator(".ve-item.on").count()) === 1);
  await page.locator(".ve-file").filter({ hasText: "mmmmmmm" }).first().click();
  await page.locator(".ve-item.on").waitFor();
  check("the tree opens a text and the address follows", page.url().endsWith("/#/studio/warmup/hum"));
  await record(page);
  await page.locator(".ve-item.on .ve-take .prc-insight").waitFor({ timeout: 60000 });
  check("a chapter take shows under its text with a note", true);
  await shot(page, "3-chapter");

  // Today: the first card is up straight away; record, rate.
  await page.goto(`${BASE}/#/deck`);
  await page.locator(".ve-item").first().waitFor();
  check("today opens with its first card up", (await page.locator(".ve-item.on").count()) === 1);
  await page.locator(".ve-item:not(.done)").first().click();
  await page.locator(".ve-item.on").waitFor();
  await record(page);
  await page.getByText("How did that feel?").waitFor({ timeout: 15000 });
  await page.locator(".ve-item.on .tr-pitch").waitFor({ timeout: 60000 });
  await page.locator(".ve-item.on .tr-pitch").scrollIntoViewIfNeeded();
  await shot(page, "3b-rate");
  check("the take's pitch line shows, ready to play", await page.locator(".ve-item.on .tr-chart canvas").isVisible());
  await shot(page, "3c-rate-line");
  await page.getByRole("button", { name: /^Good,/ }).click();
  await page.waitForFunction(() => !document.body.innerText.includes("How did that feel?"), null, { timeout: 8000 });
  check("a card is recorded and rated", true);

  // Layout: hide the sidebar and bring it back.
  // The sidebar slides closed and open (about a third of a second), so wait for it to settle.
  await page.getByRole("button", { name: "Hide sidebar" }).click();
  check("the sidebar hides", await page.locator(".ve-side").waitFor({ state: "hidden", timeout: 2000 }).then(() => true, () => false));
  await page.getByRole("button", { name: "Show sidebar" }).click();
  check("and comes back", await page.locator(".ve-side").waitFor({ state: "visible", timeout: 2000 }).then(() => true, () => false));

  // Phone: the idle recorder is one slim bar; the graph opens only while recording.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/#/studio/automatic/days`);
  await page.locator(".ve-dock.idle").waitFor();
  check("phone: idle recorder hides the graph", !(await page.locator(".ve-scope").isVisible()));
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.getByRole("button", { name: "Stop recording" }).waitFor();
  check("phone: the graph opens while recording", await page.locator(".ve-scope").isVisible());
  await shot(page, "4-phone-recording");
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Stop recording" }).click();

  check("no page errors", errors.length === 0, errors.join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
