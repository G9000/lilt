// Browser capture with chunked, idempotent upload. Chunks are kept in IndexedDB until
// the server confirms them, so a reload or dropped connection doesn't lose audio.
// IndexedDB only helps recovery; the server copy is canonical, and "Saved" is shown
// only after the server confirms finalisation.

import { claimMic } from "./micuse";
import { api, Take } from "./api";
import { acquireRecordingLock } from "./recordingLock";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];

export function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of MIME_CANDIDATES) if (MediaRecorder.isTypeSupported(m)) return m;
  return "";
}

export const REQUESTED_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 1,
};

export async function openMic(deviceId?: string): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(window.isSecureContext
      ? "This browser doesn't support microphone recording."
      : "Microphone access needs a secure page. Open Lilt at http://localhost on this computer, or over HTTPS from another device.");
  }
  return navigator.mediaDevices.getUserMedia({
    audio: { ...REQUESTED_CONSTRAINTS, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) },
  });
}

/**
 * Takes are recorded from the microphone through a half-second delay line, kept running while the
 * mic is open. Starting the recorder then captures from half a second before you pressed Record,
 * so a word you start as you click isn't clipped; stopping waits for the delay plus a short tail,
 * so your last syllable lands. The live pitch view still reads the mic directly, without delay.
 */
export const PRE_ROLL_S = 0.5;
const TAIL_S = 0.3;
const delayLines = new WeakMap<MediaStream, { ctx: AudioContext; out: MediaStream }>();
const contexts = new Set<AudioContext>();

/** Browsers start audio only after a click or key; call this on one so the pre-roll is filling before you press Record. */
export function wakeDelayLines() {
  contexts.forEach((c) => { if (c.state === "suspended") void c.resume(); });
}

/** The mic, half a second late (made once per stream; call it on a click so audio may start). */
export function delayedStream(stream: MediaStream): MediaStream {
  const have = delayLines.get(stream);
  if (have) { if (have.ctx.state === "suspended") void have.ctx.resume(); return have.out; }
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return stream;
  try {
    const ctx: AudioContext = new Ctx();
    const src = ctx.createMediaStreamSource(stream);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = PRE_ROLL_S;
    const dest = ctx.createMediaStreamDestination();
    dest.channelCount = 1;
    src.connect(delay).connect(dest);
    if (ctx.state === "suspended") void ctx.resume();
    contexts.add(ctx);
    // When the mic closes, so does its delay line.
    stream.getAudioTracks()[0]?.addEventListener("ended", () => closeDelayLine(stream));
    delayLines.set(stream, { ctx, out: dest.stream });
    return dest.stream;
  } catch {
    return stream;
  }
}

/** Close a stream's delay line (the mic is being released). */
export function closeDelayLine(stream: MediaStream) {
  const have = delayLines.get(stream);
  if (have) { contexts.delete(have.ctx); void have.ctx.close(); delayLines.delete(stream); }
}

export function stopAllPlayback() {
  document.querySelectorAll("audio").forEach((a) => a.pause());
  window.dispatchEvent(new Event("lilt:stop-playback"));
}

// ---- IndexedDB helpers -------------------------------------------------------

const DB_NAME = "lilt-capture";

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      d.createObjectStore("chunks", { keyPath: ["take_id", "seq"] });
      d.createObjectStore("takes", { keyPath: "take_id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  try {
    const d = await db();
    return await new Promise<T>((resolve, reject) => {
      const tx = d.transaction(store, mode);
      const r = fn(tx.objectStore(store));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return undefined; // private mode or storage blocked: upload still works, just no local backup
  }
}

interface PendingTake { take_id: string; produced: number; stopped: boolean }

// ---- Upload -----------------------------------------------------------------

async function sha256(buf: ArrayBuffer): Promise<string | null> {
  if (!crypto?.subtle) return null;
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function putChunk(takeId: string, seq: number, blob: Blob): Promise<void> {
  const buf = await blob.arrayBuffer();
  const hash = await sha256(buf);
  let delay = 500;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`/api/takes/${takeId}/chunks/${seq}`, {
        method: "PUT",
        headers: hash ? { "x-content-sha256": hash } : {},
        body: buf,
      });
      if (res.ok) return;
      if (res.status === 409 || res.status === 422 || res.status === 404) {
        const j = await res.json().catch(() => ({}));
        throw Object.assign(new Error(j.error ?? `upload rejected (${res.status})`), { fatal: true });
      }
    } catch (e: any) {
      if (e?.fatal) throw e;
    }
    if (attempt > 30) throw new Error("Upload keeps failing. Your audio is held in this browser and will be retried.");
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 2, 8000);
  }
}

export type RecState = "idle" | "recording" | "saving" | "saved" | "error";

export interface TakeMeta {
  session_id: string;
  role: string;
  phase?: string;
  prompt_id: string;
  prompt_text: string;
  exercise_id?: string | null;
  exercise_version?: number | null;
  cue_id?: string | null;
  retry_of?: string | null;
  triggered_by_review?: string | null;
  triggered_by_pointer?: string | null;
}

export class TakeRecorder {
  state: RecState = "idle";
  error: string | null = null;
  takeId = "";
  private rec: MediaRecorder | null = null;
  private seq = 0;
  private queue: Promise<void> = Promise.resolve();
  private uploadError: Error | null = null;
  private releaseMic: (() => void) | null = null;
  private releaseRecording: (() => void) | null = null;
  private starting = false;
  private created: Promise<void> = Promise.resolve();
  startedAt = 0;

  constructor(private stream: MediaStream, private onChange: (r: TakeRecorder) => void) {}

  private set(s: RecState, err: string | null = null) {
    this.state = s;
    this.error = err;
    this.onChange(this);
  }

  async start(meta: TakeMeta): Promise<void> {
    if (this.starting || this.state === "recording" || this.state === "saving") throw new Error("This take is already recording or saving.");
    this.starting = true;
    try {
      this.releaseRecording = await acquireRecordingLock();
      await this.begin(meta);
    } catch (error) {
      this.releaseMic?.();
      this.releaseRecording?.();
      throw error;
    } finally {
      this.starting = false;
    }
  }

  private async begin(meta: TakeMeta): Promise<void> {
    stopAllPlayback();
    this.releaseMic?.();
    this.releaseMic = claimMic();
    const mime = pickMime();
    if (mime === null) throw new Error("This browser can't record audio (MediaRecorder unavailable).");
    const track = this.stream.getAudioTracks()[0];
    const settings = track?.getSettings?.() ?? {};
    this.takeId = crypto.randomUUID();
    const rec = new MediaRecorder(delayedStream(this.stream), mime ? { mimeType: mime } : undefined);
    const releaseRecording = this.releaseRecording!;
    rec.addEventListener("stop", releaseRecording, { once: true });
    rec.addEventListener("error", () => {
      // A native recorder error ends capture too. Hold the lock until its stop event.
      if (rec.state !== "inactive") rec.stop();
      this.releaseMic?.();
      this.set("error", "Recording stopped unexpectedly. Your uploaded audio can be recovered when Lilt reopens.");
    }, { once: true });
    // Capture starts now; the take is created on the server alongside, and chunks wait for it.
    this.seq = 0;
    this.uploadError = null;
    const created = api.createTake({
      take_id: this.takeId,
      ...meta,
      phase: meta.phase ?? "none",
      mime: rec.mimeType || mime || "application/octet-stream",
      device_label: track?.label || null,
      capture: {
        requested: REQUESTED_CONSTRAINTS,
        settings,
        note: "Browser-reported settings. Requesting no processing does not prove the device applied none.",
        user_agent: navigator.userAgent,
        pre_roll_s: PRE_ROLL_S,
      },
    }).then(() => idb("takes", "readwrite", (s) => s.put({ take_id: this.takeId, produced: this.seq, stopped: false } satisfies PendingTake)));
    this.created = created.then(() => undefined);
    void this.created.catch(() => undefined); // The start failure is surfaced below; stop may never be called.
    this.queue = created.then(() => undefined, (e: any) => { this.uploadError = e instanceof Error ? e : new Error(String(e)); });
    rec.ondataavailable = (ev) => {
      if (!ev.data || ev.data.size === 0) return;
      const seq = this.seq++;
      const blob = ev.data;
      const takeId = this.takeId;
      void idb("chunks", "readwrite", (s) => s.put({ take_id: takeId, seq, blob }));
      void idb("takes", "readwrite", (s) => s.put({ take_id: takeId, produced: seq + 1, stopped: false } satisfies PendingTake));
      this.queue = this.queue.then(async () => {
        if (this.uploadError) return;
        try {
          await putChunk(takeId, seq, blob);
          await idb("chunks", "readwrite", (s) => s.delete([takeId, seq]));
        } catch (e: any) {
          this.uploadError = e;
        }
      });
    };
    this.rec = rec;
    await new Promise<void>((resolve, reject) => {
      const started = () => { rec.removeEventListener("error", failed); resolve(); };
      const failed = () => { rec.removeEventListener("start", started); reject(new Error("Couldn't start recording.")); };
      rec.addEventListener("start", started, { once: true });
      rec.addEventListener("error", failed, { once: true });
      rec.start(1000);
    });
    this.startedAt = performance.now();
    this.set("recording");
    // If the server couldn't create the take, stop at once rather than record into nowhere.
    created.catch((e: any) => { if (rec.state !== "inactive") rec.stop(); this.releaseMic?.(); this.set("error", e?.message ?? "Couldn't start the take."); });
  }

  /** Stop, drain uploads, finalise. Resolves with the saved take. */
  async stop(): Promise<Take> {
    const rec = this.rec;
    if (!rec) throw new Error("not recording");
    this.set("saving");
    // Keep listening through the delay line and a short tail, so the last syllable is in.
    await new Promise((r) => setTimeout(r, (PRE_ROLL_S + TAIL_S) * 1000));
    await new Promise<void>((resolve) => {
      if (rec.state === "inactive") return resolve();
      rec.addEventListener("stop", () => resolve(), { once: true });
      rec.stop();
    });
    this.releaseMic?.();
    // The final dataavailable fires before stop; let the queue catch up.
    await new Promise((r) => setTimeout(r, 0));
    await this.queue;
    await this.created.catch(() => undefined);
    await idb("takes", "readwrite", (s) => s.put({ take_id: this.takeId, produced: this.seq, stopped: true } satisfies PendingTake));
    if (this.uploadError) {
      this.set("error", this.uploadError.message);
      throw this.uploadError;
    }
    try {
      const take = await api.finalize(this.takeId, this.seq);
      await idb("takes", "readwrite", (s) => s.delete(this.takeId));
      this.set("saved");
      return take;
    } catch (e: any) {
      this.set("error", `Not saved yet: ${e.message}. Your audio is still held in this browser.`);
      throw e;
    }
  }

  /** After a failed save: resend anything still held locally, then finalise again. */
  async retrySave(): Promise<Take> {
    this.set("saving");
    this.uploadError = null;
    try {
      const chunks = ((await idb<any[]>("chunks", "readonly", (s) => s.getAll() as IDBRequest<any[]>)) ?? [])
        .filter((c) => c.take_id === this.takeId)
        .sort((a, b) => a.seq - b.seq);
      for (const c of chunks) {
        await putChunk(this.takeId, c.seq, c.blob);
        await idb("chunks", "readwrite", (s) => s.delete([this.takeId, c.seq]));
      }
      const take = await api.finalize(this.takeId, this.seq);
      await idb("takes", "readwrite", (s) => s.delete(this.takeId));
      this.set("saved");
      return take;
    } catch (e: any) {
      this.set("error", `Not saved yet: ${e.message}. Your audio is still held in this browser.`);
      throw e;
    }
  }

  cancelTracks() {
    this.releaseMic?.();
    // Stop capture before releasing its lock. Track.stop() alone needn't stop a delayed stream.
    if (this.rec && this.rec.state !== "inactive") this.rec.stop();
    else this.releaseRecording?.();
    closeDelayLine(this.stream);
    this.stream.getTracks().forEach((t) => t.stop());
  }
}

/** Upload anything left in IndexedDB from an interrupted page, then finalise it. */
export async function recoverPending(): Promise<number> {
  const pending = ((await idb<PendingTake[]>("takes", "readonly", (s) => s.getAll() as IDBRequest<PendingTake[]>)) ?? []);
  let recovered = 0;
  for (const p of pending) {
    try {
      const chunks = ((await idb<any[]>("chunks", "readonly", (s) => s.getAll() as IDBRequest<any[]>)) ?? [])
        .filter((c) => c.take_id === p.take_id)
        .sort((a, b) => a.seq - b.seq);
      for (const c of chunks) {
        await putChunk(p.take_id, c.seq, c.blob);
        await idb("chunks", "readwrite", (s) => s.delete([p.take_id, c.seq]));
      }
      if (p.produced > 0) await api.finalize(p.take_id, p.produced, !p.stopped);
      await idb("takes", "readwrite", (s) => s.delete(p.take_id));
      recovered++;
    } catch {
      // Leave it for the next attempt.
    }
  }
  return recovered;
}

/** Live input level (0..1 RMS) for the microphone check. */
export function levelMeter(stream: MediaStream, onLevel: (rms: number, peak: number) => void): () => void {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx: AudioContext = new Ctx();
  const src = ctx.createMediaStreamSource(stream);
  const an = ctx.createAnalyser();
  an.fftSize = 2048;
  src.connect(an);
  const buf = new Float32Array(an.fftSize);
  let raf = 0;
  const tick = () => {
    an.getFloatTimeDomainData(buf);
    let sum = 0, peak = 0;
    for (const v of buf) { sum += v * v; peak = Math.max(peak, Math.abs(v)); }
    const rms = Math.sqrt(sum / buf.length);
    onLevel(rms, peak);
    raf = requestAnimationFrame(tick);
  };
  tick();
  return () => { cancelAnimationFrame(raf); src.disconnect(); void ctx.close(); };
}
