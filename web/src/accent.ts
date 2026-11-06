import { useSyncExternalStore } from 'react';
import { accentPalette, DEFAULT_ACCENT, parseAccent } from './accent-colors';

const KEY = 'lilt.accent';
function read() { try { return parseAccent(localStorage.getItem(KEY)) ?? DEFAULT_ACCENT; } catch { return DEFAULT_ACCENT; } }
let current = { color: read(), saved: true };
const listeners = new Set<() => void>();
function apply() {
  const palette = accentPalette(current.color);
  for (const theme of ['light', 'dark'] as const) {
    for (const [part, value] of Object.entries(palette[theme])) {
      const key = `--chosen-${theme}-${part}`;
      if (current.color === DEFAULT_ACCENT) document.documentElement.style.removeProperty(key);
      else document.documentElement.style.setProperty(key, value);
    }
  }
}
export function setAccent(value: string) {
  const color = parseAccent(value);
  if (!color) return;
  let saved = true;
  try { if (color === DEFAULT_ACCENT) localStorage.removeItem(KEY); else localStorage.setItem(KEY, color); }
  catch { saved = false; }
  current = { color, saved };
  apply(); listeners.forEach(fn => fn());
}
window.addEventListener('storage', event => {
  if ((event.key === KEY || event.key === null) && (!event.storageArea || event.storageArea === localStorage)) {
    current = { color: read(), saved: true }; apply(); listeners.forEach(fn => fn());
  }
});
function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function useAccent() { return useSyncExternalStore(subscribe, () => current); }
// Load before rendering, including when a saved link opens directly into Practice.
apply();
