// Real server, Chrome and synthetic microphone; never the owner's app or practice data.
// Start a fresh scratch server with two non-voice courses (first has two practice texts), then:
// LILT_URL=http://127.0.0.1:7979 node e2e/course-recording.mjs [screenshot-dir]
// Optional: LILT_TEST_COURSE and LILT_TEST_OTHER_COURSE choose those installed fixtures.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright-core';

assert.ok(process.env.LILT_URL, 'Set LILT_URL to an isolated scratch server.');
const base = new URL(process.env.LILT_URL);
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Use a local scratch server.');
assert.notEqual(base.port, '7878', 'Port 7878 belongs to the owner.');
const shots = process.argv[2];
if (shots) await mkdir(shots, { recursive: true });
const wav = fileURLToPath(new URL('fake-mic.wav', import.meta.url));
const url = route => new URL(route, base).href;
const get = async route => {
  const response = await fetch(url(route));
  assert.ok(response.ok, `${route}: ${response.status} ${await response.clone().text()}`);
  return response.json();
};
const post = async (route, body) => {
  const generation = (await fetch(url('/healthz'))).headers.get('X-Lilt-Generation');
  const response = await fetch(url(route), {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(generation ? { 'X-Lilt-Generation': generation } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  assert.ok(response.ok, `${route}: ${response.status} ${await response.clone().text()}`);
  return response.json();
};
const courses = (await get('/api/courses')).courses.filter(course => course.id !== 'voice');
const course = courses.find(course => course.id === process.env.LILT_TEST_COURSE) ?? courses[0];
const other = courses.find(candidate => candidate.id === process.env.LILT_TEST_OTHER_COURSE)
  ?? courses.find(candidate => candidate.id !== course?.id);
assert.ok(course && other && course.id !== other.id, 'Install two different non-voice fixture courses in scratch content.');
const texts = await get(`/api/texts?course=${course.id}`);
const chapter = texts.levels.find(level => level.items.length);
assert.ok(chapter, 'The first fixture course needs a practice text.');
const item = chapter.items[0];
const prompt = `${course.id}/text.${chapter.id}.${item.id}`;
const coursePath = `/learn/${course.id}`;
const before = {
  history: await get('/api/history'),
  sessions: await get('/api/sessions'),
  today: await get('/api/today'),
  jobs: await get('/api/jobs'),
};
const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${wav}`, '--autoplay-policy=no-user-gesture-required'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, permissions: ['microphone'], reducedMotion: 'reduce' });
let microphoneRequests = 0;
await context.exposeFunction('courseRecordingMicRequested', () => { microphoneRequests++; });
await context.addInitScript(() => {
  const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async constraints => {
    await window.courseRecordingMicRequested();
    return capture(constraints);
  };
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors = [], voiceRequests = [], takes = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => {
  const pathname = new URL(request.url()).pathname;
  if (/\/api\/(?:takes\/[^/]+\/(?:analysis|reanalyze)|sessions\/[^/]+\/review)$/.test(pathname)) voiceRequests.push(pathname);
});
const open = route => page.goto(url(`/#${route}`));
const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`) }); };
const reflectionField = () => page.getByRole('textbox', { name: /^Your reflection \(optional\)/ });
const noVoice = async () => {
  assert.equal(await page.locator('.tr-pitch, .ve-scope, .ve-start-card, .prc-insight').count(), 0, 'generic course shows no voice measurements or warmups');
  assert.doesNotMatch(await page.locator('#main').innerText(), /Find your starting voice|comfortable pitch|Measured pitch|hoarseness/i);
};
async function record(nativePlayback = true, failFinalize = false) {
  await page.getByRole('button', { name: 'Start recording', exact: true }).click();
  await page.getByRole('button', { name: 'Stop recording', exact: true }).waitFor();
  await page.waitForTimeout(2200); // The real MediaRecorder needs enough synthetic speech to save.
  const finalizeRoute = '**/api/takes/*/finalize';
  if (failFinalize) await page.route(finalizeRoute, route => route.fulfill({ status: 503, json: { error: 'The scratch test interrupted this audio save.' } }));
  const finalized = page.waitForResponse(response => /\/api\/takes\/[^/]+\/finalize$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
  let response = await finalized;
  if (failFinalize) {
    assert.equal(response.status(), 503);
    await page.getByRole('button', { name: 'Retry saving', exact: true }).waitFor();
    assert.ok(await page.getByRole('button', { name: 'Finish practice', exact: true }).isDisabled(), 'failed audio save keeps finishing locked');
    assert.ok(await page.getByRole('button', { name: 'Hide recorder', exact: true }).isDisabled(), 'failed audio save keeps its recorder mounted');
    await page.unroute(finalizeRoute);
    const retried = page.waitForResponse(response => /\/api\/takes\/[^/]+\/finalize$/.test(new URL(response.url()).pathname));
    await page.getByRole('button', { name: 'Retry saving', exact: true }).click();
    response = await retried;
  }
  assert.ok(response.ok(), `finalize succeeded: ${await response.text()}`);
  const take = await response.json();
  takes.push(take);
  assert.equal(take.status, 'saved');
  assert.equal(take.analysis_run, null);
  assert.ok(take.original.bytes > 1000, 'real microphone upload contains audio bytes');
  if (nativePlayback) await page.locator('audio[aria-label="Play saved recording"]').first().waitFor({ state: 'attached' });
  else await page.getByRole('button', { name: 'Play your recording', exact: true }).waitFor();
  return take;
}
async function playback(take) {
  const audio = page.locator(`audio[src="${take.audio_url}"]`).first();
  await audio.waitFor({ state: 'attached' });
  assert.ok(await audio.evaluate(audio => audio.controls), 'saved audio has native playback controls');
  await audio.evaluate(audio => audio.play());
  await page.waitForFunction(src => [...document.querySelectorAll('audio')].some(audio => audio.getAttribute('src') === src && !audio.paused && audio.currentTime > 0.1), take.audio_url);
  await audio.evaluate(audio => audio.pause());
  const bytes = await fetch(url(take.audio_url));
  assert.equal(bytes.status, 200);
  assert.equal((await bytes.arrayBuffer()).byteLength, take.original.bytes, 'playback serves the saved original');
  const decoded = await page.evaluate(async src => {
    const context = new AudioContext();
    try {
      const buffer = await context.decodeAudioData(await (await fetch(src)).arrayBuffer());
      const samples = buffer.getChannelData(0);
      return { duration: buffer.duration, peak: samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0) };
    } finally { await context.close(); }
  }, take.audio_url);
  assert.ok(decoded.duration > 1 && decoded.peak > 0.001, 'saved synthetic speech decodes as non-silent audio');
}
async function startGuided() {
  await open(`${coursePath}/guided`);
  await page.getByRole('heading', { name: 'Guided practice', exact: true }).waitFor();
  await page.getByRole('combobox', { name: /^Choose a practice text/ }).selectOption(prompt);
  const created = page.waitForResponse(response => new URL(response.url()).pathname === '/api/sessions' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  const response = await created;
  assert.ok(response.ok());
  const session = await response.json();
  await page.waitForURL(`**/#${coursePath}/practice/${session.id}`);
  assert.equal(session.kind, 'course_guided');
  assert.equal(session.course, course.id);
  assert.equal(session.task.prompt_id, prompt);
  assert.equal(session.task.text, item.text);
  assert.equal(session.task.hint, item.hint ?? '');
  await page.getByRole('heading', { name: session.task.title, exact: true }).waitFor();
  await noVoice();
  return session;
}
try {
  await open(coursePath);
  await page.getByRole('navigation', { name: 'Course navigation' }).getByRole('link', { name: 'Recordings', exact: true }).click();
  await page.getByRole('heading', { name: 'Recordings', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Open recorder', exact: true }).click();
  const free = await record();
  assert.equal(free.course, course.id);
  assert.equal(free.prompt_id, 'free');
  await playback(free);
  await noVoice();
  await shot('course-free-recording');

  const microphonesBeforeSilent = microphoneRequests;
  const silent = await startGuided();
  const reflection = 'I noticed the shape more clearly after taking my time.';
  await reflectionField().fill(reflection);
  await page.getByRole('button', { name: 'Finish practice', exact: true }).click();
  await page.getByText('Practice saved', { exact: true }).waitFor();
  await page.reload();
  await page.getByText('Practice saved', { exact: true }).waitFor();
  assert.equal(await reflectionField().inputValue(), reflection);
  const silentSaved = await get(`/api/sessions/${silent.id}`);
  assert.equal(silentSaved.session.state, 'completed');
  assert.equal(silentSaved.session.notes, reflection);
  assert.deepEqual(silentSaved.takes, [], 'practice can finish without requesting the microphone');
  assert.deepEqual(silentSaved.reviews, []);
  assert.equal(microphoneRequests, microphonesBeforeSilent, 'practice without audio never requests the microphone');
  await reflectionField().fill('');
  const cleared = page.waitForResponse(response => new URL(response.url()).pathname === `/api/sessions/${silent.id}` && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Save reflection', exact: true }).click();
  assert.ok((await cleared).ok());
  await page.reload();
  await page.getByText('Practice saved', { exact: true }).waitFor();
  assert.equal(await reflectionField().inputValue(), '', 'clearing a saved reflection survives reload');
  assert.ok(!(await get(`/api/sessions/${silent.id}`)).session.notes, 'the old reflection was removed from the saved session');

  const guided = await startGuided();
  await page.getByRole('button', { name: 'Record this practice', exact: true }).click();
  const guidedTake = await record(true, true);
  assert.equal(guidedTake.session_id, guided.id);
  assert.equal(guidedTake.prompt_id, prompt);
  await playback(guidedTake);
  const guidedReflection = 'A short recording helped me remember what I tried.';
  await reflectionField().fill(guidedReflection);
  // An explicit failed write leaves the reflection available for a user-driven retry.
  const patchUrl = `**/api/sessions/${guided.id}`;
  const failPatch = route => route.request().method() === 'PATCH'
    ? route.fulfill({ status: 503, json: { error: 'The scratch test interrupted this save.' } }) : route.continue();
  await page.route(patchUrl, failPatch);
  await page.getByRole('button', { name: 'Finish practice', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await reflectionField().inputValue(), guidedReflection);
  assert.equal((await get(`/api/sessions/${guided.id}`)).session.state, 'in_progress');
  await page.unroute(patchUrl, failPatch);
  await page.getByRole('button', { name: 'Finish practice', exact: true }).click();
  await page.getByText('Practice saved', { exact: true }).waitFor();
  await page.reload();
  await page.getByText('Practice saved', { exact: true }).waitFor();
  assert.equal(await reflectionField().inputValue(), guidedReflection);
  await playback(guidedTake);
  assert.deepEqual((await get(`/api/sessions/${guided.id}`)).session.task, guided.task, 'the saved task survives reload');
  await shot('course-guided-completed');

  await open(`${coursePath}/chapter/${chapter.id}/${item.id}`);
  await page.getByRole('button', { name: 'Record this practice', exact: true }).first().click();
  const chapterTake = await record();
  assert.equal(chapterTake.prompt_id, prompt);
  assert.equal(chapterTake.course, course.id);

  await open(`${coursePath}/today`);
  const daily = page.getByRole('region', { name: "Today's course cards" });
  await daily.getByRole('button', { name: 'Record this practice', exact: true }).click();
  const dailyTake = await record();
  assert.equal(dailyTake.course, course.id);
  assert.ok(dailyTake.prompt_id.startsWith(`${course.id}/text.`));
  const reveal = daily.getByRole('button', { name: /^(Show hint|I've tried it)$/ });
  if (await reveal.count()) await reveal.click();
  const reviewed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/deck/review');
  await daily.getByRole('button', { name: /^Again / }).click();
  const review = await reviewed;
  assert.ok(review.ok());
  assert.equal(review.request().postDataJSON().take_id, dailyTake.id, 'daily review attaches its own recording');
  const againDeck = (await review.json()).deck;
  const another = againDeck.items.find(candidate => !candidate.done_today && candidate.card.prompt_id !== dailyTake.prompt_id);
  assert.ok(another, 'the fixture has another card before the Again card returns');
  await daily.getByRole('button', { name: /^(Show hint|I've tried it)$/ }).click();
  const nextReviewed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/deck/review');
  await daily.getByRole('button', { name: /^Good / }).click();
  assert.ok((await nextReviewed).ok());
  await daily.getByRole('button', { name: /^(Show hint|I've tried it)$/ }).click();
  const againReviewed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/deck/review');
  await daily.getByRole('button', { name: /^Good / }).click();
  const againResponse = await againReviewed;
  assert.ok(againResponse.ok());
  assert.equal(againResponse.request().postDataJSON().card_id, review.request().postDataJSON().card_id);
  assert.equal(againResponse.request().postDataJSON().take_id, null, 'rating an Again card without new audio does not reuse its previous take');
  assert.equal((await againResponse.json()).deck.all_done, true, 'the second review completes the returned Again card');

  await open(`/flashcards/${chapter.id}?course=${course.id}`);
  await page.locator('.fc-card.top').waitFor();
  for (let skipped = 0; skipped < 30; skipped++) {
    if (await page.getByRole('button', { name: 'Record this practice', exact: true }).isVisible()) break;
    const current = await page.locator('.fc-card.top').getAttribute('aria-label');
    await page.getByRole('button', { name: 'Got it', exact: true }).click();
    await page.waitForFunction(previous => document.querySelector('.fc-card.top')?.getAttribute('aria-label') !== previous, current);
  }
  await page.getByRole('button', { name: 'Record this practice', exact: true }).click();
  const flashcardTake = await record(false);
  assert.equal(flashcardTake.course, course.id);
  assert.equal(flashcardTake.prompt_id, prompt);

  await open(`/learn/${other.id}/recordings`);
  await page.getByRole('heading', { name: 'Recordings', exact: true }).waitFor();
  assert.equal(await page.locator(`audio[src="${free.audio_url}"]`).count(), 0, 'another course never shows this course audio');
  await page.getByRole('button', { name: 'Open recorder', exact: true }).click();
  const otherTake = await record();
  assert.equal(otherTake.course, other.id);
  await open(`${coursePath}/recordings`);
  await page.locator(`audio[src="${free.audio_url}"]`).waitFor({ state: 'attached' });
  assert.equal(await page.locator(`audio[src="${otherTake.audio_url}"]`).count(), 0);
  await page.locator(`a[href="#${coursePath}/practice/${guided.id}"]`).click();
  await page.getByText('Practice saved', { exact: true }).waitFor();
  await noVoice();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => window.dispatchEvent(new CustomEvent('lilt:theme', { detail: theme })), theme);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.locator('#main main').evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'guided practice fits a phone');
    await shot(`course-guided-mobile-${theme}`);
  }

  const empty = await post('/api/takes', { take_id: randomUUID(), session_id: free.session_id, role: 'free', prompt_id: 'free', prompt_text: '', mime: 'audio/webm' });
  assert.equal(empty.original, null);
  await open(`${coursePath}/recordings`);
  const recordingSessions = page.getByRole('region', { name: 'Recording sessions', exact: true });
  await recordingSessions.locator('summary').first().click();
  const unfinished = recordingSessions.locator('li').filter({ hasText: 'No saved audio' });
  await unfinished.waitFor();
  page.once('dialog', dialog => dialog.accept());
  const deleted = page.waitForResponse(response => new URL(response.url()).pathname === `/api/takes/${empty.id}` && response.request().method() === 'DELETE');
  await unfinished.getByRole('button', { name: 'Delete recording', exact: true }).click();
  assert.ok((await deleted).ok());
  assert.equal((await fetch(url(`/api/takes/${empty.id}`))).status, 404, 'an unfinished recording can be removed');
  assert.ok(!(await get(`/api/sessions/${free.session_id}`)).takes.some(take => take.id === empty.id));

  await page.getByRole('button', { name: 'Open recorder', exact: true }).click();
  await page.getByRole('button', { name: 'Start recording', exact: true }).waitFor();
  await page.evaluate(() => {
    const start = MediaRecorder.prototype.start;
    MediaRecorder.prototype.start = function (...args) {
      MediaRecorder.prototype.start = start;
      throw new Error('The scratch capture could not start.');
    };
  });
  const takesBeforeFailedStart = (await get(`/api/sessions/${free.session_id}`)).takes.map(take => take.id);
  await page.getByRole('button', { name: 'Start recording', exact: true }).click();
  await page.getByText(/The scratch capture could not start\. Recording didn't start\./).waitFor();
  assert.ok(await page.getByRole('button', { name: 'Hide recorder', exact: true }).isEnabled(), 'failed capture start releases its parent controls');
  const failedTake = (await get(`/api/sessions/${free.session_id}`)).takes.find(take => !takesBeforeFailedStart.includes(take.id));
  assert.ok(failedTake && !failedTake.original, 'a refused capture is retained for explicit recovery');
  await page.getByRole('button', { name: 'Hide recorder', exact: true }).click();
  await page.getByRole('button', { name: 'Refresh recordings', exact: true }).click();
  await unfinished.waitFor();
  page.once('dialog', dialog => dialog.accept());
  const failedDeleted = page.waitForResponse(response => new URL(response.url()).pathname === `/api/takes/${failedTake.id}` && response.request().method() === 'DELETE');
  await unfinished.getByRole('button', { name: 'Delete recording', exact: true }).click();
  assert.ok((await failedDeleted).ok());
  assert.deepEqual((await get(`/api/sessions/${free.session_id}`)).takes.map(take => take.id), takesBeforeFailedStart, 'explicit recovery removes only the failed capture');

  await open(`/learn/${other.id}/practice/${guided.id}`);
  await page.getByRole('alert').waitFor();
  assert.equal(await reflectionField().count(), 0, 'cross-course session URL does not expose its reflection');

  const history = await get(`/api/history?course=${course.id}`);
  assert.ok(history.takes.some(take => take.id === free.id));
  assert.ok(history.takes.every(take => take.course === course.id));
  const sessions = await get(`/api/sessions?course=${course.id}`);
  assert.ok(sessions.sessions.some(session => session.id === guided.id));
  assert.ok(sessions.sessions.every(session => session.course === course.id));
  assert.deepEqual((await get('/api/history')).takes, before.history.takes, 'default voice history is unchanged');
  assert.deepEqual((await get('/api/sessions')).sessions, before.sessions.sessions, 'default voice sessions are unchanged');
  const today = await get('/api/today');
  assert.deepEqual(today.participation, before.today.participation, 'generic sessions do not count as voice participation');
  assert.deepEqual(today.today_sessions, before.today.today_sessions);
  assert.deepEqual((await get('/api/jobs')).jobs, before.jobs.jobs, 'generic audio never queues voice analysis');
  for (const saved of takes) {
    const take = await get(`/api/takes/${saved.id}`);
    assert.equal(take.status, 'saved');
    assert.equal(take.analysis_run, null);
    assert.equal(take.analysis_summary, null);
    assert.deepEqual((await get(`/api/sessions/${take.session_id}`)).reviews, []);
  }
  assert.deepEqual(voiceRequests, [], 'generic UI never requests voice analysis or coaching');
  assert.deepEqual(errors, [], 'no unhandled browser errors');
  const backup = await post('/api/backups');
  assert.ok(backup.id, 'completed generic recordings allow a scratch backup');
  console.log('PASS: course audio saves and plays; guided practice completes with or without audio; reflections survive reload and failed saves; chapter/daily/flashcard audio and histories stay course-scoped; voice data and analysis stay untouched.');
} catch (error) {
  console.error(await page.locator('#main').innerText().catch(() => 'The page was unavailable.'));
  await shot('course-recording-failure').catch(() => {});
  throw error;
} finally {
  await browser.close();
}
