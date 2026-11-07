import { useEffect, useRef, useState } from 'react';
import { CAT_KEY, catImage, readCat, type RoomCat } from './catChoices';
import { loadRoomImage } from './roomReadiness';

function stored() { try { return readCat(localStorage.getItem(CAT_KEY)); } catch { return 'original' as const; } }

export function useRoomCat() {
  const [selected, setSelected] = useState(stored);
  const [art, setArt] = useState<{ shown: RoomCat; image: HTMLImageElement }>();
  const [settled, setSettled] = useState<RoomCat | null>(null);
  const [failed, setFailed] = useState(false), [unsaved, setUnsaved] = useState(false), [attempt, setAttempt] = useState(0);
  const current = useRef(art); current.current = art;
  useEffect(() => {
    let ignore = false;
    setFailed(false); setSettled(null);
    void loadRoomImage(catImage(selected)).then(image => {
      if (!ignore) { setArt({ shown: selected, image }); setSettled(selected); }
    }, async () => {
      if (ignore) return;
      // First-visit failures still get the familiar cat; later failures keep the previous one.
      if (!current.current && selected !== 'original') {
        try {
          const image = await loadRoomImage(catImage('original'));
          if (!ignore) setArt({ shown: 'original', image });
        } catch { /* The room can still open if neither image is available. */ }
      }
      if (!ignore) { setFailed(true); setSettled(selected); }
    });
    return () => { ignore = true; };
  }, [selected, attempt]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === CAT_KEY || event.key === null) { setSelected(stored()); setUnsaved(false); }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const choose = (value: RoomCat) => {
    const next = readCat(value); setSelected(next);
    try { localStorage.setItem(CAT_KEY, next); setUnsaved(false); } catch { setUnsaved(true); }
  };
  return { selected, shown: art?.shown, image: art?.image, ready: settled === selected, failed, unsaved, choose, retry: () => setAttempt(n => n + 1) };
}
export type RoomCatState = ReturnType<typeof useRoomCat>;
