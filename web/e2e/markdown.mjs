// Real Markdown component + shared styles, with subject-neutral stress content.
// Run: node e2e/markdown.mjs [absolute-screenshot-directory]
import { chromium } from "playwright-core";
import { createIsolatedVite as createServer } from "./isolated-vite.mjs";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const shots = process.argv[2];
if (shots) await mkdir(shots, { recursive: true });
const server = await createServer({ server: { host: "127.0.0.1", port: 0, strictPort: false }, logLevel: "error" });
await server.listen();
let browser;
const failures = [];
const check = (name, condition) => { if (!condition) failures.push(name); };
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route("**/texts/images/layout-fixture.webp", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="300"><rect width="1200" height="300" fill="#e9d6c8"/><text x="60" y="165" font-family="sans-serif" font-size="42" fill="#594b46">Room to explore</text></svg>' }));
  await page.goto(`${server.resolvedUrls.local[0]}e2e/fixtures/markdown.html`);
  await page.locator(".ve-md h1").waitFor();
  await page.evaluate(() => document.fonts.ready);
  check("nested lists preserve their structure", await page.locator(".ve-md ol > li > ul > li > ol").count() === 1);
  check("ordered list retains starting number", await page.locator(".ve-md > ol").first().getAttribute("start") === "3");
  check("six heading levels render", await page.locator(".ve-md h4, .ve-md h5, .ve-md h6").count() === 3);
  check("table renders semantically", await page.locator(".ve-md table th").count() === 3);
  check("task checkboxes are read-only", await page.locator('.ve-md input[type="checkbox"]:disabled').count() === 2);
  check("code preserves literal markup", await page.locator(".ve-md code").filter({ hasText: "**literal markers**" }).count() === 1);
  check("fenced code retains newlines", (await page.locator(".ve-md pre code").allTextContents()).join("").includes("first line\n  indentation stays intact"));
  check("nested parentheses in URLs survive", await page.getByRole("link", { name: "a reference", exact: true }).getAttribute("href") === "https://example.com/guide_(beginner)");
  check("unsafe links do not navigate", !(await page.getByText("Unsafe link", { exact: true }).getAttribute("href")));
  check("raw HTML never executes", await page.evaluate(() => !window.markdownUnsafe && !document.querySelector(".ve-md script")));
  check("blocked image is not requested", await page.locator('.ve-md img[src^="data:"]').count() === 0);
  check("local images resolve", await page.locator('.ve-md img[src="/texts/images/layout-fixture.webp"]').count() === 1);
  await page.evaluate(() => location.hash = "/studio/example");
  await page.locator(".ve-md [data-footnote-ref]").click();
  check("footnotes keep the app route", await page.evaluate(() => location.hash === "#/studio/example"));
  check("footnotes move focus to their target", await page.evaluate(() => document.activeElement?.tagName === "LI"));
  await page.locator(".ve-md [data-footnote-backref]").click();
  check("footnote back references keep the app route", await page.evaluate(() => location.hash === "#/studio/example"));

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) for (const textSize of ["normal", "largest"]) {
      await page.evaluate(({ theme, textSize }) => { document.documentElement.dataset.theme = theme; document.documentElement.dataset.text = textSize; }, { theme, textSize });
      const layout = await page.evaluate(() => {
        const q = s => document.querySelector(s);
        const rect = s => q(s).getBoundingClientRect();
        // Remix stays hidden until it works, so the header may have no actions to overlap.
        const title = rect(".ve-head h1"), actions = q(".ve-head-actions") ? rect(".ve-head-actions") : { left: 0, right: 0, top: 0, bottom: 0 };
        const scroll = q(".ve-page");
        return {
          overflow: scroll.scrollWidth > scroll.clientWidth + 1,
          footerWidth: rect(".ve-end").width,
          markdownWidth: rect(".ve-md").width,
          columnWidth: q(".ve-col").clientWidth - parseFloat(getComputedStyle(q(".ve-col")).paddingLeft) - parseFloat(getComputedStyle(q(".ve-col")).paddingRight),
          footerMargin: parseFloat(getComputedStyle(q(".ve-end")).marginTop),
          titleOverlap: title.left < actions.right && title.right > actions.left && title.top < actions.bottom && title.bottom > actions.top,
          nestedItemDisplay: q(".ci-tips li li") ? getComputedStyle(q(".ci-tips li li")).display : null,
          shortcutHeight: q(".ve-course-jumps button").offsetHeight,
          imageRatio: q('.ve-md img[src^="/texts/"]').offsetWidth / q('.ve-md img[src^="/texts/"]').offsetHeight,
          headingSizes: ["h1", "h2", "h3", "h4"].map(tag => q(`.ve-md ${tag}`) ? parseFloat(getComputedStyle(q(`.ve-md ${tag}`)).fontSize) : NaN),
          exerciseMarkersFit: [...document.querySelectorAll(".ve-item")].every(item => {
            const marker = item.querySelector(".ve-mk");
            if (getComputedStyle(marker).display === "none") return true;
            const card = item.getBoundingClientRect(), number = marker.getBoundingClientRect();
            const content = item.querySelector(".ve-checkin, .readtext").getBoundingClientRect();
            return number.left >= card.left + 8 && number.right + 8 <= content.left && number.top >= card.top && number.bottom <= card.bottom;
          }),
        };
      });
      const at = `${width}px/${theme}/${textSize}`;
      check(`no horizontal page overflow at ${at}`, !layout.overflow);
      const zoom = textSize === "largest" ? 1.25 : 1;
      check(`footer uses the full reading width at ${at}`, Math.abs(layout.footerWidth / zoom - layout.columnWidth) < 2);
      check(`Markdown uses the full reading width at ${at}`, Math.abs(layout.markdownWidth / zoom - layout.columnWidth) < 2);
      check(`footer stays close to the last exercise at ${at}`, layout.footerMargin <= 24);
      check(`title and actions do not overlap at ${at}`, !layout.titleOverlap);
      check(`nested tip lists retain list layout at ${at}`, layout.nestedItemDisplay === "list-item");
      check(`shortcut button remains touch-sized at ${at}`, layout.shortcutHeight >= 44);
      check(`images keep their original proportions at ${at}`, Math.abs(layout.imageRatio - 4) < 0.1);
      check(`heading hierarchy at ${at}`, layout.headingSizes.every((n, i, a) => i === 0 || n < a[i - 1]));
      check(`exercise numbers sit inside cards with a clear text gutter at ${at}`, layout.exerciseMarkersFit);
      if (shots && [390, 1440].includes(width) && textSize === "normal") {
        await page.locator(".ve-page").evaluate(el => el.scrollTop = 0);
        await page.screenshot({ path: path.join(shots, `markdown-${width}-${theme}.png`) });
        await page.locator(".ve-md table").scrollIntoViewIfNeeded().catch(() => {});
        await page.screenshot({ path: path.join(shots, `markdown-blocks-${width}-${theme}.png`) });
        await page.locator(".ve-end").scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(shots, `course-footer-${width}-${theme}.png`) });
        if (width === 1440 && theme === "dark") {
          const exercise = page.locator(".ve-item").first();
          await exercise.hover();
          await exercise.screenshot({ path: path.join(shots, "exercise-number-spacing.png") });
        }
      }
    }
  }
  assert.deepEqual(errors, [], "browser errors");
  assert.deepEqual(failures, [], "Markdown and responsive layout regressions");
  console.log("PASS: Markdown semantics, safe URLs, images, and layout across five widths, two themes, and two text sizes.");
} finally {
  await browser?.close();
  await server.close();
}
