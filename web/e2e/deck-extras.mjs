// End-to-end test of Today's daily warm-up and cool-down, an eyes-off take, and the before-and-after,
// with Chrome's fake microphone (e2e/fake-mic.wav). Run it against a fresh data folder whose
// cards/state.json has `text.warmup.lip-trill` as a well-known review (reps 3, due), and pass the
// data folder so the test can age a "before" take by three weeks.
//
// Usage: LILT_URL=http://127.0.0.1:7979 LILT_DATA_DIR=/tmp/lilt-e2e node e2e/deck-extras.mjs

import { chromium } from "playwright-core";
import path from "node:path";
import fs from "node:fs";

const BASE = process.env.LILT_URL ?? "http://127.0.0.1:7979";
const DATA = process.env.LILT_DATA_DIR;
const wav = path.resolve(path.dirname(new URL(import.meta.url).pathname), "fake-mic.wav");

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };

async function record(page, seconds = 2.5, during) {
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.getByRole("button", { name: "Stop recording" }).waitFor();
  await page.waitForTimeout(seconds * 1000);
  if (during) await during();
  await page.getByRole("button", { name: "Stop recording" }).click();
}

/** Every saved take.json in the data folder. */
function takeFiles() {
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === "take.json") out.push(p); } };
  walk(path.join(DATA, "sessions"));
  return out.map((f) => ({ f, t: JSON.parse(fs.readFileSync(f, "utf8")) }));
}

async function main() {
  if (!DATA) throw new Error("Set LILT_DATA_DIR to the server's data folder.");
  const browser = await chromium.launch({
    channel: "chrome", headless: true, ignoreDefaultArgs: ["--headless=old"],
    args: ["--headless=new", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wav}`, "--autoplay-policy=no-user-gesture-required"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["microphone"], colorScheme: "light" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // A first visit: sitting down (Enter in the room) opens Start here, not Today.
  await page.goto(`${BASE}/#/`);
  await page.waitForTimeout(1500);
  await page.keyboard.press("Enter");
  await page.waitForURL(/#\/studio\/start-here/, { timeout: 8000 }).then(() => check("a first visit sits down at Start here", true), () => check("a first visit sits down at Start here", false, page.url()));

  // Today opens with the warm-up and closes with the cool-down.
  await page.goto(`${BASE}/#/deck`);
  await page.locator(".ve-item").first().waitFor({ timeout: 15000 });
  const kinds = await page.locator(".ve-items .ve-kind").allInnerTexts();
  check("the warm-up opens today's cards", /Warm-up/.test(kinds[0]), kinds[0]);
  check("the cool-down closes them", /Cool-down/.test(kinds[kinds.length - 1]), kinds[kinds.length - 1]);

  // The warm-up comes every day: no "Again", and no "next in…".
  await page.locator(".ve-item.on").filter({ hasText: "Warm-up" }).waitFor();
  await record(page);
  await page.getByText("How did that feel?").waitFor({ timeout: 15000 });
  check("a daily card offers no Again", (await page.getByRole("button", { name: /^Again/ }).count()) === 0);
  await page.getByRole("button", { name: "Good", exact: true }).click();
  await page.waitForFunction(() => !document.body.innerText.includes("How did that feel?"), null, { timeout: 8000 });

  // "Again" on a new card comes back before the cool-down, which still closes the day.
  await page.goto(`${BASE}/#/deck?card=${encodeURIComponent("text.warmup.hum-to-hello")}`);
  await page.locator(".ve-item.on").filter({ hasText: "New card" }).waitFor({ timeout: 15000 });
  await record(page);
  await page.getByRole("button", { name: /^Again,/ }).click();
  await page.waitForFunction(() => !document.body.innerText.includes("How did that feel?"), null, { timeout: 8000 });
  const kindsAfter = await page.locator(".ve-items .ve-kind").allInnerTexts();
  check("Again lands before the cool-down", /Cool-down/.test(kindsAfter[kindsAfter.length - 1]) && kindsAfter.some((k) => /Again/.test(k)), kindsAfter.join(" | "));

  // An eyes-off review: no line or numbers while recording, rate first, then the pitch.
  await page.goto(`${BASE}/#/deck?card=${encodeURIComponent("text.warmup.lip-trill")}`);
  await page.locator(".ve-item.on").filter({ hasText: "Eyes off" }).waitFor({ timeout: 15000 });
  check("the well-known card is marked eyes off", true);
  await record(page, 2.5, async () => {
    check("while recording, the line and numbers are hidden", await page.locator(".ve-dock.eyes-off .ve-eyes").isVisible()
      && await page.locator(".ve-dock .ve-stats").evaluate((e) => getComputedStyle(e).visibility === "hidden"));
  });
  await page.getByText("How did that feel?").waitFor({ timeout: 15000 });
  check("rating comes before the pitch", await page.getByText("An eyes-off take").isVisible() && (await page.locator(".ve-item.on .tr-pitch").count()) === 0);
  await page.getByRole("button", { name: /^Good,/ }).click();
  await page.getByText("Here's what the pitch did").waitFor({ timeout: 8000 });
  await page.locator(".ve-item.on .tr-pitch").waitFor({ timeout: 60000 });
  check("after rating, the pitch is revealed", true);
  await page.getByRole("button", { name: "Next card" }).click();
  await page.waitForFunction(() => !document.body.innerText.includes("Here's what the pitch did"), null, { timeout: 8000 });
  check("and Next card carries on", true);

  // Before and after: record a "before" text, age it three weeks, and it comes back in Today.
  await page.goto(`${BASE}/#/studio/start-here/baseline-read`);
  await page.locator(".ve-item.on").waitFor();
  await record(page);
  await page.locator(".ve-item.on .ve-take").first().waitFor({ timeout: 60000 });
  const before = takeFiles().find((x) => x.t.prompt_id === "text.start-here.baseline-read");
  check("the before take is saved", !!before);
  before.t.created_utc = new Date(Date.now() - 43 * 864e5).toISOString();
  fs.writeFileSync(before.f, JSON.stringify(before.t, null, 2));
  await page.goto(`${BASE}/#/deck?card=${encodeURIComponent("text.start-here.baseline-read")}`);
  await page.locator(".ve-item.on").filter({ hasText: "Before and after" }).waitFor({ timeout: 15000 });
  check("six weeks later it's in Today as a before-and-after", true);
  await record(page);
  await page.getByText("Your first take,").waitFor({ timeout: 15000 });
  check("the first take plays beside the new one", (await page.locator(".ve-ba .prc-player").count()) === 2);
  for (const [i, n] of [[0, "4"], [1, "3"], [2, "2"]]) await page.locator(".ve-ba-q").nth(i).getByRole("button", { name: n, exact: true }).click();
  await page.getByRole("button", { name: "Save and carry on" }).click();
  await page.waitForFunction(() => !document.body.innerText.includes("Save and carry on"), null, { timeout: 8000 });
  const after = takeFiles().filter((x) => x.t.prompt_id === "text.start-here.baseline-read").sort((a, b) => a.t.created_utc.localeCompare(b.t.created_utc)).pop();
  const answers = after?.t.self_report?.answers ?? {};
  check("the three answers are kept with the take", answers.satisfied === "4" && answers.like_me === "3" && answers.ease === "2", JSON.stringify(answers));

  // "It hurts" pauses everything, and the same page offers the way back.
  await page.goto(`${BASE}/#/deck`);
  await page.locator(".ve-item.on").waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "It hurts or feels strained" }).click();
  await page.getByRole("heading", { name: "Let's stop here" }).waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "I feel fine, resume" }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor({ timeout: 8000 });
  check("after it hurt, Resume brings the cards back", (await page.locator(".ve-item.on").count()) === 1);

  check("no page errors", errors.length === 0, errors.join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
