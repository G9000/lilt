import { useSyncExternalStore } from 'react';
import { DEFAULT_APPEARANCE, readAppearance, type RoomAppearancePrefs } from './appearance-settings';
import type { Monitor, MonitorMedia } from './appearance-settings';
import { prepareMonitorMedia, saveMonitorFile, removeMonitorFile } from './monitor-media';
export type { RoomAppearancePrefs } from './appearance-settings';

const KEY = 'lilt.room.appearance';
function stored() {
  const raw = localStorage.getItem(KEY);
  let stamps: { mainRevision?: string; sideRevision?: string } = {};
  try { stamps = JSON.parse(raw ?? '{}') ?? {}; } catch { /* Old or damaged settings use defaults. */ }
  return { prefs: readAppearance(raw), main: stamps.mainRevision, side: stamps.sideRevision };
}
function load() { try { return stored().prefs; } catch { return { ...DEFAULT_APPEARANCE }; } }
let current = load();
let transient: Partial<RoomAppearancePrefs> = {};
const versions = { main: 0, side: 0 };
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());
function storage(event: StorageEvent) {
  if (event.key === KEY || event.key === null) { current = readAppearance(JSON.stringify({ ...load(), ...transient })); notify(); }
}
function subscribe(fn: () => void) {
  if (!listeners.size) {
    current = readAppearance(JSON.stringify({ ...load(), ...transient }));
    window.addEventListener('storage', storage);
  }
  listeners.add(fn);
  return () => { listeners.delete(fn); if (!listeners.size) window.removeEventListener('storage', storage); };
}
export function useRoomAppearance() { return useSyncExternalStore(subscribe, () => current); }
function locked<T>(action: () => T | Promise<T>, mustSave = false): Promise<T> {
  if (navigator.locks) return navigator.locks.request(KEY, action);
  if (mustSave) return Promise.reject(new Error('This browser cannot save monitor uploads. Try an up-to-date browser.'));
  return Promise.resolve().then(action);
}
// Merge fresh preferences under the origin-wide lock before retiring any old files.
function commit(patch: Partial<RoomAppearancePrefs>, mustSave = false) {
  let saved: ReturnType<typeof stored> = { prefs: current, main: undefined, side: undefined };
  try { saved = stored(); } catch { /* Ordinary controls still work for this visit. */ }
  const next = readAppearance(JSON.stringify({ ...saved.prefs, ...transient, ...patch }));
  const main = 'mainMedia' in patch || 'mainDecor' in patch, side = 'sideMedia' in patch || 'decor' in patch;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...next,
      mainRevision: main ? crypto.randomUUID() : saved.main,
      sideRevision: side ? crypto.randomUUID() : saved.side }));
    transient = {};
  } catch {
    if (mustSave) throw new Error('Your screen could not be saved in this browser. Try freeing some browser storage.');
    transient = { ...transient, ...patch };
  }
  current = next;
  if (main) versions.main++;
  if (side) versions.side++;
  notify();
  return saved.prefs;
}
export function setRoomAppearance(patch: Partial<RoomAppearancePrefs>, mustSave = false) {
  return locked(() => { commit(patch, mustSave); }, mustSave);
}
async function retire(media?: MonitorMedia) {
  if (media && current.mainMedia?.id !== media.id && current.sideMedia?.id !== media.id) await removeMonitorFile(media.id).catch(() => {});
}
export function resetRoomAppearance() {
  return locked(async () => {
    const saved = load();
    const old = commit({ ...DEFAULT_APPEARANCE, mainMedia: undefined, sideMedia: undefined }, !!(saved.mainMedia || saved.sideMedia));
    await Promise.all([retire(old.mainMedia), retire(old.sideMedia)]);
  });
}
export async function uploadMonitorMedia(monitor: Monitor, file: File) {
  if (!navigator.locks) throw new Error('This browser cannot save monitor uploads. Try an up-to-date browser.');
  const version = ++versions[monitor];
  let stamp: string | undefined;
  try { stamp = stored()[monitor]; } catch { throw new Error('Browser storage is unavailable. Try allowing storage for Lilt.'); }
  const prepared = await prepareMonitorMedia(file);
  if (versions[monitor] !== version) throw new Error('The screen changed while opening the file. Choose it again.');
  const id = await saveMonitorFile(prepared);
  try {
    await locked(async () => {
      if (versions[monitor] !== version || stored()[monitor] !== stamp) throw new Error('The screen changed while opening the file. Choose it again.');
      const media: MonitorMedia = { id, name: prepared.name, kind: prepared.kind, paused: matchMedia('(prefers-reduced-motion: reduce)').matches };
      const old = commit(monitor === 'main' ? { mainDecor: 'custom', mainMedia: media } : { decor: 'custom', sideMedia: media }, true);
      await retire(old[monitor === 'main' ? 'mainMedia' : 'sideMedia']);
    }, true);
  } catch (error) { await removeMonitorFile(id).catch(() => {}); throw error; }
}
export function removeMonitorMedia(monitor: Monitor) {
  return locked(async () => {
    const old = commit(monitor === 'main' ? { mainDecor: 'original', mainMedia: undefined } : { decor: 'original', sideMedia: undefined }, true);
    await retire(old[monitor === 'main' ? 'mainMedia' : 'sideMedia']);
  }, true);
}
export function pauseMonitorMedia(monitor: Monitor, id: string, paused: boolean) {
  return locked(() => {
    const media = stored().prefs[monitor === 'main' ? 'mainMedia' : 'sideMedia'];
    if (!media || media.id !== id) return;
    commit(monitor === 'main' ? { mainMedia: { ...media, paused } } : { sideMedia: { ...media, paused } }, true);
  }, true);
}
