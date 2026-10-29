import { useEffect, useState } from "react";
import { micInUse } from "../micuse";

/**
 * The lo-fi radio: music made live with Web Audio (electric-piano chords through a wobbling
 * tape delay, a sine bass, swung drums from noise, and rain on one mood).
 * Nothing is downloaded or sent anywhere. It pauses itself whenever the microphone is in use.
 */

/** A mood: its tempo, its four chords (MIDI notes, one bar each), and its texture: rain, vinyl
 *  crackle, and how much drum (full, soft brushes, or none). */
interface Mood { name: string; bpm: number; rain: boolean; prog: number[][]; drums?: "full" | "soft" | "none"; vinyl?: number }
const MOODS: Mood[] = [
  { name: "Rain on the window", bpm: 70, rain: true, prog: [[53, 57, 60, 64, 67], [52, 55, 59, 62], [50, 53, 57, 60, 64], [48, 52, 55, 59]] },
  { name: "Desk lamp", bpm: 76, rain: false, prog: [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59, 62], [45, 48, 52, 55]] },
  { name: "City at dusk", bpm: 66, rain: false, prog: [[51, 55, 58, 62], [56, 60, 63, 67], [53, 56, 60, 63], [58, 62, 65, 68]] },
  { name: "Night bus", bpm: 74, rain: false, vinyl: 0.5, prog: [[48, 51, 55, 58, 62], [44, 48, 51, 55], [51, 55, 58, 62], [46, 50, 53, 55]] },
  { name: "Sunday morning", bpm: 82, rain: false, drums: "soft", prog: [[55, 59, 62, 66], [52, 55, 59, 62, 66], [57, 60, 64, 67], [50, 54, 57, 60, 64]] },
  { name: "Train window", bpm: 68, rain: false, vinyl: 0.3, prog: [[46, 50, 53, 57], [45, 48, 52, 55], [43, 46, 50, 53], [41, 45, 48, 52, 55]] },
  { name: "Snow day", bpm: 60, rain: false, drums: "none", vinyl: 0.6, prog: [[57, 61, 64, 68, 71], [54, 57, 61, 64, 68], [50, 54, 57, 61], [52, 56, 59, 61]] },
  { name: "Bedroom cassette", bpm: 78, rain: false, vinyl: 0.8, prog: [[51, 55, 58, 62], [55, 58, 62, 65], [48, 51, 55, 58], [46, 51, 53, 58]] },
  { name: "Library, after hours", bpm: 64, rain: true, drums: "soft", prog: [[50, 53, 57, 60], [46, 50, 53, 57], [55, 58, 62, 65], [57, 61, 64, 67]] },
];
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
function loadVolume() {
  try { const v = parseFloat(localStorage.getItem("lilt.radio.volume") ?? ""); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.8; } catch { return 0.8; }
}

class Engine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private keys!: GainNode;
  private rain!: GainNode;
  private vinyl!: GainNode;
  private noise!: AudioBuffer;
  private timer = 0;
  private next = 0;
  private step = 0;
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
    let last = 0;
    const rain = ctx.createBufferSource(); rain.loop = true;
    rain.buffer = this.buffer(6, () => { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; return last * 3.2; });
    const rlp = ctx.createBiquadFilter(); rlp.type = "lowpass"; rlp.frequency.value = 1600;
    this.rain = ctx.createGain(); this.rain.gain.value = 0;
    rain.connect(rlp).connect(this.rain).connect(this.master); rain.start();
    // Vinyl: soft surface hiss and the odd crackle, looped.
    const vin = ctx.createBufferSource(); vin.loop = true;
    vin.buffer = this.buffer(4, () => (Math.random() < 0.0004 ? (Math.random() * 2 - 1) * 0.9 : (Math.random() * 2 - 1) * 0.012));
    const vhp = ctx.createBiquadFilter(); vhp.type = "highpass"; vhp.frequency.value = 900;
    this.vinyl = ctx.createGain(); this.vinyl.gain.value = 0;
    vin.connect(vhp).connect(this.vinyl).connect(this.master); vin.start();
  }

  /** Rain and vinyl follow the mood. */
  private texture() {
    const ctx = this.ctx!, M = MOODS[this.mood];
    this.rain.gain.setTargetAtTime(M.rain ? 0.32 : 0, ctx.currentTime, 0.5);
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
      const chord = M.prog[Math.floor(this.step / 16) % M.prog.length], pos = this.step % 16;
      const t = this.next + (pos % 2 ? s16 * 0.28 : 0);
      if (pos === 0) { chord.forEach((m, i) => this.ep(m, t + i * 0.018, beat * 3.6)); this.voice("sine", mtof(chord[0] - 12), t, 0.15, 0.6, beat * 1.6, this.master); }
      if (pos === 8 && Math.random() < 0.55) chord.slice(1).forEach((m, i) => this.ep(m, t + i * 0.015, beat * 1.8, 0.04));
      if (pos === 10) this.voice("sine", mtof(chord[0] - 12), t, 0.15, 0.6, beat * 0.9, this.master);
      const drums = M.drums ?? "full";
      if (drums === "full" && (pos === 0 || pos === 7 || (pos === 10 && Math.random() < 0.4))) this.kick(t);
      if (drums === "soft" && pos === 0) this.kick(t);
      if (drums !== "none" && (pos === 4 || pos === 12)) this.hit(t, "bandpass", drums === "soft" ? 2600 : 1700, drums === "soft" ? 0.05 : 0.11, drums === "soft" ? 0.28 : 0.18);
      if (drums !== "none" && pos % 2 === 0) this.hit(t, "highpass", 7000, (pos % 4 ? 0.018 : 0.03) * (drums === "soft" ? 0.6 : 1), 0.05);
      if (pos % 4 === 2 && Math.random() < 0.22) this.voice("sine", mtof(chord[0] + 12 + [0, 2, 4, 7, 9][Math.floor(Math.random() * 5)]), t, 0.03, 0.4, 1.4, this.keys);
      this.next += s16;
      this.step++;
    }
  };

  async play() {
    if (!this.ctx) this.init();
    const ctx = this.ctx!;
    await ctx.resume();
    if (!this.timer) { this.next = ctx.currentTime + 0.08; this.timer = window.setInterval(this.tick, 25); }
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0.5 * this.volume, ctx.currentTime, 0.35);
    this.texture();
    this.playing = true;
  }

  pause() {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return;
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
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((f) => f());

// The radio steps aside while the microphone is in use, then comes back.
if (typeof window !== "undefined") {
  window.addEventListener("lilt:mic", async (e) => {
    const busy = (e as CustomEvent<boolean>).detail;
    if (busy && engine.playing) { ducked = true; engine.pause(); }
    else if (!busy && ducked) { ducked = false; await engine.play(); }
    changed();
  });
}

export interface RadioState { playing: boolean; ducked: boolean; mood: string; volume: number }
const snapshot = (): RadioState => ({ playing: engine.playing, ducked, mood: MOODS[engine.mood].name, volume: engine.volume });

export const radio = {
  async toggle() {
    if (engine.playing || ducked) { ducked = false; engine.pause(); }
    else if (micInUse()) ducked = true; // it will start as soon as the mic is free
    else await engine.play();
    changed();
  },
  skip(d: number) { engine.skip(d); changed(); },
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
