// node --test src/yarn.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { hzToMidi, midiToHz } from "./pitch.ts";
import {
  breakDue, catReaction, cueDue, describePlay, duration, follower, lineUp, loopMaker, MARGIN, MIN_SPAN_ST, nextLoop, loopNews, noisyRoom, passLoops, PAT_EVERY, PAT_S, pitchToU, spunThread,
  lineFor, pitchToY, playRange, SAY_S, tuneOf, rangeFromHums, REST_Y, saidIt, sentencesFrom, SENTENCES, threads, uToHz, uToY, wind, type Loop,
} from "./yarn.ts";

const RANGE: [number, number] = [150, 300]; // an octave
const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);

test("the cat perks up once after threading, then settles", () => {
  assert.equal(catReaction(10, -Infinity, .5, false).hop, 0);
  assert.equal(catReaction(10, 11, .5, false).hop, 0);
  assert.ok(catReaction(10.3, 10, .5, false).hop > .5);
  assert.equal(catReaction(12, 10, .5, false).hop, 0);
  assert.equal(catReaction(0, -Infinity, .5, false).hop, 0, "a fresh game has no leftover reaction");
});

test("the cat reaches for nearby yarn without asking for higher notes", () => {
  assert.ok(catReaction(2, -Infinity, .9, false).reach > .8, "hanging low beside it");
  assert.equal(catReaction(2, -Infinity, .4, false).reach, 0);
});

test("yarn resting on the floor gets a pat as it lands and now and then after", () => {
  const pat = (t: number) => catReaction(t, -Infinity, REST_Y, false, 10).reach;
  assert.ok(pat(10 + PAT_S / 2) > .9, "as it lands");
  assert.equal(pat(10 + 1.5), 0, "then rests");
  assert.ok(pat(10 + PAT_EVERY + PAT_S / 2) > .9, "and pats again");
  assert.equal(catReaction(10.2, -Infinity, REST_Y, true, 10).reach, 0, "not with reduced motion");
});

test("reduced motion keeps cat decorations still across time and events", () => {
  assert.deepEqual(catReaction(10.3, 10, .95, true), { hop: 0, reach: 0, blink: false });
  assert.deepEqual(catReaction(45, 44.9, .95, true), catReaction(0, -Infinity, .4, true));
});

test("the ends of your range sit inside the field, with room above and below", () => {
  close(pitchToY(150, RANGE), 1 - MARGIN);
  close(pitchToY(300, RANGE), MARGIN);
  // the middle of an octave, to the ear, is a fifth-ish geometric middle, not 225 Hz
  close(pitchToY(Math.sqrt(150 * 300), RANGE), 0.5);
  close(uToHz(pitchToU(212, RANGE), RANGE), 212, 1e-9);
  // higher is always higher on screen
  assert.ok(pitchToY(200, RANGE) < pitchToY(180, RANGE));
});

test("pitches far outside the range stay on screen", () => {
  assert.ok(pitchToY(60, RANGE) <= REST_Y && pitchToY(60, RANGE) > 0.9);
  assert.ok(pitchToY(700, RANGE) >= 0.03);
  assert.equal(uToY(-5), REST_Y);
  assert.equal(uToY(5), 0.03);
});

test("a narrow comfortable range is widened around its middle", () => {
  const [lo, hi] = playRange([180, 200]);
  close(hzToMidi(hi) - hzToMidi(lo), MIN_SPAN_ST, 1e-9);
  close((hzToMidi(hi) + hzToMidi(lo)) / 2, (hzToMidi(180) + hzToMidi(200)) / 2, 1e-9);
  assert.deepEqual(playRange([300, 150]), [150, 300]);
  assert.deepEqual(playRange(RANGE), RANGE);
});

/** Feeds a follower readings every 10 ms and steps it like a 60 fps loop; returns the height. */
function run(f: ReturnType<typeof follower>, from: number, to: number, hz: (t: number) => number | null) {
  let last = { y: f.y, afloat: false };
  for (let t = from; t < to; t += 0.01) {
    f.push(t, hz(t));
    if (Math.round(t * 100) % 2 === 0) last = f.step(t, 0.02);
  }
  return last;
}

test("a steady hum lifts the yarn to its place and keeps it there", () => {
  const f = follower(RANGE, "hum");
  const s = run(f, 0, 1, () => 300);
  assert.ok(s.afloat);
  close(s.y, pitchToY(300, RANGE), 0.01);
});

test("a one-off octave slip doesn't move the yarn; a real leap does, after a moment", () => {
  const f = follower(RANGE, "hum");
  run(f, 0, 1, () => 160);
  const before = f.y;
  // three readings an octave up (a tracker glitch)
  run(f, 1, 1.03, () => 320);
  const s = run(f, 1.03, 1.3, () => 160);
  close(s.y, before, 0.01);
  // a sustained jump to the top is followed
  const up = run(f, 1.3, 2.3, () => 300);
  close(up.y, pitchToY(300, RANGE), 0.01);
});

test("the yarn eases into a rise rather than jumping", () => {
  const f = follower(RANGE, "hum");
  const s = run(f, 0, 0.04, () => 300);
  const moved = (REST_Y - s.y) / (REST_Y - pitchToY(300, RANGE));
  assert.ok(moved > 0 && moved < 0.25, `moved ${moved}`);
  assert.ok(f.v < 0, "still rising");
  // and it doesn't overshoot on the way
  let top = 1;
  for (let t = 0.04; t < 1.5; t += 0.01) { f.push(t, 300); top = Math.min(top, f.step(t, 0.01).y); }
  assert.ok(top >= pitchToY(300, RANGE) - 1e-3);
});

test("after a long quiet, a new note starts fresh instead of from the old one", () => {
  const f = follower(RANGE, "hum");
  run(f, 0, 1, () => 300);
  run(f, 1, 5, () => null);
  close(f.y, REST_Y, 1e-9);
  let top = 1;
  for (let t = 5; t < 5.4; t += 0.01) { f.push(t, 160); top = Math.min(top, f.step(t, 0.01).y); }
  assert.ok(top >= pitchToY(160, RANGE) - 0.01, `rose to ${top}, past the new note at ${pitchToY(160, RANGE)}`);
});

test("the yarn floats down gently and comes to rest on the floor", () => {
  const f = follower(RANGE, "hum");
  run(f, 0, 1, () => 300);
  let fastest = 0;
  for (let t = 1; t < 5; t += 0.02) { f.push(t, null); f.step(t, 0.02); fastest = Math.max(fastest, f.v); }
  assert.ok(fastest < 0.65, `fell at ${fastest} of the field a second`);
  close(f.y, REST_Y, 1e-9);
  assert.equal(f.v, 0);
});

test("short gaps hold the yarn; a long quiet lets it drift down to rest", () => {
  const f = follower(RANGE, "speak");
  run(f, 0, 1.5, () => 250);
  const held = run(f, 1.5, 2.0, () => null); // half a second between words
  assert.ok(held.afloat);
  close(held.y, pitchToY(250, RANGE), 0.02);
  const rest = run(f, 2.0, 8, () => null);
  assert.ok(!rest.afloat);
  close(rest.y, REST_Y, 0.01);
  // a hum gap is held for less time than speech
  const h = follower(RANGE, "hum");
  run(h, 0, 1, () => 250);
  assert.ok(!run(h, 1, 1.5, () => null).afloat);
});

test("speech is smoothed: a wobbly sentence moves the yarn less than the voice", () => {
  const f = follower(RANGE, "speak");
  let lo = 1, hi = 0;
  run(f, 0, 0.5, () => 200);
  for (let t = 0.5; t < 3; t += 0.01) {
    f.push(t, 200 * 2 ** (Math.sin(t * 2 * Math.PI * 4) * 3 / 12)); // ±3 semitones, 4 times a second
    const { y } = f.step(t, 0.01);
    lo = Math.min(lo, y); hi = Math.max(hi, y);
  }
  const voiceSpan = pitchToY(200 * 2 ** (-3 / 12), RANGE) - pitchToY(200 * 2 ** (3 / 12), RANGE);
  assert.ok(hi - lo < voiceSpan * 0.5, `${hi - lo} vs ${voiceSpan}`);
});

test("while Lilt plays a loop's note, what the mic hears is ignored", () => {
  const f = follower(RANGE, "hum");
  f.mute(1);
  const s = run(f, 0, 0.9, () => 300);
  assert.ok(!s.afloat);
  assert.ok(run(f, 1, 1.5, () => 300).afloat);
});

test("a short sound while you're humming doesn't let the yarn sag", () => {
  const f = follower(RANGE, "hum");
  run(f, 0, 1, () => 250);
  const up = f.y;
  f.mute(1.35, 1);
  let low = 0;
  for (let t = 1; t < 1.35; t += 0.01) { f.push(t, 250); low = Math.max(low, f.step(t, 0.01).y); }
  close(low, up, 0.005);
  // muting while you're quiet doesn't hold anything up
  const q = follower(RANGE, "hum");
  run(q, 0, 1, () => 250);
  run(q, 1, 2, () => null);
  q.mute(3, 2);
  assert.ok(!run(q, 2, 2.6, () => null).afloat);
});

test("loops open middle, high, low, then stay gentle and inside the range", () => {
  const m = loopMaker("hum", 7);
  const loops: Loop[] = [];
  while (loops.length < 200) loops.push(...m.next());
  assert.deepEqual(loops.slice(0, 3).map((l) => l.u), [0.5, 0.8, 0.2]);
  for (let i = 1; i < loops.length; i++) {
    assert.ok(loops[i].at > loops[i - 1].at, "in time order");
    assert.ok(loops[i].at - loops[i - 1].at >= 1.9, "never crowded");
    assert.ok(Math.abs(loops[i].u - loops[i - 1].u) <= 0.6 + 1e-9, "no wild jumps after the opening");
    assert.ok(loops[i].u >= 0.1 && loops[i].u <= 0.9);
  }
  // the same seed deals the same loops
  const again = loopMaker("hum", 7), first = again.next();
  assert.equal(first[0].u, loops[0].u);
  // speech loops are bigger and nearer the middle
  const s = loopMaker("speak", 3), sp: Loop[] = [];
  while (sp.length < 100) sp.push(...s.next());
  assert.ok(sp.every((l) => l.u >= 0.25 && l.u <= 0.7 && l.r > loops[0].r));
});

test("humming now and then brings a longer, eased glide, never crowded", () => {
  const loops: Loop[] = [], m = loopMaker("hum", 11);
  while (loops.length < 400) loops.push(...m.next());
  const glides = new Map<number, Loop[]>();
  for (const l of loops) if (l.group) glides.set(l.group, [...(glides.get(l.group) ?? []), l]);
  const fives = [...glides.values()].filter((g) => g.length === 5);
  assert.ok(fives.length >= 5, `${fives.length} glides`);
  for (const g of fives) {
    const steps = g.slice(1).map((l, i) => l.u - g[i].u);
    assert.ok(steps.every((d) => d >= 0) || steps.every((d) => d <= 0), "one direction");
    assert.ok(Math.abs(g[4].u - g[0].u) >= 0.25, "goes somewhere");
    assert.ok(Math.abs(steps[0]) < Math.abs(steps[1]), "eases in");
    assert.ok(new Set(g.map((l) => l.hue)).size === 1, "one colour");
  }
  for (let i = 1; i < loops.length; i++) assert.ok(loops[i].at - loops[i - 1].at >= 1.9);
});

test("speaking deals a sentence's start and end: rising or falling pairs", () => {
  const loops: Loop[] = [], m = loopMaker("speak", 5);
  while (loops.length < 200) loops.push(...m.next());
  for (let i = 0; i < loops.length; i += 2) {
    const [a, b] = [loops[i], loops[i + 1]];
    assert.equal(a.group, b.group);
    assert.ok(a.tune && a.tune === b.tune);
    close(b.at - a.at, SAY_S, 1e-9);
    assert.ok(a.tune === "rise" ? b.u - a.u >= 0.2 : a.u - b.u >= 0.2, `${a.tune} ${a.u} → ${b.u}`);
    if (i) assert.ok(a.at - loops[i - 1].at >= 1.9, "a pause between sentences");
  }
  assert.ok(loops.some((l) => l.tune === "rise") && loops.some((l) => l.tune === "fall"));
});

test("a line's tune: yes/no questions rise, other lines settle, and a line to fit can be picked", () => {
  assert.equal(tuneOf("Is this seat free?"), "rise");
  assert.equal(tuneOf("Hi, could I get a coffee, please?"), "rise");
  assert.equal(tuneOf("Good morning. How are you today?"), "fall");
  assert.equal(tuneOf("Where's the station?"), "fall");
  assert.equal(tuneOf("Have a lovely evening."), "fall");
  const lines = ["Is this seat free?", "Have a lovely evening.", "Could you say that again, please?", "Thank you so much."];
  for (const r of [0, 0.3, 0.6, 0.99]) {
    assert.equal(tuneOf(lines[lineFor(lines, "rise", r)]), "rise");
    assert.equal(tuneOf(lines[lineFor(lines, "fall", r)]), "fall");
  }
  assert.equal(lineFor(lines, "rise", 0, 0), 2, "another line, when there is one");
  assert.equal(lineFor(["Thank you."], "rise", 0.5), 0, "any line when none fits");
});

test("a loop is threaded when the yarn is in its opening as it arrives, else it drifts by", () => {
  const loop: Loop = { id: 1, at: 5, u: 0.5, r: 0.085, hue: 0, state: "ahead" };
  assert.ok(threads(uToY(0.5) + 0.05, loop));
  assert.ok(!threads(uToY(0.5) + 0.1, loop));
  const early = passLoops([loop], 4.9, uToY(0.9));
  assert.equal(early.loops[0].state, "ahead");
  const hit = passLoops([loop], 5.01, uToY(0.52));
  assert.equal(hit.loops[0].state, "through");
  assert.equal(hit.threaded.length, 1);
  const miss = passLoops([loop], 5.01, uToY(0.9));
  assert.equal(miss.loops[0].state, "by");
  assert.equal(miss.threaded.length, 0);
  // decided once: passing again doesn't change it, and old loops are let go
  assert.equal(passLoops(hit.loops, 6, uToY(0.9)).loops[0].state, "through");
  assert.equal(passLoops(hit.loops, 20, uToY(0.5)).loops.length, 0);
});

test("the next loop glows as the yarn lines up with it, without changing what threads", () => {
  const loops: Loop[] = [
    { id: 1, at: 2, u: 0.2, r: 0.085, hue: 0, state: "by" },
    { id: 2, at: 5, u: 0.5, r: 0.085, hue: 1, state: "ahead" },
    { id: 3, at: 9, u: 0.8, r: 0.085, hue: 2, state: "ahead" },
  ];
  assert.equal(nextLoop(loops, 4)?.id, 2);
  assert.equal(nextLoop(loops, 6)?.id, 3);
  assert.equal(nextLoop([], 0), null);
  const l = loops[1], mid = uToY(l.u);
  assert.equal(lineUp(mid, l), 1);
  assert.ok(lineUp(mid + 0.06, l) > 0 && lineUp(mid + 0.06, l) < 1, "eases off towards the edge");
  assert.equal(lineUp(mid + 0.3, l), 0);
  assert.ok(lineUp(mid + 0.05, l) > lineUp(mid + 0.08, l), "closer glows more");
  // anything that threads glows at least a little
  for (let d = 0; d <= 0.085; d += 0.005) if (threads(mid + d, l)) assert.ok(lineUp(mid + d, l) > 0.3);
});

test("threaded loops wind their colours onto the ball, the newest outermost", () => {
  assert.deepEqual(wind([], 2), [2]);
  assert.deepEqual(wind([0, 1, 2, 3], 1), [1, 2, 3, 1]);
  assert.deepEqual(wind([0, 1], 3, 2), [1, 3]);
});

test("loops coming near are described in words for screen readers", () => {
  const one: Loop = { id: 1, at: 5, u: 0.8, r: 0.085, hue: 0, state: "ahead" };
  assert.equal(loopNews(one, [one]), "A loop is coming, near the top of your range.");
  assert.equal(loopNews({ ...one, u: 0.5 }, []), "A loop is coming, near the middle of your range.");
  const glide = [0.2, 0.25, 0.4, 0.55, 0.7].map((u, k): Loop => ({ id: 2 + k, at: 10 + 2 * k, u, r: 0.085, hue: 1, state: "ahead", group: 4 }));
  assert.equal(loopNews(glide[0], glide), "A glide is coming, from the bottom up to the top of your range.");
  assert.equal(loopNews(glide[2], glide), null, "the rest of a glide is already described");
  const slope = [0.4, 0.45, 0.5].map((u, k): Loop => ({ id: 9 + k, at: 30 + 2 * k, u, r: 0.085, hue: 1, state: "ahead", group: 5 }));
  assert.equal(loopNews(slope[0], slope), "A few loops are coming, near the middle of your range.");
});

test("a loop's note plays once as it comes into view, only while you're quiet", () => {
  const loop: Loop = { id: 1, at: 10, u: 0.5, r: 0.085, hue: 0, state: "ahead" };
  assert.ok(cueDue(loop, 7.5, 2.6, 1));
  assert.ok(!cueDue(loop, 7.5, 2.6, 0.1), "not over your own voice");
  assert.ok(!cueDue(loop, 5, 2.6, 1), "not before it's near");
  assert.ok(!cueDue(loop, 9.5, 2.6, 1), "not once it's almost there");
});

test("breaks every two minutes; a sentence is said after voice and a pause", () => {
  assert.ok(!breakDue(119, 0));
  assert.ok(breakDue(120, 0));
  assert.ok(!breakDue(200, 120));
  assert.ok(saidIt(1.2, 1.3));
  assert.ok(!saidIt(0.3, 3));
  assert.ok(!saidIt(2, 0.5));
});

test("a noisy room is noticed from the background between words", () => {
  const quiet = Array.from({ length: 400 }, (_, i) => ({ hz: i % 3 ? 200 : null, v: i % 3 ? 0.1 : 0.002 }));
  const noisy = Array.from({ length: 400 }, (_, i) => ({ hz: i % 3 ? 200 : null, v: i % 3 ? 0.1 : 0.03 }));
  assert.ok(!noisyRoom(quiet));
  assert.ok(noisyRoom(noisy));
  assert.ok(!noisyRoom(noisy.slice(0, 100)), "needs a couple of seconds first");
  const hum = Array.from({ length: 400 }, (_, i) => ({ hz: i % 20 ? 200 : null, v: 0.15 }));
  assert.ok(!noisyRoom(hum), "a long loud hum has no gaps to judge by");
});

test("two hums make a range, in either order, forgiving of gaps", () => {
  const hum = (hz: number, n = 150) => Array.from({ length: n }, (_, i) => (i % 5 === 0 ? null : hz * (1 + ((i % 3) - 1) * 0.005)));
  assert.deepEqual(rangeFromHums(hum(140), hum(260)), [140, 260]);
  assert.deepEqual(rangeFromHums(hum(260), hum(140)), [140, 260]);
  const [lo, hi] = rangeFromHums(hum(180), hum(190))!;
  assert.ok(hzToMidi(hi) - hzToMidi(lo) >= MIN_SPAN_ST - 0.1);
  assert.equal(rangeFromHums(hum(180, 20), hum(260)), null);
});

test("how it went is described in words, never graded", () => {
  assert.equal(duration(40), "40 seconds");
  assert.equal(duration(65), "about a minute");
  assert.equal(duration(120), "2 minutes");
  assert.equal(duration(150), "2 and a half minutes");
  const frames = Array.from({ length: 600 }, (_, i) => ({ t: i * 0.01, hz: midiToHz(hzToMidi(150) + 10), c: 0.97, v: 0.1 }));
  const lines = describePlay(frames, RANGE, 125, "speak", 3);
  assert.deepEqual(lines, ["You kept the yarn afloat for 2 minutes.", "Your voice was mostly in the upper half of your range.", "You said 3 sentences along the way."]);
  const low = frames.map((f) => ({ ...f, hz: 160 }));
  assert.match(describePlay(low, RANGE, 30, "hum")[1], /lower half/);
  assert.match(describePlay([], RANGE, 1, "hum")[0], /rested/);
  assert.ok(!describePlay(frames, RANGE, 125, "hum").join(" ").match(/score|%|out of|great|poor|well done/i));
});

test("the thread you spun follows your voice across the game, with gaps where you were quiet", () => {
  // a slow rise from the bottom of the range to the top, with a quiet second in the middle
  const frames = Array.from({ length: 1000 }, (_, i) => ({ t: i * 0.01, hz: i >= 450 && i < 550 ? null : midiToHz(hzToMidi(150) + 12 * i / 1000), c: 0.97, v: 0.1 }));
  const th = spunThread(frames, RANGE, 20);
  assert.equal(th.length, 20);
  close(th[1]!, 0.075, 0.03);
  close(th[18]!, 0.925, 0.03);
  assert.equal(th[9], null);
  assert.equal(th[10], null);
  const said = th.filter((u): u is number => u !== null);
  assert.ok(said.every((u, i) => !i || u >= said[i - 1]), "rises as the voice did");
  // a far-off note stays on the card; too little voice gives no thread
  const high = frames.map((f) => ({ ...f, hz: 900 }));
  assert.ok(spunThread(high, RANGE, 10).every((u) => u === 1.2));
  assert.deepEqual(spunThread(frames.slice(0, 10), RANGE), []);
});

test("speak mode takes the course's everyday phrases, else a built-in list", () => {
  const phrases = { kind: "phrases", items: ["Hi, could I get a coffee, please?", "Black coffee, please.", "Thank you so much.", "Good morning. How are you?", "mmm ↗ ↘"].map((text) => ({ text })) };
  assert.deepEqual(sentencesFrom([{ kind: "hum", items: [{ text: "mm-hm" }] }, phrases]), phrases.items.slice(0, 4).map((i) => i.text));
  assert.equal(sentencesFrom([]), SENTENCES);
});
