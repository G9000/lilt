export type IntroductionState = 'new' | '1' | '2' | '3' | 'skipped' | 'complete';
export const introductionFinished = (state: IntroductionState) => state === 'skipped' || state === 'complete';
const prefix = 'lilt.introduction.v1.';
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

export function createIntroductionStore(storage: () => Storage) {
  const fallback = new Map<string, IntroductionState>();
  const read = (course: string): IntroductionState => {
    if (fallback.has(course)) return fallback.get(course)!;
    try {
      const value = storage().getItem(prefix + course);
      if (value === '1' || value === '2' || value === '3' || value === 'skipped' || value === 'complete') return value;
    } catch { /* Reading and skipping still work without browser storage. */ }
    return 'new';
  };
  return {
    read,
    persisted: (course: string) => !fallback.has(course),
    save(course: string, value: IntroductionState): boolean {
      // Replaying the guide never makes a finished introduction unfinished.
      if (introductionFinished(read(course)) && !introductionFinished(value)) return !fallback.has(course);
      try { storage().setItem(prefix + course, value); fallback.delete(course); return true; }
      catch { fallback.set(course, value); return false; }
    },
    changed(key: string | null) {
      if (key === null) fallback.clear();
      else if (key.startsWith(prefix)) fallback.delete(key.slice(prefix.length));
    },
  };
}
