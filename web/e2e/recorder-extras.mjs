// End-to-end test of two recorder extras with Chrome's fake microphone (e2e/fake-mic.wav, macOS
// `say` speech, so not a real voice): "Play my note" (a soft tone at the middle of your range,
// never in a take) and the Resonance chapter's live darker–brighter meter. The Web Audio nodes are
// spied on, not heard. Run it against a fresh data folder: it starts with no range, then sets one.
//
// Usage: LILT_URL=http://127.0.0.1:7979 node e2e/recorder-extras.mjs [screenshot-dir]

import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import path from "node:path";
import fs from "node:fs";

const BASE = process.env.LILT_URL ?? "http://127.0.0.1:7979";
const shots = process.argv[2] ?? null;
const wav = fileURLToPath(new URL("fake-mic.wav", import.meta.url));
if (shots) fs.mkdirSync(shots, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };
const shot = async (page, name) => { if (shots) { const p = path.join(shots, `${name}.png`); await page.screenshot({ path: p }); console.log(`  shot ${p}`); } };

/** Every oscillator started (frequency, when, and each stop() call) and every MediaRecorder start. */
const SPY = () => {
  window.__osc = [];
  window.__recStarts = [];
  const start = OscillatorNode.prototype.start, stop = OscillatorNode.prototype.stop;
  OscillatorNode.prototype.start = function (...a) { window.__osc.push({ node: this, hz: this.frequency.value, at: performance.now(), stops: [] }); return start.apply(this, a); };
  OscillatorNode.prototype.stop = function (...a) { const o = window.__osc.find((x) => x.node === this); o?.stops.push(performance.now()); return stop.apply(this, a); };
  const rs = MediaRecorder.prototype.start;
  MediaRecorder.prototype.start = function (...a) { window.__recStarts.push(performance.now()); return rs.apply(this, a); };
};
const tones = (page) => page.evaluate(() => window.__osc.map(({ hz, at, stops }) => ({ hz, at, stops })));
/** Wait until the last take is saved and Record can start again. */
const saved = (page) => page.locator('button[aria-label="Start recording"]:not(:disabled)').waitFor({ timeout: 30000 });

async function main() {
  const browser = await chromium.launch({
    channel: "chrome", headless: true, ignoreDefaultArgs: ["--headless=old"],
    args: ["--headless=new", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wav}`, "--autoplay-policy=no-user-gesture-required"],
  });
  for (const scheme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["microphone"], colorScheme: scheme });
    await ctx.addInitScript(SPY);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const tag = (s) => `${s} (${scheme})`;
    const note = page.getByRole("button", { name: /^Play my note/ });

    await page.goto(`${BASE}/#/studio/pitch`);
    await page.getByRole("heading", { name: "Pitch", level: 1 }).waitFor({ timeout: 15000 });
    const setRange = (range) => page.evaluate(async (r) => {
      const p = await fetch("/api/profile").then((x) => x.json());
      return (await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...p, comfort_range_hz: r }) })).ok;
    }, range);
    if (scheme === "light") {
      // No range (as on a fresh install, or after an earlier run): no button.
      await setRange(null);
      await page.reload();
      await page.getByRole("heading", { name: "Pitch", level: 1 }).waitFor();
      await page.getByRole("button", { name: "Start recording" }).waitFor();
      check(tag("no range: no Play my note"), (await note.count()) === 0);
      // 150–230 Hz: the middle (geometric) is 185.7 Hz, nearest note F♯3 (185.0 Hz).
      check("the comfortable range is set", await setRange([150, 230]));
      await page.reload();
      await page.getByRole("heading", { name: "Pitch", level: 1 }).waitFor();
    }

    // Play my note, on a hum chapter.
    await note.waitFor({ timeout: 10000 });
    const label = (await note.innerText()).trim();
    check(tag("Play my note shows with a range, named by its note"), /Play my note · F♯3/.test(label), label);
    await note.click();
    await page.waitForTimeout(300);
    let osc = await tones(page);
    check(tag("it plays a tone at the note"), osc.length === 1 && Math.abs(osc[0].hz - 185) < 0.5, JSON.stringify(osc.map((o) => o.hz)));
    check(tag("it shows while it plays"), (await note.getAttribute("aria-pressed")) === "true");
    await shot(page, `note-playing-${scheme}`);
    await page.waitForTimeout(2000);
    check(tag("it ends by itself in about two seconds"), (await note.getAttribute("aria-pressed")) === "false");

    // Pressing Record mid-tone stops it at once, and the take waits until its pre-roll is clear of it.
    await note.click();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Start recording" }).click();
    await page.getByRole("button", { name: "Stop recording" }).waitFor();
    osc = await tones(page);
    const t = osc[osc.length - 1], recAt = (await page.evaluate(() => window.__recStarts)).at(-1);
    check(tag("Record stops the tone early"), t.stops.length === 2, `${t.stops.length} stop calls`);
    check(tag("the take starts after the pre-roll is clear of the tone"), recAt - t.stops[1] >= 500, `${Math.round(recAt - t.stops[1])} ms`);
    check(tag("Play my note is disabled while recording"), await note.isDisabled());
    check(tag("no brightness meter outside the Resonance chapter"), (await page.locator(".ve-bright").count()) === 0);
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "Stop recording" }).click();
    await saved(page);

    // Resonance: the meter appears while recording and moves with the sound.
    await page.goto(`${BASE}/#/studio/resonance`);
    await page.getByRole("heading", { name: "Resonance", level: 1 }).waitFor();
    await saved(page);
    check(tag("no meter before recording"), (await page.locator(".ve-bright").count()) === 0);
    await shot(page, `note-idle-${scheme}`);
    await page.getByRole("button", { name: "Start recording" }).click();
    const meter = page.locator(".ve-bright-track[role=meter]");
    await meter.waitFor({ timeout: 5000 });
    check(tag("the meter appears while recording on Resonance"), true);
    check(tag("its note says steady sounds, not speech"), /steady sound.*Not on speech/.test(await page.locator(".ve-bright-note").innerText()));
    const seen = new Set(), words = new Set();
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(150);
      seen.add(await page.locator(".ve-bright-pos").evaluate((el) => el.style.transform));
      words.add(await meter.getAttribute("aria-valuetext"));
      if (i === 22) await shot(page, `meter-${scheme}`);
    }
    check(tag("the meter moves"), seen.size >= 3, `${seen.size} positions`);
    check(tag("it reads against where you started"), [...words].some((w) => /where you started|than when you started/.test(w)), [...words].join(" | "));
    check(tag("no scores or verdicts in its words"), ![...words].some((w) => /good|bad|better|worse|%|male|female/i.test(w)));
    await page.getByRole("button", { name: "Stop recording" }).click();
    await saved(page);
    check(tag("the meter goes once the take stops"), (await page.locator(".ve-bright").count()) === 0);

    // Another hum chapter (Warm-ups) records without the meter.
    await page.goto(`${BASE}/#/studio/warmup`);
    await page.getByRole("heading", { name: /Warm/, level: 1 }).waitFor();
    await page.getByRole("button", { name: "Start recording" }).click();
    await page.getByRole("button", { name: "Stop recording" }).waitFor();
    await page.waitForTimeout(800);
    check(tag("no meter on Warm-ups"), (await page.locator(".ve-bright").count()) === 0);
    await page.getByRole("button", { name: "Stop recording" }).click();
    await saved(page);

    // Studio: Show my pitch live silences the tone and disables the button.
    await page.goto(`${BASE}/#/studio/free`);
    await page.getByRole("heading", { name: "Studio" }).waitFor();
    await note.click();
    await page.waitForTimeout(300);
    const before = (await tones(page)).length;
    await page.getByRole("button", { name: "Show my pitch live" }).click();
    await page.getByRole("button", { name: "Stop listening" }).waitFor();
    const last = (await tones(page))[before - 1];
    check(tag("live pitch stops the tone"), last.stops.length === 2 && (await note.getAttribute("aria-pressed")) === "false");
    check(tag("Play my note is disabled while live"), await note.isDisabled());
    check(tag("no meter in Studio"), (await page.locator(".ve-bright").count()) === 0);
    await page.getByRole("button", { name: "Stop listening" }).click();

    check(tag("no page errors"), errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
