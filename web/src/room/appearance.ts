import { useSyncExternalStore } from 'react';
import { DEFAULT_APPEARANCE, readAppearance, type RoomAppearancePrefs } from './appearance-settings';
export type { RoomAppearancePrefs } from './appearance-settings';

const KEY = 'lilt.room.appearance';
function load() { try { return readAppearance(localStorage.getItem(KEY)); } catch { return { ...DEFAULT_APPEARANCE }; } }
let current = load();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());
function storage(event: StorageEvent) {
  if (event.key === KEY || event.key === null) { current = load(); notify(); }
}
function subscribe(fn: () => void) {
  if (!listeners.size) {
    current = load();
    window.addEventListener('storage', storage);
  }
  listeners.add(fn);
  return () => { listeners.delete(fn); if (!listeners.size) window.removeEventListener('storage', storage); };
}
export function useRoomAppearance() { return useSyncExternalStore(subscribe, () => current); }
export function setRoomAppearance(patch: Partial<RoomAppearancePrefs>) {
  current = readAppearance(JSON.stringify({ ...current, ...patch }));
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* Still usable for this visit when storage is unavailable. */ }
  notify();
}
export function resetRoomAppearance() { setRoomAppearance(DEFAULT_APPEARANCE); }
