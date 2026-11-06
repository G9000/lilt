// Course browsing and direct chapter links, with no live API or practice data.
import { chromium } from 'playwright-core';
import { createIsolatedVite } from './isolated-vite.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const shots = fileURLToPath(new URL('../../.tmp/course-ui-shots/', import.meta.url));
const courses = [
  { id: 'drawing', title: 'Drawing gently', kind: 'drawing', summary: 'Explore lines, shapes and everyday objects, one small sketch at a time.' },
  { id: 'voice', title: 'Your voice', kind: 'voice', summary: 'A few comfortable minutes to explore your voice.' },
].map(c => ({ ...c, version: '1', source: null, locked_sections: [], using: 'original', changes: 0, updates_waiting: 0, shown_in_app: true }));
const server = await createIsolatedVite({ root: fileURLToPath(new URL('../', import.meta.url)), logLevel: 'error' });
let browser;
try {
  await mkdir(shots, { recursive: true });
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/healthz', route => route.fulfill({ json: { ok: true } }));
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url()), p = url.pathname, course = url.searchParams.get('course') ?? 'voice';
    const send = json => route.fulfill({ json });
    if (p === '/api/courses') return send({ courses });
    if (p === '/api/syllabus') return send({ course, using: 'original', removed_from_original: [], files: [
      { file: '01-start.md', chapter_id: 'start', title: 'A small beginning', texts: 2, status: 'same' },
      { file: '02-notice.md', chapter_id: 'notice', title: 'Notice the details in something familiar', texts: 3, status: 'added' },
    ] });
    if (p === '/api/syllabus/history') return send({ course, using: 'original', changes: [] });
    if (p === '/api/texts') return send({ note: '', home: 'Make a little room to explore.', levels: [{ id: 'start', level: 1, title: 'A small beginning', subtitle: 'Try a little, then pause.', kind: 'phrase',
      basis: '## Find your starting point\n\nChoose something close to hand.\n\n> Take your time. There is no single pace for learning.',
      items: [{ id: 'first-lines', text: 'Draw three loose circles.\n\n- Try a light touch.\n- Let each one be different.', hint: 'Notice how the movement feels in your hand.' }],
    }] });
    if (p === '/api/profile') return send({ goal: { summary: '', descriptors: [] }, comfort_range_hz: [100, 260], session_minutes: 5 });
    if (p === '/api/history') return send({ takes: [] });
    if (p === '/api/photos') return send({ uploaded: [], hidden: [] });
    return route.fulfill({ status: 503, json: { error: 'No live API in this fixture.' } });
  });
  const base = server.resolvedUrls.local[0];
  for (const theme of ['light', 'dark']) for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(`${base}#/courses`);
    await page.evaluate(theme => window.dispatchEvent(new CustomEvent('lilt:theme', { detail: theme })), theme);
    const course = page.locator('.co-list').getByRole('button', { name: /Drawing gently/ });
    await course.waitFor();
    await page.screenshot({ path: path.join(shots, `courses-${width}-${theme}.png`) });
    await course.click();
    const chapter = page.getByRole('link', { name: /A small beginning/ });
    await chapter.waitFor();
    assert.equal(await chapter.getAttribute('href'), '#/learn/drawing/chapter/start');
    assert.ok(await page.getByRole('heading', { name: 'Chapters', exact: true }).evaluate(el => el.getBoundingClientRect().top) < await page.getByRole('heading', { name: 'Now playing', exact: true }).evaluate(el => el.getBoundingClientRect().top));
    assert.ok(await page.locator('.co').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'course details fit the column');
    await page.screenshot({ path: path.join(shots, `course-detail-${width}-${theme}.png`) });
    await chapter.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'A small beginning', exact: true }).waitFor();
    const practice = page.getByRole('main', { name: 'Course practice' });
    assert.ok(await practice.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'chapter fits the viewport');
    await page.screenshot({ path: path.join(shots, `course-chapter-${width}-${theme}.png`) });
  }
  await page.goto(`${base}#/courses/voice`);
  assert.equal(await page.getByRole('link', { name: /A small beginning/ }).getAttribute('href'), '#/studio/start');
  assert.deepEqual(errors, []);
  console.log('PASS: Course list, chapter ordering, keyboard chapter links for voice and other courses, and responsive light/dark reading pages.');
} finally {
  await browser?.close();
  await server.close();
}
