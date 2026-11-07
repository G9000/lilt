import { loadRoomImage } from './roomReadiness';
import { useSyncExternalStore } from 'react';
import { CHAIR_KEY, chairAssets, readChair, type Chair } from './chair';

function stored() { try { return readChair(localStorage.getItem(CHAIR_KEY)); } catch { return 'original' as const; } }
let state: { selected: Chair; shown: Chair; failed: boolean; unsaved: boolean; ready: boolean } = {
  selected: stored(), shown: 'original', failed: false, unsaved: false, ready: false,
};
let generation = 0, started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

export function retryChairArt() {
  const request = ++generation, selected = state.selected;
  if (selected === 'original') { state = { ...state, shown: selected, failed: false, ready: true }; emit(); return; }
  state = { ...state, failed: false, ready: false }; emit();
  void Promise.all(chairAssets(selected).map(loadRoomImage)).then(() => {
    if (request === generation) { state = { ...state, shown: selected, ready: true }; emit(); }
  }, () => { if (request === generation) { state = { ...state, failed: true, ready: true }; emit(); } });
}
export function chooseChair(selected: Chair) {
  let unsaved = false;
  try { localStorage.setItem(CHAIR_KEY, selected); } catch { unsaved = true; }
  state = { ...state, selected, unsaved };
  retryChairArt();
}
function sync(event: StorageEvent) {
  if (event.key !== CHAIR_KEY && event.key !== null) return;
  state = { ...state, selected: stored(), unsaved: false }; retryChairArt();
}
function subscribe(listener: () => void) {
  if (!listeners.size) window.addEventListener('storage', sync);
  listeners.add(listener);
  if (!started) { started = true; retryChairArt(); }
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener('storage', sync); };
}
export const useChair = () => useSyncExternalStore(subscribe, () => state);
