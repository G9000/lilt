import { loadRoomImage } from './roomReadiness';
import { useSyncExternalStore } from 'react';
import { LIGHTS } from './scene';
import { PLAYER_KEY, playerImage, readPlayer, type Player } from './player';
import { CHAIR_MASK } from './chair';

function stored() { try { return readPlayer(localStorage.getItem(PLAYER_KEY)); } catch { return readPlayer(null); } }
let state: { selected: Player; shown: Player | null; failed: boolean; unsaved: boolean; ready: boolean } = {
  selected: stored(), shown: null, failed: false, unsaved: false, ready: false,
};
let generation = 0;
let started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

export function retryPlayerArt() {
  const request = ++generation, selected = state.selected;
  state = { ...state, failed: false, ready: false }; emit();
  // Keep the previous painting until the device, background repairs and chair silhouette are ready.
  void Promise.all([playerImage(selected), CHAIR_MASK, ...LIGHTS.map(light => `room/players/clear-${light}.png`)].map(loadRoomImage))
    .then(() => { if (request === generation) { state = { ...state, shown: selected, ready: true }; emit(); } },
      () => { if (request === generation) { state = { ...state, failed: true, ready: true }; emit(); } });
}
export function choosePlayer(selected: Player) {
  let unsaved = false;
  try { localStorage.setItem(PLAYER_KEY, selected); } catch { unsaved = true; }
  state = { ...state, selected, unsaved };
  retryPlayerArt();
}
function sync(event: StorageEvent) {
  if (event.key !== PLAYER_KEY && event.key !== null) return;
  state = { ...state, selected: stored(), unsaved: false };
  retryPlayerArt();
}
function subscribe(listener: () => void) {
  if (!listeners.size) window.addEventListener('storage', sync);
  listeners.add(listener);
  if (!started) { started = true; retryPlayerArt(); }
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener('storage', sync); };
}
export const usePlayer = () => useSyncExternalStore(subscribe, () => state);
