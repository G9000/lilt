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
let state = { source: readSource(), visited: false, open: false, artwork: false, spotify: emptySpotify };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const useMusic = () => useSyncExternalStore(subscribe, () => state);
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

let opener: HTMLElement | null = null;
let focusFrame = 0;
export function openMusic() { showMusic(false); }
export function openMusicArtwork() { showMusic(true); }
function showMusic(artwork: boolean) {
  window.cancelAnimationFrame(focusFrame);
  if (state.open) return;
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  state = { ...state, open: true, visited: true, artwork }; emit();
}
export function closeMusic() {
  if (!state.open) return;
  state = { ...state, open: false }; emit();
  if (window.location.hash === '#/music') {
    history.replaceState(null, '', '#/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

// Run after the native dialog closes, when its modal focus restriction is gone.
export function restoreMusicFocus() {
  const destination = window.location.hash;
  focusFrame = window.requestAnimationFrame(() => {
    if (state.open || window.location.hash !== destination) return;
    const visible = (element: HTMLElement | null): element is HTMLElement =>
      !!element && element.isConnected && !!element.getClientRects().length && !element.closest('[inert]');
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused !== document.body && visible(focused)
      && !focused.closest('.music-window')) return;
    const fallback = [...document.querySelectorAll<HTMLElement>('.music-mini-open'),
      ...document.querySelectorAll<HTMLElement>('.room-music, .room-music-shortcut')].find(visible);
    (visible(opener) ? opener : fallback)?.focus({ preventScroll: true });
  });
}
