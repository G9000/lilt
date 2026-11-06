import { useEffect, useState } from "react";
import { micInUse } from "../micuse";
import { Ambience, MOODS as ALL_MOODS, walkingBass } from "./moods";

/**
 * The lo-fi radio: music made live with Web Audio. Electric-piano keys, plucked strings, a music
 * box, a kalimba or slow pads, through a wobbling tape delay; a sine bass; swung drums from noise;
 * and the sound of somewhere around it (rain, the sea, a fire, crickets, birds, vinyl crackle).
 * Nothing is downloaded or sent anywhere. It pauses itself whenever the microphone is in use.
 */

const MOODS = ALL_MOODS;
export const radioMoods = MOODS.map(({ name, description, cover, bpm, voice }, index) => ({ name, index, description, cover, bpm, voice: voice ?? "keys" }));
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
function loadVolume() {
  try { const v = parseFloat(localStorage.getItem("lilt.radio.volume") ?? ""); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.8; } catch { return 0.8; }
}

class Engine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private keys!: GainNode;
  private around!: Record<Ambience, GainNode>;
  private vinyl!: GainNode;
  private pads!: GainNode;
  private noise!: AudioBuffer;
  private timer = 0;
  private next = 0;
  private step = 0;
  private playVersion = 0;
  mood = 0;
  playing = false;
  volume = loadVolume();

  private buffer(sec: number, fn: (i: number) => number) {
    const ctx = this.ctx!, b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = fn(i);
    return b;
  }

  private init() {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = (this.ctx = new Ctx());
    this.master = ctx.createGain(); this.master.gain.value = 0;
    const warm = ctx.createBiquadFilter(); warm.type = "lowpass"; warm.frequency.value = 2400; warm.Q.value = 0.4;
    const glue = ctx.createDynamicsCompressor(); glue.threshold.value = -20; glue.ratio.value = 3;
    this.master.connect(warm).connect(glue).connect(ctx.destination);
    // Keys go through a slowly wobbling delay: the warble of an old tape.
    this.keys = ctx.createGain();
    const wow = ctx.createDelay(0.05); wow.delayTime.value = 0.012;
    const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = 0.32; depth.gain.value = 0.0016;
    lfo.connect(depth).connect(wow.delayTime); lfo.start();
    const trem = ctx.createOscillator(), tdepth = ctx.createGain(); trem.frequency.value = 4.3; tdepth.gain.value = 0.1;
    trem.connect(tdepth).connect(this.keys.gain); trem.start();
    this.keys.connect(wow).connect(this.master);
    this.noise = this.buffer(1, () => Math.random() * 2 - 1);
    // Pads skip the tape wobble and tremolo, so they stay smooth.
    this.pads = ctx.createGain(); this.pads.gain.value = 1;
    const padTone = ctx.createBiquadFilter(); padTone.type = "lowpass"; padTone.frequency.value = 1300; padTone.Q.value = 0.5;
    this.pads.connect(padTone).connect(this.master);
    // Each place is a short loop made once, kept silent until a mood asks for it.
    const sr = ctx.sampleRate;
    const loop = (buf: AudioBuffer, ...chain: AudioNode[]) => {
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const g = ctx.createGain(); g.gain.value = 0;
      [src, ...chain, g].reduce((a: AudioNode, b: AudioNode) => { a.connect(b); return b; });
      g.connect(this.master); src.start();
      return g;
    };
    const lp = (f: number) => { const b = ctx.createBiquadFilter(); b.type = "lowpass"; b.frequency.value = f; return b; };
    const hp = (f: number) => { const b = ctx.createBiquadFilter(); b.type = "highpass"; b.frequency.value = f; return b; };
    let last = 0;
    const brown = () => { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; return last * 3.2; };
    // The sea: brown noise that swells and falls about every eight seconds.
    const sea = this.buffer(16, (i) => brown() * (0.35 + 0.65 * Math.pow(Math.sin((Math.PI * i) / sr / 8), 2)));
    // A fire: a low rumble and now and then a pop.
    let pop = 0;
    const fire = this.buffer(5, () => { if (Math.random() < 0.00025) pop = 1; pop *= 0.996; return brown() * 0.5 + (Math.random() * 2 - 1) * pop * 0.8; });
    // Crickets: short trains of high pulses, a little under a second apart.
    const cricket = this.buffer(4, (i) => {
      const t = i / sr, phase = (t + 0.13 * Math.floor(t / 0.83)) % 0.83;
      return phase < 0.12 && phase % 0.04 < 0.018 ? Math.sin(2 * Math.PI * 4400 * t) * 0.5 : 0;
    });
    // Birds: a few rising whistles, scattered.
    const birdAt = Array.from({ length: 5 }, (_, k) => 0.6 + k * 1.35 + Math.random() * 0.5);
    const birds = this.buffer(8, (i) => {
      const t = i / sr;
      for (const at of birdAt) {
        for (let n = 0; n < 3; n++) {
          const dn = t - at - n * 0.13;
          if (dn >= 0 && dn < 0.09) return Math.sin(2 * Math.PI * (2600 + 9000 * dn) * dn) * Math.sin((Math.PI * dn) / 0.09) * 0.4;
        }
      }
      return 0;
    });
    this.around = {
      rain: loop(this.buffer(6, brown), lp(1600)),
      sea: loop(sea, lp(700)),
      fire: loop(fire, lp(2600)),
      crickets: loop(cricket, hp(3000)),
      birds: loop(birds, hp(1500)),
    };
    // Vinyl: soft surface hiss and the odd crackle, looped.
    const vin = ctx.createBufferSource(); vin.loop = true;
    vin.buffer = this.buffer(4, () => (Math.random() < 0.0004 ? (Math.random() * 2 - 1) * 0.9 : (Math.random() * 2 - 1) * 0.012));
    const vhp = ctx.createBiquadFilter(); vhp.type = "highpass"; vhp.frequency.value = 900;
    this.vinyl = ctx.createGain(); this.vinyl.gain.value = 0;
    vin.connect(vhp).connect(this.vinyl).connect(this.master); vin.start();
  }

  /** The place around the music and the vinyl follow the mood. */
  private texture() {
    const ctx = this.ctx!, M = MOODS[this.mood];
    const level: Record<Ambience, number> = { rain: 0.32, sea: 0.3, fire: 0.24, crickets: 0.05, birds: 0.08 };
    for (const a of Object.keys(this.around) as Ambience[]) this.around[a].gain.setTargetAtTime(M.ambience === a ? level[a] : 0, ctx.currentTime, 0.5);
    this.vinyl.gain.setTargetAtTime((M.vinyl ?? 0) * 0.5, ctx.currentTime, 0.5);
  }

  private env(g: GainNode, t: number, peak: number, attack: number, hold: number, end: number) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(peak * hold, t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + end);
  }
  private voice(type: OscillatorType, hz: number, t: number, peak: number, hold: number, dur: number, to: AudioNode) {
    const ctx = this.ctx!, o = ctx.createOscillator(), e = ctx.createGain();
    o.type = type; o.frequency.value = hz;
    this.env(e, t, peak, 0.012, hold, dur);
    o.connect(e).connect(to); o.start(t); o.stop(t + dur + 0.05);
  }
  private ep(m: number, t: number, dur: number, vel = 0.06) {
    this.voice("sine", mtof(m), t, vel, 0.35, dur, this.keys);
    this.voice("triangle", mtof(m) * 2, t, vel * 0.16, 0.35, dur, this.keys);
    this.voice("sine", mtof(m) * 3, t, vel * 0.04, 0.35, dur, this.keys);
  }
  /** A plucked string: bright at first, darkening as it fades. */
  private pluck(m: number, t: number, dur: number, vel = 0.05) {
    const ctx = this.ctx!, o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), e = ctx.createGain(), mix = ctx.createGain();
    o.type = "triangle"; o.frequency.value = mtof(m);
    o2.type = "sawtooth"; o2.frequency.value = mtof(m) * 1.003; mix.gain.value = 0.35;
    f.type = "lowpass"; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(500, t + Math.min(dur, 0.8));
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel, t + 0.004); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o2.connect(mix).connect(f);
    o.connect(f).connect(e).connect(this.keys);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  /** A music-box tine or a kalimba: a sine with a bright, quickly fading overtone. */
  private tine(m: number, t: number, vel: number, overtone: number, len: number) {
    this.voice("sine", mtof(m), t, vel, 0.5, len, this.keys);
    this.voice("sine", mtof(m) * overtone, t, vel * 0.3, 0.1, len * 0.3, this.keys);
  }
  /** A slow pad: two gently detuned saws per note, swelling in over half a second. */
  private pad(chord: number[], t: number, dur: number) {
    const ctx = this.ctx!;
    for (const m of chord) for (const cents of [-6, 6]) {
      const o = ctx.createOscillator(), e = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = mtof(m); o.detune.value = cents;
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.019, t + 0.6);
      e.gain.setValueAtTime(0.019, t + dur - 0.4); e.gain.linearRampToValueAtTime(0, t + dur + 0.6);
      o.connect(e).connect(this.pads); o.start(t); o.stop(t + dur + 0.7);
    }
  }

  private kick(t: number) {
    const ctx = this.ctx!, o = ctx.createOscillator(), e = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    e.gain.setValueAtTime(0.3, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(e).connect(this.master); o.start(t); o.stop(t + 0.4);
  }
  private hit(t: number, type: BiquadFilterType, f: number, v: number, len: number) {
    const ctx = this.ctx!, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), e = ctx.createGain();
    s.buffer = this.noise; fl.type = type; fl.frequency.value = f;
    e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(fl).connect(e).connect(this.master); s.start(t); s.stop(t + len + 0.02);
  }

  /** Schedules a little ahead on a 16th-note grid; one chord per bar. */
  private tick = () => {
    const ctx = this.ctx!, M = MOODS[this.mood], beat = 60 / M.bpm, s16 = beat / 4;
    while (this.next < ctx.currentTime + 0.15) {
      const bar = Math.floor(this.step / 16), chord = M.prog[bar % M.prog.length], pos = this.step % 16;
      const t = this.next + (pos % 2 ? s16 * 0.28 : 0);
      const voice = M.voice ?? "keys";
      // The chords, played the mood's way.
      if (voice === "keys") {
        if (pos === 0) chord.forEach((m, i) => this.ep(m, t + i * 0.018, beat * 3.6));
        if (pos === 8 && Math.random() < 0.55) chord.slice(1).forEach((m, i) => this.ep(m, t + i * 0.015, beat * 1.8, 0.04));
      } else if (voice === "pluck") {
        // A strum on the bar, softer upstrokes after it.
        if (pos === 0) chord.forEach((m, i) => this.pluck(m, t + i * 0.022, beat * 2.4));
        if (pos === 6 || pos === 10 || (pos === 14 && Math.random() < 0.5)) chord.slice(1).reverse().forEach((m, i) => this.pluck(m, t + i * 0.016, beat * 1.1, 0.03));
      } else if (voice === "musicbox" || voice === "kalimba") {
        // An arpeggio up the chord, above it, now and then a note left out.
        const box = voice === "musicbox", hits = box ? [0, 2, 4, 6, 8, 10, 12, 14] : [0, 3, 6, 8, 11, 14];
        const k = hits.indexOf(pos), tones = chord.slice(1);
        if (k >= 0 && (k === 0 || Math.random() < 0.85)) this.tine(tones[k % tones.length] + (box ? 24 : 12), t, box ? 0.068 : 0.06, box ? 4.2 : 5.4, box ? 1.6 : 1.1);
      } else if (pos === 0) {
        this.pad(chord.slice(1), t, beat * 4);
        // A few bells over the pads, never on every bar.
        if (Math.random() < 0.6) this.tine(chord[1 + Math.floor(Math.random() * (chord.length - 1))] + 24, t + beat * (1 + Math.floor(Math.random() * 2)), 0.025, 4.2, 2.2);
      }
      // The bass: two notes a bar, a walk on every beat, or one long note.
      const bass = M.bass ?? "two";
      if (bass === "two") {
        if (pos === 0) this.voice("sine", mtof(chord[0] - 12), t, 0.15, 0.6, beat * 1.6, this.master);
        if (pos === 10) this.voice("sine", mtof(chord[0] - 12), t, 0.15, 0.6, beat * 0.9, this.master);
      } else if (bass === "walk") {
        if (pos % 4 === 0) this.voice("sine", mtof(walkingBass(chord, M.prog[(bar + 1) % M.prog.length])[pos / 4]), t, 0.14, 0.7, beat * 0.9, this.master);
      } else if (pos === 0) this.voice("sine", mtof(chord[0] - 12), t, 0.15, 0.85, beat * 3.8, this.master);
      const drums = M.drums ?? "full";
      if (drums === "full" && (pos === 0 || pos === 7 || (pos === 10 && Math.random() < 0.4))) this.kick(t);
      if (drums === "soft" && pos === 0) this.kick(t);
      if (drums !== "none" && (pos === 4 || pos === 12)) this.hit(t, "bandpass", drums === "soft" ? 2600 : 1700, drums === "soft" ? 0.05 : 0.11, drums === "soft" ? 0.28 : 0.18);
      if (drums !== "none" && pos % 2 === 0) this.hit(t, "highpass", 7000, (pos % 4 ? 0.018 : 0.03) * (drums === "soft" ? 0.6 : 1), 0.05);
      if (voice === "keys" && pos % 4 === 2 && Math.random() < 0.22) this.voice("sine", mtof(chord[0] + 12 + [0, 2, 4, 7, 9][Math.floor(Math.random() * 5)]), t, 0.03, 0.4, 1.4, this.keys);
      this.next += s16;
      this.step++;
    }
  };

  /** False (and silent) if the mic was claimed while the context woke up: the caller ducks instead. */
  async play() {
    const version = ++this.playVersion;
    if (!this.ctx) this.init();
    const ctx = this.ctx!;
    await ctx.resume();
    if (version !== this.playVersion) return false;
    if (micInUse()) { if (!this.playing) void ctx.suspend(); return false; }
    if (!this.timer) { this.next = ctx.currentTime + 0.08; this.timer = window.setInterval(this.tick, 25); }
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0.5 * this.volume, ctx.currentTime, 0.35);
    this.texture();
    this.playing = true;
    return true;
  }

  pause() {
    this.playVersion++;
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this.playing) { void ctx.suspend(); return; }
    this.playing = false;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    window.clearInterval(this.timer); this.timer = 0;
    window.setTimeout(() => { if (!this.playing) void ctx.suspend(); }, 700);
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    try { localStorage.setItem("lilt.radio.volume", String(this.volume)); } catch { /* private mode */ }
    if (this.ctx && this.playing) this.master.gain.setTargetAtTime(0.5 * this.volume, this.ctx.currentTime, 0.05);
  }

  skip(d: number) {
    this.mood = (this.mood + d + MOODS.length) % MOODS.length;
    this.step = 0;
    if (this.ctx) this.texture();
  }
}

const engine = new Engine();
let ducked = false;
let pending = false;
let intent = 0;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((f) => f());
const pause = () => { intent++; pending = false; ducked = false; engine.pause(); changed(); };
const start = async () => {
  const request = ++intent;
  pending = true;
  try {
    const playing = await engine.play();
    if (request === intent) { pending = false; ducked = !playing; changed(); }
  } catch {
    if (request === intent) { pending = false; ducked = false; changed(); }
  }
};

// The radio steps aside while the microphone is in use, then comes back.
if (typeof window !== "undefined") {
  window.addEventListener("lilt:mic", async (e) => {
    const busy = (e as CustomEvent<boolean>).detail;
    if (busy && engine.playing) { ducked = true; engine.pause(); }
    else if (!busy && ducked) { ducked = false; await start(); }
    changed();
  });
}

export interface RadioState { playing: boolean; ducked: boolean; mood: string; volume: number }
const snapshot = (): RadioState => ({ playing: engine.playing, ducked, mood: MOODS[engine.mood].name, volume: engine.volume });

export const radio = {
  pause,
  async toggle() {
    if (engine.playing || ducked || pending) pause();
    else if (micInUse()) ducked = true; // it will start as soon as the mic is free
    else await start();
    changed();
  },
  skip(d: number) { engine.skip(d); changed(); },
  selectMood(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= MOODS.length) return;
    engine.skip(index - engine.mood); changed();
  },
  setVolume(v: number) { engine.setVolume(v); changed(); },
};

export function useRadio(): RadioState {
  const [s, set] = useState(snapshot);
  useEffect(() => {
    const on = () => set(snapshot());
    listeners.add(on);
    return () => { listeners.delete(on); };
  }, []);
  return s;
}
