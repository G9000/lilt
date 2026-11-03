// End-to-end test of Yarn (the voice game), with Chrome's fake microphone (e2e/fake-mic.wav): the
// widget sits in the room at its home spot (not hidden, not on the other widgets or today's cards)
// at three screen sizes and opens the game; the dock icon opens it; with no range, two hums find
// one and it can be saved; with a range, the yarn moves with the voice; speak mode shows a
// sentence; a breathing break comes and goes; the hurt button stops the game. Run it on a scratch
// data folder: it changes the profile's comfortable range. Screenshots go to the folder given.
//
// Usage: LILT_URL=http://127.0.0.1:7979 node e2e/yarn.mjs [/tmp/shots]

import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.LILT_URL ?? "http://127.0.0.1:7979";
const SHOTS = process.argv[2] ?? null;
const wav = path.resolve(path.dirname(new URL(import.meta.url).pathname), "fake-mic.wav");
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };
const shot = async (page, name) => { if (SHOTS) { const p = path.join(SHOTS, `${name}.png`); await page.screenshot({ path: p }); console.log(`  shot ${p}`); } };

async function setRange(page, range) {
  await page.evaluate(async (range) => {
    const p = await (await fetch("/api/profile")).json();
    await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...p, comfort_range_hz: range }) });
  }, range);
}
/** The yarn's height (0 top, 1 floor) every 200 ms for `ms`. */
async function heights(page, ms) {
  const out = [];
  for (let t = 0; t < ms; t += 200) { const y = await page.locator(".yn-scene").getAttribute("data-y"); if (y !== null) out.push(Number(y)); await page.waitForTimeout(200); }
  return out;
}

async function main() {
  const browser = await chromium.launch({
    channel: "chrome", headless: true, ignoreDefaultArgs: ["--headless=old"],
    args: ["--headless=new", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wav}`, "--autoplay-policy=no-user-gesture-required"],
  });
  const errors = [];

  // The widget, at home, at three common screen sizes: shown, and clear of everything else.
  for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: "light" });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/#/`);
    await page.evaluate(() => localStorage.removeItem("lilt.room.layout.cel-studio.2"));
    await page.reload();
    await page.locator(".room-stage.settled").waitFor({ timeout: 15000 });
    await page.locator(".fl-yarn").waitFor();
    await page.waitForTimeout(1200);
    const m = await page.evaluate(() => {
      const box = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
      const fls = [...document.querySelectorAll(".fl")].map((el) => ({ me: !!el.querySelector(".fl-yarn"), label: el.querySelector(".fl-drag")?.getAttribute("aria-label"), off: el.classList.contains("off"), b: box(el.querySelector(".fl-nudge")) }));
      const cs = document.querySelector(".cs");
      return { fls, stack: cs ? box(cs) : null, vw: innerWidth, vh: innerHeight };
    });
    const me = m.fls.find((f) => f.me);
    const hit = (a, b) => !(a.r < b.l + 4 || a.l > b.r - 4 || a.b < b.t + 4 || a.t > b.b - 4);
    const over = m.fls.filter((f) => !f.me && !f.off && hit(me.b, f.b)).map((f) => f.label);
    check(`${w}×${h}: the yarn widget shows (not off)`, !me.off);
    check(`${w}×${h}: it's fully on screen`, me.b.l >= 0 && me.b.t >= 30 && me.b.r <= m.vw && me.b.b <= m.vh, JSON.stringify(me.b));
    check(`${w}×${h}: it covers no other widget`, over.length === 0, over.join(", "));
    check(`${w}×${h}: it's clear of today's cards`, !m.stack || !hit(me.b, m.stack));
    if (w === 1440) {
      await shot(page, "yarn-room-1440");
      await page.locator(".fl-yarn").click({ force: true }); // it bobs gently, so it never holds still
      await page.waitForURL(/#\/yarn$/, { timeout: 8000 }).then(() => check("the widget opens Yarn", true), () => check("the widget opens Yarn", false, page.url()));
    }
    await ctx.close();
  }

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["microphone"], colorScheme: "light" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));

  // The dock icon.
  await page.goto(`${BASE}/#/desk`);
  await page.getByRole("button", { name: "Yarn", exact: true }).click();
  await page.waitForURL(/#\/yarn$/, { timeout: 8000 }).then(() => check("the dock icon opens Yarn", true), () => check("the dock icon opens Yarn", false, page.url()));
  await page.locator(".yn-name").waitFor();
  await page.keyboard.press("Escape");
  await page.waitForURL(/#\/desk$/, { timeout: 4000 }).then(() => check("Esc goes back to the desk", true), () => check("Esc goes back to the desk", false, page.url()));

  // No range yet: two hums find one, and it can be saved.
  await setRange(page, null);
  await page.goto(`${BASE}/#/yarn`);
  await page.reload();
  await page.getByRole("button", { name: "Find my range" }).click();
  await page.getByText("Hum a comfortable low note").waitFor({ timeout: 8000 });
  check("with no range, a calibration starts with a low hum", true);
  await page.getByText("Now a comfortable high note").waitFor({ timeout: 20000 }).then(() => check("…then a high hum", true), () => check("…then a high hum", false));
  await page.getByRole("button", { name: "Save as my comfortable range" }).waitFor({ timeout: 20000 });
  const found = await page.locator(".yn-title").innerText();
  check("two hums make a range", /Hz/.test(found), found);
  await page.getByRole("button", { name: "Save as my comfortable range" }).click();
  const saved = await page.evaluate(async () => (await (await fetch("/api/profile")).json()).comfort_range_hz);
  check("…which is saved as the comfortable range", Array.isArray(saved) && saved[1] > saved[0], JSON.stringify(saved));
  check("no male/female presets anywhere", !/\b(male|female|man|woman)\b/i.test(await page.locator(".yn").innerText()));

  // With a range, the yarn rides the voice.
  await setRange(page, [100, 260]);
  await page.reload();
  await page.getByText("Your range:").waitFor();
  await shot(page, "yarn-setup-light");
  await page.getByRole("radio", { name: /Hum or lip trill/ }).click();
  check("hum mode explains a lip trill in one line", /Lip trill:/.test(await page.locator(".yn-how").innerText()));
  await page.evaluate(() => window.addEventListener("lilt:mic", (e) => { window.__mic = e.detail; }));
  await page.getByRole("button", { name: "Start playing" }).click();
  await page.locator(".yn-stage.playing").waitFor();
  const ys = await heights(page, 7000);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  check("the yarn lifts off the floor with the voice", lo < 0.85, `highest point y=${lo.toFixed(2)}`);
  check("…and moves up and down as the voice does", hi - lo > 0.08, `y from ${lo.toFixed(2)} to ${hi.toFixed(2)}`);
  check("the mic is claimed while you play (the radio steps aside)", await page.evaluate(() => window.__mic === true));
  await shot(page, "yarn-play-light");
  check("no score, timer or leaderboard on screen", !/score|points|leaderboard|streak|\d+:\d\d/i.test(await page.locator(".yn").innerText()));

  // A breath, then carry on.
  await page.getByRole("button", { name: "Take a breath" }).click();
  await page.getByText("Time for a breath").waitFor();
  check("a breathing break pauses the game", true);
  await page.getByRole("button", { name: "Carry on" }).click();
  await page.getByText("Time for a breath").waitFor({ state: "detached" });
  check("…and Carry on goes back to it", await page.locator(".yn-stage.playing").count() === 1);

  // Stop: a few words, no grades.
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  const words = await page.locator(".yn-card .yn-p").innerText();
  check("stopping describes how it went", /afloat|rested/.test(words), words.replace(/\n/g, " "));
  check("…without grading it", !/score|%|out of|great job|poor/i.test(words));

  // Dark theme while playing.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.getByRole("button", { name: "Play again" }).click();
  await page.locator(".yn-stage.playing").waitFor();
  await page.waitForTimeout(3000);
  await shot(page, "yarn-play-dark");
  await page.getByRole("button", { name: "Stop", exact: true }).click();

  // Speak mode shows a sentence to say.
  await page.reload();
  await page.getByRole("radio", { name: /Speak sentences/ }).click();
  await shot(page, "yarn-setup-dark");
  await page.getByRole("button", { name: "Start playing" }).click();
  await page.evaluate(() => window.addEventListener("lilt:mic", (e) => { window.__mic = e.detail; }));
  const line = await page.locator(".yn-say p").innerText();
  check("speak mode shows an everyday sentence to say", line.length > 5, line);
  await page.waitForTimeout(2500);
  await shot(page, "yarn-speak-dark");

  // It hurts: stop, with the rest message.
  await page.getByRole("button", { name: "It hurts or feels strained" }).first().click();
  await page.getByText(/Let.s stop here/).waitFor();
  check("the hurt button stops the game", await page.locator(".yn-stage.playing").count() === 0);
  check("…with Lilt's rest message", /speech and language therapist/.test(await page.locator(".yn-card").innerText()));
  await page.waitForTimeout(400);
  check("…and lets go of the mic", await page.evaluate(() => window.__mic === false));
  await ctx.close();

  // Phone width, with reduced motion.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["microphone"], colorScheme: "light", isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const pp = await phone.newPage();
  pp.on("pageerror", (e) => errors.push(e.message));
  await pp.goto(`${BASE}/#/yarn`);
  await pp.getByText("Your range:").waitFor();
  await shot(pp, "yarn-setup-phone");
  await pp.getByRole("radio", { name: /Hum or lip trill/ }).click();
  await pp.getByRole("button", { name: "Start playing" }).click();
  await pp.locator(".yn-stage.playing").waitFor();
  await pp.waitForTimeout(3000);
  const pys = await heights(pp, 2000);
  check("with reduced motion the yarn still follows the voice", pys.length > 0 && Math.min(...pys) < 0.85, pys.join(" "));
  const fits = await pp.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  check("at phone width nothing scrolls sideways", fits);
  await shot(pp, "yarn-play-phone");
  await phone.close();

  check("no page errors", errors.length === 0, errors.join("; "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
