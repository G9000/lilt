import { useEffect, useState } from 'react';
import { loadRoomImage, useRoomArtReady } from './roomReadiness';
import { hardwareImage, hardwareKey, hardwareMask, readFinish, type Finish, type Hardware } from './hardware';

function stored(kind: Hardware) {
  try { return readFinish(localStorage.getItem(hardwareKey(kind))); } catch { return 'black' as const; }
}

export function useHardware(kind: Hardware) {
  const [selected, setSelected] = useState(() => stored(kind));
  const [shown, setShown] = useState<Finish | null>(null);
  const [settled, setSettled] = useState<Finish | null>(null);
  const [failed, setFailed] = useState(false), [unsaved, setUnsaved] = useState(false), [attempt, setAttempt] = useState(0);
  useRoomArtReady(kind, settled === selected);
  useEffect(() => {
    let ignore = false;
    setFailed(false); setSettled(null);
    void Promise.all([hardwareMask(kind), hardwareImage(kind, selected)].map(loadRoomImage)).then(() => {
      if (!ignore) { setShown(selected); setSettled(selected); }
    }, () => { if (!ignore) { setFailed(true); setSettled(selected); } });
    return () => { ignore = true; };
  }, [kind, selected, attempt]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === hardwareKey(kind) || event.key === null) { setSelected(stored(kind)); setUnsaved(false); }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [kind]);
  const choose = (finish: Finish) => {
    setSelected(finish);
    try { localStorage.setItem(hardwareKey(kind), finish); setUnsaved(false); } catch { setUnsaved(true); }
  };
  return { selected, shown, failed, unsaved, choose, retry: () => setAttempt(n => n + 1) };
}
