import { useEffect, useMemo, useState } from "react";

// One audio element per recording, shared by everything that shows it (the listen-back button and
// the pitch chart under it), so they play, pause and follow the same position together.
const players = new Map<string, HTMLAudioElement>();

// Starting a recording stops all playback (recorder.ts sends this); these elements aren't in the page.
if (typeof window !== "undefined") window.addEventListener("lilt:stop-playback", () => players.forEach((a) => a.pause()));

/**
 * Recordings are WebM written as they're captured, so they carry no duration and the browser says
 * Infinity; seeking into such a file fails silently and playback just ends. Asking for the far end
 * once makes it read the file through and learn the real length; then it seeks properly.
 */
export function knowDuration(a: HTMLAudioElement) {
  const learn = () => {
    if (a.duration !== Infinity) return;
    a.addEventListener("durationchange", () => { a.currentTime = 0; }, { once: true });
    a.currentTime = 1e101;
  };
  if (a.readyState >= 1) learn(); else a.addEventListener("loadedmetadata", learn, { once: true });
}

export function useTakeAudio(src: string) {
  const a = useMemo(() => {
    let el = players.get(src);
    if (!el) { el = new Audio(src); el.preload = "auto"; knowDuration(el); players.set(src, el); }
    return el;
  }, [src]);
  const [, bump] = useState(0);
  useEffect(() => {
    const on = () => bump((n) => n + 1);
    let raf = 0;
    // While playing, follow every frame so the playhead glides rather than stepping.
    const follow = () => { on(); if (!a.paused) raf = requestAnimationFrame(follow); };
    const onPlay = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(follow); };
    const evs = ["pause", "ended", "seeked", "loadedmetadata", "durationchange"];
    evs.forEach((e) => a.addEventListener(e, on));
    a.addEventListener("play", onPlay);
    if (!a.paused) onPlay();
    return () => { evs.forEach((e) => a.removeEventListener(e, on)); a.removeEventListener("play", onPlay); cancelAnimationFrame(raf); };
  }, [a]);
  const pauseOthers = () => players.forEach((p) => { if (p !== a) p.pause(); });
  return {
    playing: !a.paused,
    t: a.currentTime,
    dur: isFinite(a.duration) ? a.duration : 0,
    toggle: () => { if (a.paused) { pauseOthers(); void a.play(); } else a.pause(); },
    seek: (t: number) => { a.currentTime = Math.max(0, t); if (a.paused) { pauseOthers(); void a.play(); } },
    ended: a.ended,
  };
}
