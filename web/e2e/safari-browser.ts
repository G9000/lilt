import "../src/pitch.test.ts";
import { api } from "../src/api";
import { TakeRecorder, delayedStream, pickMime } from "../src/recorder";
import { trackLiveFine, type LiveTracker } from "../src/pitch";
import { micInUse } from "../src/micuse";

const w = window as any;
const results: { name: string; pass: boolean; detail?: unknown }[] = [...w.__pitchResults];
const capabilities = { userAgent: navigator.userAgent, webLocks: !!navigator.locks, audioWorklet: typeof AudioWorkletNode !== "undefined", mime: pickMime() };
const status = document.querySelector("#status")!;
const button = document.querySelector<HTMLButtonElement>("#run")!;
const channel = new BroadcastChannel("lilt-safari-test");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const insist = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const NativeRecorder = window.MediaRecorder;
const nativeFetch = window.fetch.bind(window);
let stream: MediaStream, ctx: AudioContext, meta: any, rec: TakeRecorder;
let creates = 0, failCreation = false;
let peerReady = false;
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (String(input) === "/api/takes" && init?.method === "POST") {
    creates++;
    if (failCreation) return Promise.resolve(new Response(JSON.stringify({ error: "Test refusal" }), { status: 422 }));
  }
  return nativeFetch(input, init);
};

async function publish(complete = false) {
  document.querySelector("#results")!.replaceChildren(...results.map((r) => {
    const li = document.createElement("li"); li.textContent = `${r.pass ? "PASS" : "FAIL"} ${r.name}${r.detail ? ": " + JSON.stringify(r.detail) : ""}`; return li;
  }));
  document.querySelector("#details")!.textContent = JSON.stringify(capabilities, null, 2);
  await nativeFetch("/results", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ capabilities, results, complete }) });
}
async function check(name: string, fn: () => Promise<unknown>) {
  try { results.push({ name, pass: true, detail: await fn() }); }
  catch (error) { results.push({ name, pass: false, detail: String(error) }); }
  await publish();
}
async function waitFor(fn: () => boolean | Promise<boolean>, label: string, timeout = 10000) {
  const end = performance.now() + timeout;
  while (performance.now() < end) { if (await fn()) return; await sleep(40); }
  throw new Error(`Timed out: ${label}`);
}
async function prepare(onStream?: () => void) {
  // Called directly by a real click in each Safari window, satisfying its audio activation rule.
  ctx = new AudioContext();
  const tone = ctx.createOscillator(), gain = ctx.createGain(), dest = ctx.createMediaStreamDestination();
  tone.frequency.value = 220; gain.gain.value = 0.2;
  tone.connect(gain).connect(dest); tone.start();
  stream = dest.stream;
  delayedStream(stream); // Pre-roll must be awake before recording.
  onStream?.(); // Construct the live tracker while this real click still activates audio.
  await ctx.resume();
  const session = await api.studioSession();
  meta = { session_id: session.id, role: "free", prompt_id: "safari-generated-220", prompt_text: "Generated 220 Hz test tone" };
}
const newRecorder = () => new TakeRecorder(stream, () => {});
const rejected = async (r: TakeRecorder) => {
  try { await r.start(meta); throw new Error("Expected a recording refusal"); }
  catch (error) { insist(String(error).includes("already recording"), String(error)); }
};
const free = () => waitFor(async () => !(await navigator.locks.query()).held.some((l) => l.name === "lilt-recording"), "lock release");

const replies = new Map<string, (value: any) => void>();
async function peer(command: string) {
  const id = crypto.randomUUID();
  return Promise.race([
    new Promise<any>((resolve) => { replies.set(id, resolve); channel.postMessage({ id, command }); }),
    sleep(15000).then(() => { throw new Error(`Peer timeout: ${command}`); }),
  ]).finally(() => replies.delete(id));
}
channel.onmessage = async ({ data }) => {
  if (location.pathname !== "/peer") { if (data.peerReady) peerReady = true; if (data.reply) replies.get(data.reply)?.(data); return; }
  try {
    if (data.command === "ready") insist(!!meta, "Click Prepare audio in this window first");
    if (data.command === "denied") { const before = creates; await rejected(newRecorder()); insist(creates === before, "Refused start called the API"); }
    if (data.command === "start") { rec = newRecorder(); await rec.start(meta); }
    if (data.command === "stop") { await rec.stop(); }
    if (data.command === "close") { window.close(); return; }
    channel.postMessage({ reply: data.id, pass: true });
  } catch (error) { channel.postMessage({ reply: data.id, pass: false, error: String(error) }); }
};

if (location.pathname === "/peer") {
  document.querySelector("h1")!.textContent = "Safari peer window";
  button.textContent = "Prepare peer audio";
  button.onclick = async () => {
    try { button.disabled = true; await prepare(); channel.postMessage({ peerReady: true }); status.textContent = "Peer ready. Return to the main Safari checks window."; }
    catch (error) { status.textContent = String(error); }
  };
} else {
  void publish();
  button.onclick = async () => {
    button.disabled = true;
    const peerWindow = window.open("/peer", "lilt-safari-peer");
    let liveTracker: LiveTracker | undefined;
    const liveValues: number[] = [];
    try {
      insist(peerWindow, "Safari blocked the peer window");
      await prepare(() => { liveTracker = trackLiveFine(stream, (_t, f) => { if (f.hz !== null) liveValues.push(f.hz); }); });
      status.textContent = "Click Prepare peer audio in the new window, then return here.";
      await waitFor(() => peerReady, "peer preparation", 120000);
      status.textContent = "Running native Safari recording checks…";
      insist(capabilities.webLocks, "This Safari has no Web Locks API");
      await check("Live AudioWorklet pitch tracks generated 220 Hz", async () => {
        try { await waitFor(() => liveValues.length >= 30, "live pitch frames"); }
        finally { liveTracker?.stop(); }
        const sorted = liveValues.sort((a,b) => a-b), median = sorted[sorted.length >> 1];
        insist(Math.abs(median - 220) < 2.2, `Live median ${median}`);
        return { frames: liveValues.length, median };
      });
      await check("Competing Safari windows refuse capture before creating a take", async () => {
        rec = newRecorder(); await rec.start(meta);
        insist((await peer("denied")).pass, "Peer recorded during the first take");
      });
      await check("Audio tail stays locked; peer can record after stop", async () => {
        const stopped = rec.stop();
        insist((await peer("denied")).pass, "Lock released during final audio tail");
        await stopped;
        insist((await peer("start")).pass, "Peer couldn't start after release");
        insist((await peer("stop")).pass, "Peer couldn't stop/save");
      });
      await check("Double starts in one Safari page are refused", async () => {
        rec = newRecorder(); const first = rec.start(meta); await rejected(rec); await first;
        await rejected(newRecorder()); await rec.stop();
      });
      await check("Safari constructor failure releases lock and radio claim", async () => {
        window.MediaRecorder = class extends NativeRecorder { constructor(..._args: any[]) { throw new Error("Test constructor failure"); } } as typeof MediaRecorder;
        try { await newRecorder().start(meta).then(() => { throw new Error("Constructor unexpectedly succeeded"); }, (error) => insist(String(error).includes("Test constructor failure"), String(error))); }
        finally { window.MediaRecorder = NativeRecorder; }
        insist(!micInUse(), "Radio claim leaked"); insist((await peer("start")).pass, "Lock leaked"); await peer("stop");
      });
      await check("Safari start failure releases lock and radio claim", async () => {
        const start = NativeRecorder.prototype.start;
        NativeRecorder.prototype.start = () => { throw new Error("Test start failure"); };
        try { await newRecorder().start(meta).then(() => { throw new Error("Start unexpectedly succeeded"); }, (error) => insist(String(error).includes("Test start failure"), String(error))); }
        finally { NativeRecorder.prototype.start = start; }
        insist(!micInUse(), "Radio claim leaked"); insist((await peer("start")).pass, "Lock leaked"); await peer("stop");
      });
      await check("Refused take creation releases Safari capture", async () => {
        failCreation = true; rec = newRecorder(); await rec.start(meta);
        await waitFor(() => rec.state === "error", "refused creation"); await free(); failCreation = false;
        insist((await peer("start")).pass, "Lock leaked"); await peer("stop");
      });
      await check("Safari cancellation releases the lock", async () => {
        const disposable = ctx.createMediaStreamDestination();
        const r = new TakeRecorder(disposable.stream, () => {}); await r.start(meta); r.cancelTracks(); await free();
        insist((await peer("start")).pass, "Lock leaked"); await peer("stop");
      });
      await check("Safari recorder error releases lock and radio claim", async () => {
        let native: MediaRecorder;
        window.MediaRecorder = class extends NativeRecorder { constructor(...args: any[]) { super(...args as [MediaStream]); native = this; } } as typeof MediaRecorder;
        try { rec = newRecorder(); await rec.start(meta); native!.dispatchEvent(new Event("error")); await free(); }
        finally { window.MediaRecorder = NativeRecorder; }
        insist(!micInUse(), "Radio claim leaked"); insist((await peer("start")).pass, "Lock leaked"); await peer("stop");
      });
      await check("Native MP4 recording saves, plays back and gets a Praat contour", async () => {
        const supported = NativeRecorder.isTypeSupported.bind(NativeRecorder);
        insist(supported("audio/mp4"), "Safari doesn't support MP4 capture");
        NativeRecorder.isTypeSupported = (mime) => mime === "audio/mp4" && supported(mime);
        let take: any;
        try { rec = newRecorder(); await rec.start(meta); await sleep(1800); take = await rec.stop(); }
        finally { NativeRecorder.isTypeSupported = supported; }
        const audio = await nativeFetch(take.audio_url).then((r) => r.arrayBuffer());
        const decoded = await ctx.decodeAudioData(audio);
        insist(decoded.duration > 1, `Decoded duration ${decoded.duration}`);
        let analysis: any;
        await waitFor(async () => { analysis = await api.analysis(take.id).catch(() => null); return analysis?.status === "ok"; }, "Praat analysis", 60000);
        const median = analysis.measures.f0_median_hz.value;
        insist(Math.abs(median - 220) < 2.2, `Praat median ${median}`);
        return { take: take.id, mime: take.mime, duration: decoded.duration, median };
      });
      await check("Closing the recording peer releases Safari's lock", async () => {
        insist((await peer("start")).pass, "Peer couldn't start");
        channel.postMessage({ command: "close" });
        await free(); rec = newRecorder(); await rec.start(meta); await rec.stop();
      });
      status.textContent = `Complete: ${results.filter(r => r.pass).length}/${results.length} passed`;
      await publish(true);
    } catch (error) {
      results.push({ name: "Safari harness completion", pass: false, detail: String(error) }); status.textContent = String(error); await publish(true);
    } finally {
      liveTracker?.stop();
      failCreation = false; window.MediaRecorder = NativeRecorder;
      if (rec?.state === "recording") await rec.stop().catch(() => {});
      await ctx?.close();
    }
  };
}
