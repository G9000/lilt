import { useSyncExternalStore } from "react";
import { radio } from "./lofi";

type Source = "lofi" | "spotify";
export interface SpotifyPlayback {
  title: string; art: string | null; playing: boolean; ducked: boolean;
  toggle: (() => void) | null; pause: (() => void) | null;
}
const emptySpotify: SpotifyPlayback = { title: "Spotify", art: null, playing: false, ducked: false, toggle: null, pause: null };
const readSource = (): Source => {
  try { return localStorage.getItem("lilt.radio.source") === "spotify" ? "spotify" : "lofi"; } catch { return "lofi"; }
};
let state = { source: readSource(), visited: false, spotify: emptySpotify };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const useMusic = () => useSyncExternalStore(subscribe, () => state);
export function visitMusic() { if (!state.visited) { state = { ...state, visited: true }; emit(); } }
export function selectMusicSource(source: Source) {
  if (state.source === source) return;
  if (source === "spotify") radio.pause(); else state.spotify.pause?.();
  state = { ...state, source };
  try { localStorage.setItem("lilt.radio.source", source); } catch { /* private mode */ }
  emit();
}
export function publishSpotify(playback: Partial<SpotifyPlayback>) {
  state = { ...state, spotify: { ...state.spotify, ...playback } }; emit();
}
export function resetSpotify() { state = { ...state, spotify: emptySpotify }; emit(); }
export function spotifySelected() { return state.source === "spotify"; }

let returnTo = "/desk";
let opener: HTMLElement | null = null;
let openedFromShortcut = false;
let focusTimer = 0;
let focusFrame = 0;
const cancelFocusRestore = () => {
  window.clearTimeout(focusTimer);
  window.cancelAnimationFrame(focusFrame);
  focusTimer = 0;
  focusFrame = 0;
};
export function openMusic() {
  cancelFocusRestore();
  if (window.location.hash !== "#/music") {
    returnTo = window.location.hash.replace(/^#/, "") || "/";
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openedFromShortcut = opener?.classList.contains('room-music-shortcut') ?? false;
    window.location.hash = "/music";
  }
}
export function closeMusic() {
  cancelFocusRestore();
  const closingFocus = document.activeElement;
  const destination = returnTo;
  const focusDeadline = performance.now() + 1600;
  window.location.hash = destination;
  const restore = () => {
    focusTimer = 0;
    focusFrame = 0;
    if ((window.location.hash.replace(/^#/, "") || "/") !== destination) return;
    const focused = document.activeElement;
    if (focused !== document.body && focused !== closingFocus
      && !(focused instanceof Element && focused.closest(".music-window[hidden]"))) return;
    const shortcut = openedFromShortcut && destination === '/' ? document.querySelector<HTMLElement>('.room-music-shortcut') : null;
    const target = opener?.isConnected && opener.getClientRects().length ? opener
      : shortcut?.getClientRects().length ? shortcut
        : document.querySelector<HTMLElement>(destination === "/" ? ".ds-roomtop .music-mini-open" : ".ds-menubar .music-mini-open");
    // Room shortcuts remount on return; the menu bar can still be inert on the first frame.
    if ((!target || target.closest('[inert]') || !target.getClientRects().length) && performance.now() < focusDeadline) {
      focusFrame = window.requestAnimationFrame(restore); return;
    }
    target?.focus({ preventScroll: true });
  };
  // Only the room's painted targets need to wait for the camera to pull back.
  if (destination === "/" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    focusTimer = window.setTimeout(restore, 1200);
  } else focusFrame = window.requestAnimationFrame(restore);
}
