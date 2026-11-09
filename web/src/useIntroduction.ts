import { useSyncExternalStore } from 'react';
import { createIntroductionStore, type IntroductionState } from './introduction';

const store = createIntroductionStore(() => localStorage);
const event = 'lilt:introduction';
function subscribe(notify: () => void) {
  const changed = (e: StorageEvent) => { store.changed(e.key); notify(); };
  window.addEventListener(event, notify);
  window.addEventListener('storage', changed);
  return () => { window.removeEventListener(event, notify); window.removeEventListener('storage', changed); };
}
export function useIntroduction(course: string) {
  return useSyncExternalStore(subscribe, () => store.read(course));
}
export function useIntroductionSaved(course: string) {
  return useSyncExternalStore(subscribe, () => store.persisted(course));
}
export function saveIntroduction(course: string, value: IntroductionState) {
  const saved = store.save(course, value);
  window.dispatchEvent(new Event(event));
  return saved;
}
