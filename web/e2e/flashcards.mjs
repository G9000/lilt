// End-to-end test of Flashcards, with Chrome's fake microphone (e2e/fake-mic.wav): the widget in
// the room opens the app, read cards swipe, a text's card won't swipe until it has a take, the take
// is saved like any other, Undo puts a card back, and where you got to survives a reload.
//
// Usage: LILT_URL=http://127.0.0.1:7979 node e2e/flashcards.mjs

import { chromium } from "playwright-core";
import path from "node:path";

const BASE = process.env.LILT_URL ?? "http://127.0.0.1:7979";
const wav = path.resolve(path.dirname(new URL(import.meta.url).pathname), "fake-mic.wav");

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };

async function main() {
  const browser = await chromium.launch({
    channel: "chrome", headless: true, ignoreDefaultArgs: ["--headless=old"],
    args: ["--headless=new", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wav}`, "--autoplay-policy=no-user-gesture-required"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["microphone"], colorScheme: "light" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const done = async () => Number((await page.locator(".fc-count").getAttribute("aria-label")).match(/^(\d+)/)[1]);
  const kicker = () => page.locator(".fc-card.top .fc-kicker").innerText();

  // The widget in the room opens the app at the first chapter.
  await page.goto(`${BASE}/#/`);
  const widget = page.locator(".fl-cards");
  await widget.waitFor({ timeout: 15000 });
  check("the room has a Flashcards widget", /Flashcards/.test(await widget.getAttribute("aria-label")));
  await widget.click({ force: true }); // it bobs gently, so it never holds still
  await page.waitForURL(/#\/flashcards\//, { timeout: 8000 }).then(() => check("the widget opens Flashcards", true), () => check("the widget opens Flashcards", false, page.url()));

  // Pitch: its opening and steps first, then the texts.
  await page.goto(`${BASE}/#/flashcards/pitch`);
  await page.locator(".fc-card.top").waitFor();
  check("a chapter opens on its opening card", /About this chapter/i.test(await kicker()), await kicker());
  await page.getByRole("button", { name: /Got it/ }).click();
  await page.waitForTimeout(400);
  check("Got it takes a card off the pile", (await done()) === 1);
  await page.getByRole("button", { name: "Undo" }).click();
  await page.waitForTimeout(400);
  check("Undo puts it back", (await done()) === 0 && /About this chapter/i.test(await kicker()));

  // Again later sends it to the back; a swipe right (a drag) takes the next one.
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(400);
  check("Again later moves on without counting", (await done()) === 0 && /Step 1/i.test(await kicker()), await kicker());
  const box = await page.locator(".fc-card.top").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 60);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width / 2 + i * 24, box.y + 60);
  await page.mouse.up();
  await page.waitForTimeout(500);
  check("a swipe right counts as got it", (await done()) === 1);

  // Through the steps to the first text.
  for (let i = 0; i < 20 && !/Say it/i.test(await kicker()); i++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(350); }
  check("the texts come after the steps", /Say it/i.test(await kicker()));
  const before = await done();
  const text = await page.locator(".fc-card.top .fc-say").innerText();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(500);
  check("a text won't swipe before it's said", (await done()) === before && (await page.locator(".fc-card.top .fc-say").innerText()) === text);
  check("…and says so", /Say it first/.test(await page.locator(".fc-tip").innerText()));

  // Record it; then it swipes.
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.getByRole("button", { name: "Stop recording" }).waitFor();
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await page.getByRole("button", { name: "Record it again" }).waitFor({ timeout: 15000 });
  check("the take shows on the card to listen back to", await page.locator(".fc-card.top .prc-player").isVisible());
  const takes = await page.evaluate(async () => (await (await fetch("/api/history?prompt_id=text.pitch.mm-hm&days=3650")).json()).takes.length);
  check("the take is saved under the text, like any other", takes >= 1, `${takes} take(s) of text.pitch.mm-hm`);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(500);
  check("once said, it swipes", (await done()) === before + 1);

  // Where you got to is kept.
  const kept = await done();
  await page.reload();
  await page.locator(".fc-card.top").waitFor();
  check("a reload keeps your place", (await done()) === kept);

  // The full chapter link opens Practice at that text.
  await page.locator(".fc-card.top .fc-foot a").click();
  await page.waitForURL(/#\/studio\/pitch/, { timeout: 8000 }).then(() => check("the card opens its full chapter", true), () => check("the card opens its full chapter", false, page.url()));

  check("no page errors", errors.length === 0, errors.join("; "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
