// Course browsing and direct chapter links, with no live API or practice data.
import { chromium } from 'playwright-core';
import { createIsolatedVite } from './isolated-vite.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const shots = fileURLToPath(new URL('../../.tmp/course-ui-shots/', import.meta.url));
const voiceSource = (await readFile(new URL('../../content/courses/voice/01-start-here.md', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const voiceIntro = voiceSource.split(/^## /m)[0].split('---').at(-1).trim();
const voiceItems = voiceSource.split(/^## /m).slice(1).map(section => {
  const [id, ...lines] = section.trim().split(/\r?\n/);
  const [text, hint] = lines.join('\n').trim().split(/\n\n> /);
  return { id, text, hint };
});
const voiceNote = (await readFile(new URL('../../content/courses/voice/_about.md', import.meta.url), 'utf8')).split('---').at(-1).trim();
const courses = [
  { id: 'drawing', title: 'Drawing gently', kind: 'drawing', summary: 'Explore lines, shapes and everyday objects, one small sketch at a time.' },
  { id: 'voice', title: 'Your voice', kind: 'voice', summary: 'A few comfortable minutes to explore your voice.' },
].map(c => ({ ...c, version: '1', source: null, locked_sections: [], using: 'original', changes: 0, updates_waiting: 0, shown_in_app: true }));
const server = await createIsolatedVite({ root: process.env.LILT_UI_BUILD || fileURLToPath(new URL('../', import.meta.url)), logLevel: 'error' });
let browser;
try {
  await mkdir(shots, { recursive: true });
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
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
    if (p === '/api/deck/today') return send({ items: [], counts: { new: 0, review: 0, again: 0 }, open_stage: 1, all_done: true, paused: false });
    if (p === '/api/studio/session') return send({ id: 'fixture-session' });
    if (p === '/api/sessions/fixture-session') return send({ takes: [] });
    if (p === '/api/texts' && course === 'voice') return send({ note: voiceNote, home: voiceIntro, levels: [{ id: 'start-here', level: 1, title: 'Start here', subtitle: 'Your mic, your space, and your voice today', kind: 'phrases', basis: voiceIntro, check_in: 'today', items: voiceItems }] });
    if (p === '/api/texts') return send({ note: '', home: 'Make a little room to explore.', levels: [{ id: 'start', level: 1, title: 'A small beginning', subtitle: 'Try a little, then pause.', kind: 'phrase',
      basis: '## Find your starting point\n\nChoose something close to hand.\n\n> Take your time. There is no single pace for learning.',
      items: [{ id: 'first-lines', text: 'Draw three loose circles.\n\n- Try a light touch.\n- Let each one be different.', hint: 'Notice how the movement feels in your hand.' }],
    }] });
    if (p === '/api/profile') return send({ goal: { summary: '', descriptors: [] }, comfort_range_hz: [100, 260], session_minutes: 5 });
    if (p === '/api/history') return send({ takes: [] });
    if (p === '/api/sessions') return send({ sessions: [], next_cursor: null });
    if (p === '/api/photos') return send({ uploaded: [], hidden: [] });
    return route.fulfill({ status: 503, json: { error: 'No live API in this fixture.' } });
  });
  const base = server.resolvedUrls.local[0];
  const checkColumn = async (column, width, label, content = 1200) => {
    await column.waitFor();
    const box = await column.evaluate(el => {
      const rect = el.getBoundingClientRect(), style = getComputedStyle(el), viewport = el.closest('.ds-body');
      return { center: (rect.left + rect.right) / 2, content: rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), overflow: viewport.scrollWidth > viewport.clientWidth + 1 };
    });
    assert.ok(Math.abs(box.center - width / 2) <= 1, `${label} stays centered`);
    assert.ok(!box.overflow, `${label} fits its column`);
    if (width >= 1440) assert.ok(Math.abs(box.content - content) <= 1, `${label} has its reading width (${box.content}px, expected ${content}px)`);
  };
  for (const theme of ['light', 'dark']) for (const width of [390, 1440, 1920]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(`${base}#/courses`);
    await page.evaluate(theme => window.dispatchEvent(new CustomEvent('lilt:theme', { detail: theme })), theme);
    const course = page.locator('.co-list').getByRole('button', { name: /Drawing gently/ });
    await course.waitFor();
    await checkColumn(page.locator('.co'), width, 'Course list');
    await page.screenshot({ path: path.join(shots, `courses-${width}-${theme}.png`) });
    await course.click();
    const chapter = page.getByRole('link', { name: /A small beginning/ });
    await chapter.waitFor();
    assert.equal(await chapter.getAttribute('href'), '#/learn/drawing/chapter/start');
    assert.ok(await page.getByRole('heading', { name: 'Chapters', exact: true }).evaluate(el => el.getBoundingClientRect().top) < await page.getByRole('heading', { name: 'Now playing', exact: true }).evaluate(el => el.getBoundingClientRect().top));
    assert.ok(await page.locator('.co').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'course details fit the column');
    await checkColumn(page.locator('.co'), width, 'Course details');
    await page.screenshot({ path: path.join(shots, `course-detail-${width}-${theme}.png`) });
    await chapter.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'A small beginning', exact: true }).waitFor();
    const practice = page.getByRole('main', { name: 'Course practice' });
    assert.ok(await practice.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'chapter fits the viewport');
    await checkColumn(practice.locator(':scope > div'), width, 'Other-course chapter', 880);
    await page.screenshot({ path: path.join(shots, `course-chapter-${width}-${theme}.png`) });
    await page.goto(`${base}#/learn/drawing`);
    await page.getByRole('heading', { name: 'Drawing gently', exact: true }).waitFor();
    await checkColumn(page.getByRole('main', { name: 'Course practice' }).locator(':scope > div'), width, 'Other-course home', 880);
    await page.getByText('Course guide', { exact: true }).click();
    await checkColumn(page.locator('details .md'), width, 'Other-course guide', 880);
    await page.goto(`${base}#/learn/drawing/today`);
    await checkColumn(page.getByRole('main', { name: 'Course practice' }).locator(':scope > div'), width, 'Other-course daily practice', 880);
    await page.goto(`${base}#/texts?course=drawing`);
    await checkColumn(page.locator('.tx'), width, 'Practice texts');
    if (!process.env.LILT_UI_BUILD) {
      for (const route of ['guided', 'recordings']) {
        await page.goto(`${base}#/learn/drawing/${route}`);
        await checkColumn(page.locator('.course-frame > div'), width, `Other-course ${route}`, 880);
      }
    }
  }
  await page.goto(`${base}#/courses/voice`);
  assert.equal(await page.getByRole('link', { name: /A small beginning/ }).getAttribute('href'), '#/studio/start');
  for (const theme of ['light', 'dark']) for (const width of [390, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto(`${base}#/studio/start-here/today`);
    await page.evaluate(theme => window.dispatchEvent(new CustomEvent('lilt:theme', { detail: theme })), theme);
    await page.locator('.ve-chapter .ve-item.on').waitFor().catch(async error => {
      console.error({ errors, text: await page.locator('body').innerText() });
      throw error;
    });
    const sidebar = page.getByRole('button', { name: 'Hide sidebar', exact: true });
    if (await sidebar.isVisible()) await sidebar.click();
    // A link to a text opens the chapter's Practise tab; Learn holds the intro and steps.
    assert.equal(await page.getByRole('tab', { name: /^Practise/ }).getAttribute('aria-selected'), 'true', 'a text link opens Practise');
    const layout = await page.locator('.ve-chapter').evaluate(el => {
      const row = el.querySelector('.ve-item.on'), other = el.querySelector('.ve-item:not(.on)');
      const first = el.querySelector('.ve-item:first-child');
      const marker = first.querySelector('.ve-mk'), text = first.querySelector('.ve-checkin, .readtext');
      return { width: el.getBoundingClientRect().width, overflow: el.scrollWidth > el.clientWidth + 1,
        centerOffset: (el.getBoundingClientRect().left + el.getBoundingClientRect().right) / 2 - (el.closest('.ve-page').getBoundingClientRect().left + el.closest('.ve-page').getBoundingClientRect().right) / 2,
        exercisesWidth: el.querySelector('.ve-items').getBoundingClientRect().width,
        markerGap: text.getBoundingClientRect().left - marker.getBoundingClientRect().right,
        selectedBackground: getComputedStyle(row).backgroundColor,
        selectedBorder: ['borderTopWidth', 'borderLeftWidth', 'borderRightWidth'].map(property => getComputedStyle(row)[property]),
        ink: getComputedStyle(other.querySelector('.readtext')).color, hint: getComputedStyle(other.querySelector('.ve-hint')).color,
        activeInk: getComputedStyle(row.querySelector('.readtext')).color };
    });
    assert.ok(!layout.overflow, 'voice chapter fits its column');
    assert.ok(Math.abs(layout.centerOffset) <= 1, 'chapter stays centered');
    if (width > 860) assert.ok(layout.markerGap >= 8, 'exercise number stays clear of the text');
    if (width >= 1440) assert.ok(Math.abs(layout.width - 960) <= 1, 'desktop chapter is a centred 960px reading column');
    assert.equal(layout.selectedBackground, 'rgba(0, 0, 0, 0)', 'selected exercise keeps the plain reading surface');
    assert.deepEqual(layout.selectedBorder, ['0px', '0px', '0px'], 'selected exercise has no enclosing panel');
    assert.ok([layout.hint, layout.activeInk].includes(layout.ink), 'inactive exercise stays readable, including on hover');
    await page.locator('.ve-item').nth(1).hover();
    assert.equal(await page.locator('.ve-item').nth(1).evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)', 'hover keeps the plain surface');
    await page.mouse.move(0, 0);
    await page.locator('.ve-page').evaluate(el => { el.scrollTop = 0; });
    await page.screenshot({ path: path.join(shots, `voice-chapter-${width}-${theme}.png`) });
    await page.locator('.ve-item').nth(1).click();
    assert.equal(await page.locator('.ve-item.on .readtext').textContent(), voiceItems[1].text);
    await page.goto(`${base}#/studio`);
    await checkColumn(page.locator('.ve-home-col'), width, 'Voice course home', 880);
    await page.goto(`${base}#/studio/chapters`);
    await page.locator('.ve-course-guide > summary').click();
    await checkColumn(page.locator('.ve-course-guide .md'), width, 'Voice course guide', 880);
    await page.screenshot({ path: path.join(shots, `voice-home-${width}-${theme}.png`) });
  }
  assert.deepEqual(errors, []);
  console.log('PASS: Centered, consistent course widths, chapter ordering, keyboard chapter links, and responsive light/dark reading pages.');
} finally {
  await browser?.close();
  await server.close();
}
