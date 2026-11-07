import { createContext, useContext, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

/** Loading alone is not enough: the browser must be able to paint the replacement. */
export async function loadRoomImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

interface Readiness {
  ready: boolean;
  paintRef: RefObject<HTMLDivElement>;
  report: (id: string, ready?: boolean) => void;
}
const RoomReadiness = createContext<Readiness | null>(null);

/** Each mounted room gets its own first reveal, including StrictMode and navigation remounts. */
export function RoomReadinessProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const paintRef = useRef<HTMLDivElement>(null);
  const [control] = useState(() => {
    const parts = new Map<string, boolean>();
    let revision = 0, frame = 0, active = false, revealed = false;
    const check = () => {
      const request = ++revision;
      cancelAnimationFrame(frame);
      if (!active || revealed || !parts.size || [...parts.values()].some(value => !value)) return;
      frame = requestAnimationFrame(() => {
        // Read the committed composition, including images inserted by the final ready part.
        const images = [...(paintRef.current?.querySelectorAll('img') ?? [])];
        void Promise.allSettled(images.map(image => image.decode())).then(() => {
          if (!active || request !== revision || revealed) return;
          revealed = true;
          setReady(true);
        });
      });
    };
    return {
      report(id: string, value?: boolean) { if (value === undefined) parts.delete(id); else parts.set(id, value); check(); },
      start() { active = true; check(); },
      stop() { active = false; revision++; cancelAnimationFrame(frame); },
      check,
    };
  });
  useLayoutEffect(() => {
    const observer = new MutationObserver(control.check);
    if (paintRef.current) observer.observe(paintRef.current, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'poster'] });
    control.start();
    return () => { observer.disconnect(); control.stop(); };
  }, [control]);
  return <RoomReadiness.Provider value={{ ready, paintRef, report: control.report }}>{children}</RoomReadiness.Provider>;
}

/** Report from the component that commits the art, after selected art or failure fallback is ready. */
export function useRoomArtReady(name: string, ready: boolean) {
  const context = useContext(RoomReadiness);
  const id = `${name}-${useId()}`;
  const report = context?.report;
  useLayoutEffect(() => {
    report?.(id, ready);
    return () => report?.(id);
  }, [report, id, ready]);
}

export function useRoomReveal() {
  const context = useContext(RoomReadiness);
  if (!context) throw new Error('Room artwork needs its readiness provider');
  return context;
}
