// Built app smoke/visual check, isolated data, no microphone. Build web and server first.
// Run: node e2e/course-review.mjs [absolute-screenshot-directory]
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const base = "http://127.0.0.1:17979";
assert.equal(await fetch(`${base}/healthz`).then(() => true, () => false), false, "test port already occupied");
const data = await mkdtemp(path.join(tmpdir(), "lilt-course-review-"));
const shots = process.argv[2];
if (shots) await mkdir(shots, { recursive: true });
const server = spawn(path.join(repo, "server/target/debug", process.platform === "win32" ? "lilt.exe" : "lilt"), [], {
  cwd: repo, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, LILT_BIND: "127.0.0.1:17979", LILT_DATA_DIR: data },
});
let log = "", browser;
server.stdout.on("data", chunk => { log += chunk; });
server.stderr.on("data", chunk => { log += chunk; });
try {
  for (let i = 0; i < 100; i++) {
    if (await fetch(`${base}/healthz`).then(r => r.ok, () => false)) break;
    assert.equal(server.exitCode, null, log);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`${base}/#/studio`);
  await page.locator(".ve-greet").waitFor();
  assert.equal(await page.locator(".ve-width-toggle").count(), 0, "the global width toolbar is removed");
  if (shots) await page.screenshot({ path: path.join(shots, "course-desktop.png") });
  // Every chapter, and the course guide, live on the Chapters page.
  await page.getByRole("link", { name: "All chapters", exact: true }).click();
  await page.locator(".ve-course-guide > summary").click();
  await page.getByRole("heading", { name: "Your route to a lighter voice" }).waitFor();
  await page.locator(".ve-course-guide > summary").click();
  await page.locator("#voice-chapters").waitFor({ state: "visible" });
  await page.locator("#voice-chapters").getByRole("link", { name: /Pitch Finding/ }).click();
  await page.getByRole("heading", { name: "Pitch", exact: true }).waitFor();
  await page.getByText("Progress by ease, not a calendar", { exact: true }).waitFor();
  if (shots) await page.screenshot({ path: path.join(shots, "pitch-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/#/studio`);
  await page.locator(".ve-greet").waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false, "page must fit mobile width");
  if (shots) await page.screenshot({ path: path.join(shots, "course-mobile.png") });
  await page.evaluate(() => document.documentElement.dataset.theme = "dark");
  if (shots) await page.screenshot({ path: path.join(shots, "course-mobile-dark.png") });
  const layoutFailures = [];
  for (const route of ["studio", "studio/free", "studio/pitch", "history", "studio/settings", "studio/mixtape", "courses"]) {
    await page.goto(`${base}/#/${route}`);
    const ready = { studio: ".ve-greet", "studio/free": ".ve-studio-rec", "studio/pitch": ".ci", history: ".rl-head", "studio/settings": ".sx-app", "studio/mixtape": ".ve-mixtape .co-box", courses: ".co-list" };
    await page.locator(ready[route]).first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ["light", "dark"]) for (const size of ["default", "largest"]) {
        await page.evaluate(({ theme, size }) => { document.documentElement.dataset.theme = theme; document.documentElement.dataset.text = size; }, { theme, size });
        const bad = await page.evaluate(() => [...document.querySelectorAll(".ve-page, .ds-win:not(.full) .ds-body")]
          .filter(el => el.scrollWidth > el.clientWidth + 1).map(el => ({ element: el.className, width: el.clientWidth, content: el.scrollWidth,
            outside: [...el.querySelectorAll("*")].filter(child => child.getBoundingClientRect().right > el.getBoundingClientRect().right + 1).slice(0, 8).map(child => child.className || child.tagName),
          })));
        if (bad.length) layoutFailures.push({ route, width, theme, size, bad });
      }
    }
  }
  assert.deepEqual(layoutFailures, [], "shared app screens must fit narrow widths and larger text");
  // Exercise the complete home/lesson renderers with content unrelated to the bundled syllabus.
  const generalMarkdown = "# A guide to everyday ideas\n\nRead [the reference][guide].[^note]\n\n```text\nFirst line\n\n## This is code, not a heading\nLast line\n```\n\n## Resources\n\n[guide]: https://example.com/guide\n\n[^note]: A footnote to read before trying the exercise.";
  await page.route("**/api/texts", async route => {
    const response = await route.fetch();
    const texts = await response.json();
    await route.fulfill({ response, json: { ...texts, home: generalMarkdown, levels: [{ ...texts.levels[0], id: "everyday-ideas", title: "A chapter for everyday ideas and experiments", subtitle: "Make room for something new", part: "Foundations", basis: generalMarkdown, video: null, source_url: null, check_in: null, items: [{ ...texts.levels[0].items[0], id: "one-small-idea", text: "Describe an idea you would like to explore.", hint: "Start with a short note, then try one small experiment." }] }] } });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/#/studio/chapters`);
  await page.reload();
  await page.locator(".ve-course-guide > summary").click();
  assert.equal(await page.locator(".ve-course-guide pre code").innerText(), "First line\n\n## This is code, not a heading\nLast line\n");
  assert.equal(await page.getByRole("link", { name: "the reference" }).getAttribute("href"), "https://example.com/guide");
  await page.locator('#voice-chapters a[href="#/studio/everyday-ideas"]').click();
  await page.locator(".ci-body pre").waitFor();
  assert.equal(await page.locator(".ve-col h1").count(), 1, "embedded Markdown must sit below the page title in the heading hierarchy");
  assert.equal(await page.locator(".ci-body pre code").innerText(), "First line\n\n## This is code, not a heading\nLast line\n");
  assert.equal(await page.locator(".ci-body").getByRole("link", { name: "the reference" }).getAttribute("href"), "https://example.com/guide");
  await page.locator(".ci-body pre").focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.evaluate(() => location.hash), "#/studio/everyday-ideas", "scrolling Markdown must not select another exercise");
  await page.locator(".ci-body [data-footnote-ref]").click();
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.evaluate(() => location.hash), "#/studio/everyday-ideas", "reading a focused footnote must not select another exercise");
  if (shots) await page.screenshot({ path: path.join(shots, "general-chapter-desktop.png") });
  await page.goto(`${base}/#/`);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.locator(".room-stage.settled").waitFor();
  await page.mouse.move(0, 0);
  const invitation = await page.evaluate(() => ({
    glow: document.querySelectorAll(".room-screen-light polygon").length,
    cue: Number(getComputedStyle(document.querySelector(".room-peek")).opacity),
  }));
  assert.ok(invitation.glow >= 2, "the screen has a glow drawn along its actual corners");
  // A calm room: the "Click the screen" label waits until you point at the screen (touch always shows it).
  assert.equal(invitation.cue, 0, "the click cue stays hidden until you point at the screen");
  const hit = await page.locator(".room-hit").boundingBox();
  await page.mouse.move(hit.x + hit.width / 2, hit.y + hit.height / 2);
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector(".room-peek")).opacity) === 1, null, { timeout: 3000 })
    .catch(() => assert.fail("pointing at the screen shows the click cue"));
  if (shots) await page.screenshot({ path: path.join(shots, "room-invitation-desktop.png") });
  await page.locator(".room-hit").focus();
  await page.keyboard.press("Enter");
  await page.locator(".ve-page").waitFor();
  assert.equal(await page.locator(".room-hit").evaluate(el => getComputedStyle(el).opacity), "0");
  await page.goto(`${base}/#/studio/everyday-ideas`);
  await page.locator(".ci-body").waitFor();
  // Old saved width choices must have no effect after removing the feature.
  await page.evaluate(() => {
    localStorage.setItem("lilt.reading.section:voice:chapter:everyday-ideas:A guide to everyday ideas:1", "full");
    localStorage.setItem("lilt.reading.section:voice:chapter:warmup:instructions", "columns");
  });
  await page.reload();
  await page.locator(".ci-body").waitFor();
  assert.equal(await page.locator(".reading-options, .reading-section, .ve-width-toggle").count(), 0, "width controls and wrappers are removed");
  assert.ok(await page.locator(".ci-body").evaluate(el => el.offsetWidth <= 696), "document uses the standard reading width");
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const size of ["default", "largest"]) {
      await page.evaluate(size => document.documentElement.dataset.text = size, size);
      assert.ok(await page.locator(".ve-page").evaluate(el => el.scrollWidth <= el.clientWidth + 1), `reading layout fits ${width}px/${size}`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.unroute("**/api/texts");
  await page.goto(`${base}/#/studio/warmup`);
  await page.reload();
  await page.locator(".ci-tips").waitFor();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(() => document.documentElement.dataset.text = "default");
  const boxes = await page.locator(".ci-tips > li").evaluateAll(items => items.slice(0, 2).map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y }; }));
  assert.ok(Math.abs(boxes[1].x - boxes[0].x) < 2 && boxes[1].y > boxes[0].y, "instructions stay in one column despite old saved preferences");
  if (shots) await page.screenshot({ path: path.join(shots, "standard-reading-desktop.png") });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/#/`);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await page.locator(".room-stage.settled").waitFor();
  await page.locator(".room-hit").click();
  await page.locator(".ve-page").waitFor();
  // Touch devices get an explicit tap cue and the same usable screen target.
  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const phone = await touch.newPage();
  await phone.goto(`${base}/#/`);
  await phone.locator(".room-stage.settled").waitFor();
  // The room's widgets and cues wait for the painting, so nothing floats on an empty room.
  await phone.locator('.room[data-ready="true"]').waitFor();
  assert.ok(await phone.getByText("Tap the screen", { exact: true }).isVisible());
  if (shots) await phone.screenshot({ path: path.join(shots, "room-invitation-mobile.png") });
  await phone.locator(".room-hit").tap();
  await phone.locator(".ve-page").waitFor();
  await touch.close();
  assert.deepEqual(errors, []);
  console.log("PASS: course navigation, seven responsive screens, full Markdown documents, monitor mouse/keyboard/touch entry, and standard reading layout across six widths.");
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    const exited = new Promise(resolve => server.once("exit", resolve));
    server.kill();
    await exited;
  }
  assert.equal(path.dirname(data), path.resolve(tmpdir()));
  assert.ok(path.basename(data).startsWith("lilt-course-review-"));
  await rm(data, { recursive: true, force: true });
}
