// End-to-end test of what a take's results add and what the mic check hears, with Chrome's fake
// microphone: time in your range (in the results and the folded summary), the man/woman pitch scale
// off on a fresh data folder and on once turned on in Practice settings, and the mic check's quiet
// moment and background-sound note. Run it against a fresh data folder.
//
// Usage: LILT_URL=http://127.0.0.1:7979 [SHOTS=/tmp/shots] [QUIET_MIC=quiet.wav NOISY_MIC=noisy.wav] node e2e/results-extras.mjs
// QUIET_MIC and NOISY_MIC are optional recordings for the mic check: a few seconds of near-silence
// before speech, and the same with steady background noise under it.

import { chromium } from "playwright-core";
import path from "node:path";
import fs from "node:fs";

const BASE = process.env.LILT_URL ?? "http://127.0.0.1:7979";
const SHOTS = process.env.SHOTS;
const wav = path.resolve(path.dirname(new URL(import.meta.url).pathname), "fake-mic.wav");

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };
const api = async (p, init) => (await fetch(`${BASE}${p}`, init)).json();
const snap = async (page, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); } };

async function launch(mic, colorScheme = "light") {
  const browser = await chromium.launch({
    channel: "chrome", headless: true, ignoreDefaultArgs: ["--headless=old"],
    args: ["--headless=new", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${mic}`, "--autoplay-policy=no-user-gesture-required"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["microphone"], colorScheme });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (process.env.DEBUG) page.on("request", (r) => { if (r.url().includes("/api/profile") && r.method() !== "GET") console.log("  PUT profile from", page.url(), r.postData()?.match(/"show_pitch_scale":\w+/)?.[0]); });
  return { browser, page, errors };
}

async function record(page, seconds = 3) {
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.getByRole("button", { name: "Stop recording" }).waitFor();
  await page.waitForTimeout(seconds * 1000);
  await page.getByRole("button", { name: "Stop recording" }).click();
}

/** Record a take of a card, then wait for its analysis to land in the folded summary. */
async function takeOfCard(page, card) {
  await page.goto(`${BASE}/#/deck?card=${encodeURIComponent(card)}`);
  await page.locator(".ve-item.on").waitFor({ timeout: 15000 });
  await record(page);
  await page.getByText("How did that feel?").waitFor({ timeout: 15000 });
  const sum = page.locator(".ve-details .ve-sum");
  await page.waitForFunction(() => { const t = document.querySelector(".ve-details .ve-sum")?.textContent ?? ""; return t && !/Measuring/.test(t); }, null, { timeout: 90000 });
  return sum.innerText();
}

async function openDetails(page) {
  if (!(await page.locator(".ve-details").evaluate((d) => d.open))) await page.locator(".ve-details > summary").click();
  await page.locator(".tr-pitch").waitFor({ timeout: 10000 });
}

async function main() {
  const CARD = "text.warmup.hum-to-hello";
  const fresh = await api("/api/profile");
  check("a fresh profile has the pitch scale off", fresh.show_pitch_scale === false, String(fresh.show_pitch_scale));
  // The fake mic sits around 140–195 Hz, so this range holds some of it, not all.
  await api("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...fresh, comfort_range_hz: [150, 175] }) });

  // 1. Time in your range, with the scale off.
  {
    const { browser, page, errors } = await launch(wav);
    const summary = await takeOfCard(page, CARD);
    check("the folded summary gives the share in your range", /· \d+% in your range$/.test(summary), summary);
    await openDetails(page);
    const share = await page.locator(".tr-share").innerText().catch(() => "");
    check("the results describe time in your range", /^(About|Most|Nearly all|A little|Hardly any) .*of what you voiced sat in your range \(150–175 Hz\)/.test(share), share);
    check("the description has no percentage or grade", !/%|only|great|well done/i.test(share));
    const colour = await page.locator(".tr-share").evaluate((el) => getComputedStyle(el).color);
    const ink2 = await page.locator(".tr-share").evaluate((el) => getComputedStyle(el).getPropertyValue("--ink-2").trim());
    check("the share is in plain ink, not a pass/fail colour", !!colour && !/rgb\((22, 147, 106|255, 66, 85)\)/.test(colour), `${colour} (ink-2 ${ink2})`);
    await page.waitForTimeout(800); // the scale loads its reference after the result
    check("the pitch scale is hidden on a fresh data folder", (await page.locator(".pscale").count()) === 0);
    await page.locator(".prc.ve-result").scrollIntoViewIfNeeded();
    await snap(page, "results-in-range-light");

    // 2. Turned on in Practice settings, it shows straight away, and after a reload.
    await page.goto(`${BASE}/#/studio/settings`);
    const box = page.locator("#pscale");
    await box.waitFor({ timeout: 10000 });
    check("Settings shows the pitch scale unticked", !(await box.isChecked()));
    await box.scrollIntoViewIfNeeded();
    await snap(page, "settings-pitch-scale-off-light");
    await box.check();
    // Straight off to practise, before the settings' moment-later save: the change must still be kept.
    await page.goto(`${BASE}/#/desk`);
    let saved = false;
    for (let i = 0; i < 20 && !saved; i++) { saved = (await api("/api/profile")).show_pitch_scale === true; if (!saved) await page.waitForTimeout(250); }
    check("ticking it saves show_pitch_scale: true, even leaving at once", saved);
    await takeOfCard(page, CARD);
    await openDetails(page);
    await page.locator(".pscale").waitFor({ timeout: 10000 }).then(() => check("the pitch scale shows once turned on", true), () => check("the pitch scale shows once turned on", false));
    await page.reload();
    await takeOfCard(page, CARD);
    await openDetails(page);
    await page.locator(".pscale").waitFor({ timeout: 10000 }).then(() => check("and still after a reload", true), () => check("and still after a reload", false));
    check("no page errors (light)", errors.length === 0, errors.join(" | "));
    await browser.close();
  }

  // 3. The same results in the dark.
  {
    const { browser, page, errors } = await launch(wav, "dark");
    await takeOfCard(page, CARD);
    await openDetails(page);
    await page.locator(".pscale").waitFor({ timeout: 10000 }).catch(() => undefined);
    await page.locator(".prc.ve-result").scrollIntoViewIfNeeded();
    await snap(page, "results-in-range-dark");
    check("no page errors (dark)", errors.length === 0, errors.join(" | "));
    await browser.close();
  }

  // 4. The mic check: a quiet moment, then your voice; the flow still continues to the reference phrase.
  const micCheck = async (mic, name, colorScheme = "light") => {
    const { browser, page, errors } = await launch(mic, colorScheme);
    await page.goto(`${BASE}/#/guided`);
    await page.getByRole("button", { name: "Start today" }).click();
    await page.getByRole("button", { name: "Turn on microphone" }).click();
    const quietAsked = await page.getByText("Stay quiet for a moment while Lilt listens to the room").waitFor({ timeout: 5000 }).then(() => true, () => false);
    await page.getByText("Say a few words at your usual volume.").waitFor({ timeout: 8000 });
    await page.getByText(/level looks usable/i).waitFor({ timeout: 15000 });
    await page.waitForTimeout(4000); // a few seconds of voice to judge the room on
    const noisy = await page.locator(".vmic-noise").count() > 0;
    await snap(page, name);
    await page.getByRole("button", { name: "Sounds good, continue" }).click();
    const onward = await page.getByRole("heading", { name: "Reference phrase" }).waitFor({ timeout: 10000 }).then(() => true, () => false);
    await browser.close();
    return { quietAsked, noisy, onward, errors };
  };

  const base = await micCheck(wav, "mic-check-default-light");
  check("the mic check asks for a quiet moment first", base.quietAsked);
  check("the mic check flow still continues to the reference phrase", base.onward);
  check("no page errors (mic check)", base.errors.length === 0, base.errors.join(" | "));
  if (process.env.QUIET_MIC) {
    const quiet = await micCheck(process.env.QUIET_MIC, "mic-check-quiet-room-light");
    check("a quiet room gets no background-sound note", !quiet.noisy && quiet.onward);
  }
  if (process.env.NOISY_MIC) {
    const noisy = await micCheck(process.env.NOISY_MIC, "mic-check-noisy-room-light");
    check("a noisy room gets the calm note, and you can still continue", noisy.noisy && noisy.onward);
    const dark = await micCheck(process.env.NOISY_MIC, "mic-check-noisy-room-dark", "dark");
    check("the note in the dark", dark.noisy && dark.onward);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
