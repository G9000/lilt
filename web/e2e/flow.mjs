// End-to-end browser test: real MediaRecorder capture through Chrome's fake audio
// device (fed by e2e/fake-mic.wav, macOS `say` synthetic speech). This exercises the
// UI, recorder, chunked upload, analysis and feedback loop. It is NOT a real
// microphone test.
//
// Usage: LILT_URL=http://127.0.0.1:7979 node e2e/flow.mjs [screenshot-dir]

import { chromium } from "playwright-core";
import path from "node:path";
import fs from "node:fs";

const BASE = process.env.LILT_URL ?? "http://127.0.0.1:7979";
const shots = process.argv[2] ?? null;
const wav = path.resolve(path.dirname(new URL(import.meta.url).pathname), "fake-mic.wav");
if (shots) fs.mkdirSync(shots, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };

async function record(page, seconds = 2.5) {
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.getByRole("button", { name: "Stop recording" }).waitFor();
  await page.waitForTimeout(seconds * 1000);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await page.getByRole("status").filter({ hasText: /^✓?\s*Saved/ }).first().waitFor({ timeout: 15000 });
}

async function main() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wav}`, "--autoplay-policy=no-user-gesture-required"],
  });
  const viewport = process.env.MOBILE ? { width: 390, height: 844 } : { width: 1100, height: 900 };
  const ctx = await browser.newContext({ viewport, permissions: ["microphone"], colorScheme: "light" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const external = [];
  page.on("request", (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith("blob:") && !r.url().startsWith("data:")) external.push(r.url()); });
  const snap = async (n) => shots && page.screenshot({ path: `${shots}/${n}.png`, fullPage: true });

  // 0. The room: today's cards as a swipeable stack, then the desk with today's widget.
  await page.goto(BASE);
  const stack = page.locator(".cs");
  await page.locator(".cs-card.top .cs-phrase").waitFor();
  check("The room shows today's cards as a stack and a way in",
    /^Today's practice: \d+ cards?/.test(await stack.getAttribute("aria-label")) && await page.getByRole("button", { name: /^Sit down at the computer/ }).count() === 1);
  const topText = () => page.locator(".cs-card.top .cs-phrase").innerText();
  const first = await topText();
  await stack.focus();
  await page.keyboard.press("ArrowRight"); await page.waitForTimeout(700);
  const second = await topText();
  const nTop = await page.locator(".cs-dots i").count();
  await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(700);
  check("Arrow keys flip through the stack and back", /one, two, three/i.test(first) && nTop >= 2 && (await topText()) === first, `${first.slice(0, 20)} → ${second.slice(0, 20)}`);
  await snap("00-room");
  await page.getByRole("button", { name: /^Sit down at the computer/ }).click();
  await page.locator(".ve-item .readtext").first().waitFor();
  const deckList = (await (await fetch(`${BASE}/api/deck/today`)).json()).items.map((i) => i.card.front);
  const listed = await page.locator(".ve-item").count();
  const chapters = await page.locator(".ve-folder").count() - 1; // the tree's folders: Today, then the chapters
  const nothingPicked = await page.locator(".ve-item.on").count() === 0;
  // Opened from the computer, nothing is picked yet (the recorder takes free recordings); pick the first card.
  await page.locator(".ve-item").first().click();
  await page.locator(".ve-item.on .readtext").waitFor();
  check("The computer opens Practice full screen with nothing picked, today's cards (reference first) and the chapters",
    nothingPicked && deckList.length >= 3 && listed === deckList.length && chapters >= 5 && /one, two, three/i.test(await page.locator(".ve-item.on .readtext").innerText()), `${listed} cards, ${chapters} chapters`);
  await snap("00-deck");
  const ratings = ["good", "again", "good", "good", "good", "good"];
  let rated = 0;
  for (let i = 0; i < 8; i++) {
    const end = await page.getByRole("heading", { name: /That's today's deck/ }).count();
    if (end) break;
    await page.getByRole("button", { name: "Start recording" }).click();
    await page.getByRole("button", { name: "Stop recording" }).waitFor();
    await page.waitForTimeout(1800);
    await page.getByRole("button", { name: "Stop recording" }).click();
    await page.getByText("How did that feel?").waitFor({ timeout: 15000 });
    if (i === 0) {
      const prev = await page.locator(".vc-rate button").allInnerTexts();
      check("Rating buttons show when each card comes back", prev.length === 4 && /tomorrow/.test(prev[2]), prev.map((x) => x.replace(/\n/g, " ")).join(" | "));
      await snap("00b-rate");
    }
    // Keys 1–4 rate like Anki: 1 = again, 3 = good.
    await page.keyboard.press(ratings[i] === "again" ? "1" : "3");
    rated++;
    await page.waitForFunction(() => !document.body.innerText.includes("How did that feel?"), null, { timeout: 8000 });
  }
  await page.getByRole("heading", { name: /That's today's deck/ }).waitFor({ timeout: 8000 });
  check("An 'again' card comes back in the same run", rated === deckList.length + 1, `${rated} ratings for ${deckList.length} cards`);
  await page.getByRole("button", { name: "Comfortable" }).click();
  await page.getByText("See you tomorrow").waitFor();
  const deckNow = await (await fetch(`${BASE}/api/deck/today`)).json();
  check("Deck is done for today and ratings were scheduled", deckNow.all_done === true && !!deckNow.next_due, `next due ${deckNow.next_due}`);
  await page.goto(`${BASE}/#/desk`);
  await page.reload();
  await page.locator(".ds-today").getByText("Done", { exact: true }).waitFor();
  await snap("00c-deck-done");

  // The guided session (with coaching feedback) is still one tap away.
  await page.getByRole("link", { name: "Guided session with feedback" }).click();
  await page.getByRole("button", { name: "Start today" }).waitFor();
  check("Guided session opens with Start today", true, await page.locator("h1").first().innerText());
  const script = await page.locator(".setlist li").allInnerTexts();
  check("Guided device shows the session script", script.length === 7 && /reference/.test(script[1]), script.slice(0, 3).join(" | "));
  await snap("01-today");
  await page.getByRole("button", { name: "Start today" }).click();

  // 1. Mic check
  await page.getByRole("button", { name: "Turn on microphone" }).click();
  await page.getByText(/level looks usable/i).waitFor({ timeout: 10000 });
  check("Mic check hears the input", true);
  await snap("02-mic");
  await page.getByRole("button", { name: "Sounds good, continue" }).click();

  // 2. Reference
  await record(page);
  check("Reference take saved (server-confirmed)", true);
  await snap("03-reference");
  await page.getByRole("button", { name: "On to the exercise" }).click();

  // 3. Exercise (follows the current plan)
  const exTitle = await page.locator("h2").first().innerText();
  await record(page, 3);
  check("Exercise take saved", true, exTitle);
  await snap("04-exercise");
  await page.getByRole("button", { name: "Listen back and check in" }).click();

  // 4. Self-check: answer "not met" for the first question
  const firstFieldset = page.locator("fieldset").first();
  const opts = firstFieldset.locator("label.choice");
  const n = await opts.count();
  // Pick the option that signals target_not_met where possible (throat/chest, the usual take, no, too flat…)
  const labels = await opts.allInnerTexts();
  const notMetIdx = labels.findIndex((l) => /throat|usual|^no|too flat/i.test(l));
  await opts.nth(notMetIdx >= 0 ? notMetIdx : n - 1).click();
  await snap("05-check");
  await page.getByRole("button", { name: "Save and continue" }).click();

  // 5. Follow-up reference
  await record(page);
  check("Post-practice reference saved", true);
  await page.getByRole("button", { name: "Continue" }).click();
  // 6. Spontaneous: record a short answer
  await record(page);
  check("Spontaneous answer saved", true);
  await page.getByRole("button", { name: "Continue" }).click();

  // 7. Comfort
  await page.locator("label.choice", { hasText: "Comfortable" }).click();
  await page.locator("label.choice", { hasText: /^3$/ }).click();
  await snap("06-comfort");
  await page.getByRole("button", { name: "Finish session" }).click();
  await page.getByRole("heading", { name: "Session complete" }).waitFor({ timeout: 15000 });
  const doneText = await page.locator("main").innerText();
  check("All recordings confirmed saved", /are saved on your computer/.test(doneText));
  await page.waitForTimeout(4000);
  await snap("07-done");

  // Today reflects the finished session.
  await page.goto(`${BASE}/#/guided`);
  const doneState = await page.getByRole("heading", { name: /done for today/ }).waitFor({ timeout: 8000 }).then(() => true, () => false);
  check("Today switches to the done state after a full session", doneState);
  await snap("07b-today-done");
  await page.goBack();
  await page.getByRole("heading", { name: "Session complete" }).waitFor({ timeout: 8000 });

  // 8. Feedback → Hear the moment → Try again → Compare
  const hasPointer = await page.getByRole("button", { name: "Hear it and try again" }).count();
  check("A grounded pointer with a next step was produced", hasPointer > 0, (await page.locator(".card").first().innerText()).slice(0, 160).replace(/\n/g, " "));
  await page.getByRole("button", { name: "Hear it and try again" }).click();
  await page.getByRole("heading", { name: "1 · Hear the moment" }).waitFor();
  // The evidence take loads after the heading; wait for it rather than reading too early.
  const noMarker = await page.getByText(/no moment is marked/).first().waitFor({ timeout: 10000 }).then(() => true, () => false);
  const feedback = await page.locator("main").innerText();
  check("Self-report evidence shows no invented timestamp", noMarker && !/Highlighted: evidence/.test(feedback));
  check("Cue shown from the registry", /2 · Try this/.test(feedback));
  await snap("08-feedback");
  // Play original audio, then retry: playback must stop before capture.
  await page.getByRole("button", { name: /^Play / }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("button", { name: "Start recording" }).waitFor();
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.waitForTimeout(300);
  const anyPlaying = await page.evaluate(() => [...document.querySelectorAll("audio")].some((a) => !a.paused));
  check("Example/evidence playback stopped before capture", !anyPlaying);
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await page.getByRole("heading", { name: "4 · Compare" }).waitFor({ timeout: 15000 });
  const cmp = await page.locator("main").innerText();
  check("Retry opens the original/retry A/B pair", /Original/i.test(cmp) && /Retry with the cue/i.test(cmp));
  await snap("09-compare");
  // Answer the recheck as met and save
  const rq = page.locator("fieldset").first().locator("label.choice");
  const rl = await rq.allInnerTexts();
  const metIdx = rl.findIndex((l) => /lips|smiling|^yes|fits/i.test(l));
  await rq.nth(metIdx >= 0 ? metIdx : 0).click();
  await page.locator("label.choice", { hasText: "B, the retry" }).click();
  await page.getByRole("button", { name: "Save and see what's next" }).click();
  await page.getByText(/This time you answered “lips, face or nose”/).first().waitFor({ timeout: 15000 });
  const after = await page.locator("main").innerText();
  check("Updated review reflects the retry's own self-check", /Another session will show whether it repeats/.test(after), after.split("\n").slice(1, 3).join(" | "));
  await snap("10-after-retry");

  // 9. Disagreement is kept
  await page.getByRole("button", { name: "Doesn't match what I hear or feel" }).click();
  await page.locator("#dis-note").fill("I felt it in my lips this time");
  await page.getByRole("button", { name: "Save note" }).click();
  await page.getByText("That's kept for the next assessment").waitFor();
  check("Disagreement saved alongside the review", true);

  // 10. Progress + keyboard
  await page.goto(`${BASE}/#/progress`);
  await page.getByRole("heading", { name: "Progress" }).waitFor();
  const prog = await page.locator(".ve-soon").innerText();
  check("Progress says it's coming soon and points at what already works", /Coming soon/.test(prog) && /Then and now/.test(prog) && !/overall score/i.test(prog));
  await snap("11-progress");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.textContent ?? "");
  check("Keyboard focus reaches controls", focused.length > 0, focused.slice(0, 40));

  // 11. Texts → a chapter: live pitch, takes, measured line, before/after
  await page.goto(`${BASE}/#/texts`);
  await page.getByRole("heading", { name: /Start small/ }).waitFor();
  await page.getByRole("button", { name: /Everyday phrases/ }).click();
  await snap("12-texts");
  await page.getByRole("button", { name: /Practise “Black coffee/ }).click();
  await page.locator('.readtext[aria-label="Black coffee, please."]').waitFor();
  check("Practise opens the chosen text at the reading desk", true);
  await page.getByRole("button", { name: "Show my pitch live" }).click();
  // The readout correctly shows "–" during pauses, so watch for a note over a few seconds.
  let note = "–";
  for (let i = 0; i < 25 && !/^[A-G]♯?\d$/.test(note.trim()); i++) {
    await page.waitForTimeout(200);
    note = await page.locator(".ve-now-read > span").innerText();
  }
  check("Live pitch readout shows a note while listening", /^[A-G]♯?\d$/.test(note.trim()), note);
  await snap("13-studio-live");
  await page.getByRole("button", { name: "Stop listening" }).click();
  // Read-along: the highlighter should move while reading.
  await page.getByRole("button", { name: "Start recording" }).click();
  let moved = false;
  for (let i = 0; i < 20 && !moved; i++) {
    await page.waitForTimeout(200);
    moved = (await page.locator(".w.now").count()) > 0;
  }
  await page.waitForTimeout(2200);
  const progressed = await page.locator(".w.done, .w.now").count();
  check("Read-along highlighter follows the reading", moved && progressed >= 2, `${progressed} words highlighted`);
  await snap("13b-readalong");
  await page.getByRole("button", { name: "Stop recording" }).click();
  await page.getByRole("status").filter({ hasText: /^✓?\s*Saved/ }).first().waitFor({ timeout: 15000 });
  await page.getByText("Measured pitch (Praat)").first().waitFor({ timeout: 20000 });
  check("Chapter take saved and measured pitch line drawn", true);
  const sketches = await page.locator(".wpitch").count().catch(() => 0);
  check("Measured pitch drawn under the words", sketches > 0, `${sketches} words`);
  await record(page, 2.5);
  await page.getByText(/^before ·/i).first().waitFor({ timeout: 10000 });
  check("Second take shows a before/after A/B pair", true);
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Use this take's range as my comfortable range" }).click();
  await page.getByText(/Your range is now \d+–\d+ Hz/).waitFor();
  check("A take's range can become the comfortable range", true);
  // The open chapter folder in the tree (the second list; the first holds Today).
  check("The chapter counts the practised text", /^1\/\d+$/.test(await page.locator(".ve-tree").nth(1).locator(".ve-folder.open .ve-open .c").first().textContent()));
  await snap("14-studio-result");
  await page.goto(`${BASE}/#/studio/warmup`);
  await page.getByRole("button", { name: "Show my pitch live" }).click();
  await page.waitForTimeout(2500);
  check("Warm-up shows a steadiness meter", await page.getByText("Steadiness").count() > 0);
  check("Live readout shows the comfortable range state", await page.getByText(/your range/i).count() > 0);
  await page.getByRole("button", { name: "Stop listening" }).click();
  // Theme toggle
  const before = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  await page.getByRole("button", { name: /Switch theme/ }).click();
  const themed = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  check("Theme toggle switches between light and dark", before === null && themed === "dark", `${before} → ${themed}`);
  await snap("15-dark");

  check("No page errors", errors.length === 0, errors.join("; "));
  check("No requests to external hosts", external.length === 0, external.slice(0, 3).join(", "));
  await browser.close();

  // 11. Permission denial
  const b2 = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-fake-device-for-media-stream", "--deny-permission-prompts"] });
  const c2 = await b2.newContext({ viewport });
  const p2 = await c2.newPage();
  await p2.goto(`${BASE}/#/guided`);
  await p2.getByRole("button", { name: "Quick check-in (1 min)" }).click();
  await p2.getByRole("button", { name: "Turn on microphone" }).click();
  const denied = await p2.getByText(/Microphone access was blocked/).waitFor({ timeout: 8000 }).then(() => true, () => false);
  check("Microphone denial shows a clear next action", denied);
  if (shots) await p2.screenshot({ path: `${shots}/12-denied.png`, fullPage: true });
  await b2.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
