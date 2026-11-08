// End-to-end test of a long take with Chrome's fake microphone (e2e/fake-mic.wav, which Chrome loops).
// One recording runs up to two minutes: in the last seconds the dock says when it stops, then it stops
// and saves by itself, says so, and the whole two minutes are measured, shown and can be saved as a
// clip. People record long readings and voice checks; a take must never be dropped or cut off without
// a word. Run it against a scratch server; it takes about three minutes.
//
// Usage: LILT_URL=http://127.0.0.1:7979 node e2e/long-take.mjs

import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const BASE = process.env.LILT_URL ?? "http://127.0.0.1:7979";
const LIMIT = 120;
const wav = fileURLToPath(new URL("fake-mic.wav", import.meta.url));
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };
const api = async (p) => (await fetch(`${BASE}${p}`)).json();

async function main() {
  const browser = await chromium.launch({
    channel: "chrome", headless: true, ignoreDefaultArgs: ["--headless=old"],
    args: ["--headless=new", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wav}`, "--autoplay-policy=no-user-gesture-required"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["microphone"] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const before = new Set((await api("/api/history?days=3650")).takes.map((t) => t.id));

  await page.goto(`${BASE}/#/studio/free`);
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.getByRole("button", { name: "Stop recording" }).waitFor();
  console.log(`Recording until the ${LIMIT} s limit…`);
  await page.waitForTimeout((LIMIT - 30) * 1000);
  check("no warning long before the end", (await page.locator(".ve-dock-msg").innerText()).includes("Stops at") === false);
  await page.waitForTimeout(20 * 1000);
  const warn = await page.locator(".ve-dock-msg").innerText();
  check("in the last seconds it says when it stops", /^Stops at 2:00 · \d+ s left$/.test(warn), warn);
  await page.getByRole("button", { name: "Start recording" }).waitFor({ timeout: 30000 })
    .then(() => check("it stops by itself at the limit", true), () => check("it stops by itself at the limit", false));
  await page.locator(".ve-dock-capped").waitFor({ timeout: 30000 }).then(() => undefined, () => undefined);
  const note = await page.locator(".ve-dock-capped").innerText().catch(() => "");
  check("then says it stopped and saved", note === "Stopped at 2:00 and saved. Record again to carry on.", note);

  // Saved and measured: poll the new take until analysis settles.
  let take = null;
  for (let i = 0; i < 240 && !(take && ["review_ready", "analysis_failed"].includes(take.status)); i++) {
    await page.waitForTimeout(1000);
    take = (await api("/api/history?days=3650")).takes.find((t) => !before.has(t.id)) ?? null;
  }
  check("the take is saved and measured", take?.status === "review_ready", take?.status ?? "no take");
  const d = take?.analysis_summary?.duration_s ?? 0;
  check("all two minutes are kept", Math.abs(d - LIMIT) < 3, `${d.toFixed(1)} s`);
  const a = take ? await api(`/api/takes/${take.id}/analysis`) : null;
  check("its pitch is measured across it", (a?.measures?.f0_median_hz?.value ?? 0) > 0 && (a?.measures?.voiced_duration_s?.value ?? 0) > LIMIT / 4,
    `${Math.round(a?.measures?.f0_median_hz?.value ?? 0)} Hz, ${Math.round(a?.measures?.voiced_duration_s?.value ?? 0)} s voiced`);
  // A free take folds its details: the summary line shows the pitch.
  await page.locator(".ve-free .ve-sum").filter({ hasText: /\d+ Hz/ }).waitFor({ timeout: 30000 })
    .then(() => check("the result shows on the page", true), () => check("the result shows on the page", false));
  const capped = await page.locator(".ve-dock-capped").count();
  if (take) {
    const res = await fetch(`${BASE}/api/takes/${take.id}/clip`);
    const bytes = (await res.arrayBuffer()).byteLength;
    const head = new DataView(await (await fetch(`${BASE}/api/takes/${take.id}/clip?start=0&end=1`)).arrayBuffer());
    const secs = (bytes - 44) / (head.getUint32(24, true) * head.getUint16(22, true) * 2);
    check("the whole take saves as a clip", res.ok && Math.abs(secs - d) < 0.5, `${secs.toFixed(1)} s`);
  }
  // A new take clears the note.
  if (capped) {
    await page.getByRole("button", { name: "Start recording" }).click();
    await page.getByRole("button", { name: "Stop recording" }).waitFor();
    check("starting again clears the note", (await page.locator(".ve-dock-capped").count()) === 0);
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Stop recording" }).click();
  }
  check("no page errors", errors.length === 0, errors.join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
