import { loadRoomImage, useRoomArtReady } from './roomReadiness';
import { useEffect, useState } from 'react';
import { LIGHTS } from './scene';
import { propImage, propKey, readProp, type PropKind, type PropDesign } from './roomPropOptions';

function stored(kind: PropKind) {
  try { return readProp(kind, localStorage.getItem(propKey(kind))); } catch { return readProp(kind, null); }
}


export function useRoomProp(kind: PropKind) {
  const [selected, setSelected] = useState(() => stored(kind));
  const [shown, setShown] = useState<PropDesign | null>(null);
  const [failed, setFailed] = useState(false), [unsaved, setUnsaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<typeof selected | null>(null);
  useRoomArtReady(kind, settled === selected);
  useEffect(() => {
    let ignore = false;
    setFailed(false);
    setSettled(null);
    void Promise.all([propImage(selected), ...LIGHTS.map(light => `room/props/clear-${light}.png`)].map(loadRoomImage))
      .then(() => { if (!ignore) { setShown(selected); setSettled(selected); } }, () => { if (!ignore) { setFailed(true); setSettled(selected); } });
    return () => { ignore = true; };
  }, [selected, attempt]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === propKey(kind) || event.key === null) { setSelected(stored(kind)); setUnsaved(false); }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [kind]);
  const choose = (value: PropDesign) => {
    const next = readProp(kind, value);
    setSelected(next);
    try { localStorage.setItem(propKey(kind), next); setUnsaved(false); } catch { setUnsaved(true); }
  };
  return { selected, shown, failed, unsaved, choose, retry: () => setAttempt(value => value + 1) };
}
export type RoomPropState = ReturnType<typeof useRoomProp>;
