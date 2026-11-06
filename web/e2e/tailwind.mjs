// Verify that every reusable recipe is actually emitted by source scanning, including quoted
// arbitrary values. A type check cannot catch a class that silently generates no CSS.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from 'playwright-core';
import { shared } from '../src/ui/shared.ts';
import { markdown } from '../src/ui/markdown.ts';
import { accent } from '../src/ui/accent.ts';
import { practice } from '../src/ui/practice.ts';
import { pages } from '../src/ui/pages.ts';
import { roomStyles } from '../src/desk/roomStyles.ts';

const scratch = await mkdtemp(join(tmpdir(), 'lilt-tailwind-'));
let browser;
try {
  const output = join(scratch, 'utilities.css');
  await promisify(execFile)(process.execPath, [
    fileURLToPath(new URL('../node_modules/@tailwindcss/cli/dist/index.mjs', import.meta.url)),
    '-i', fileURLToPath(new URL('../src/styles.css', import.meta.url)), '-o', output,
  ], { timeout: 60_000 });
  const css = await readFile(output, 'utf8');
  const recipes = { shared, markdown, accent, practice, pages, roomStyles };
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  let count = 0;
  for (const [name, group] of Object.entries(recipes)) {
    const candidates = [...new Set(Object.values(group).flatMap(value => value.split(/\s+/).filter(Boolean)))];
    const missing = await page.evaluate(({ css, candidates }) => candidates.filter(candidate =>
      !css.includes('.' + CSS.escape(candidate))), { css, candidates });
    assert.deepEqual(missing, [], `${name}: utility classes missing from the compiled stylesheet`);
    count += candidates.length;
  }
  console.log(`PASS: ${count} recipe utilities emitted by Tailwind's source scanner.`);
} finally {
  await browser?.close();
  assert.equal(dirname(resolve(scratch)), resolve(tmpdir()));
  assert.ok(basename(scratch).startsWith('lilt-tailwind-'));
  await rm(scratch, { recursive: true, force: true });
}
