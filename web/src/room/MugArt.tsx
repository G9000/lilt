import { useEffect, useState } from 'react';
import { LIGHTS, W, H } from './scene';
import { type Mug } from './tea';

const mugImage = (mug: Mug) => `room/mugs/${mug}.png`;
function loadImage(src: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(); image.onerror = () => reject(new Error('Mug artwork unavailable')); image.src = src;
  });
}

export function useMugArtwork(mug: Mug) {
  const [shown, setShown] = useState<Mug | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let ignore = false;
    setFailed(false);
    // Keep the painted cup until the full replacement is ready; stale choices cannot replace it.
    void Promise.all([mugImage(mug), ...LIGHTS.map(light => `room/mugs/clear-${light}.png`)].map(loadImage))
      .then(() => { if (!ignore) setShown(mug); }, () => { if (!ignore) setFailed(true); });
    return () => { ignore = true; };
  }, [mug, attempt]);
  return { shown, failed, retry: () => setAttempt(n => n + 1) };
}

export function TeaMug({ mug, steaming = false }: { mug: Mug; steaming?: boolean }) {
  return <div className="relative aspect-square w-full" aria-hidden="true">
    <img src={mugImage(mug)} data-mug={mug} alt="" draggable={false} className="block h-full w-full select-none" />
    <svg viewBox="0 0 100 100" className={`tea-steam pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-1000 motion-reduce:transition-none ${steaming ? 'opacity-60' : 'opacity-0'}`} fill="none" stroke="#eee4d7" strokeWidth="1.5" strokeLinecap="round">
      {[34, 44, 54].map((x, i) => <path key={x} d={`M${x} 22c-6-6 6-10 0-16`} className={steaming ? 'motion-safe:animate-[tea-steam_3s_ease-in-out_infinite]' : ''} style={{ animationDelay: `${i * -.8}s` }} />)}
    </svg>
  </div>;
}

export function PaintedMug({ mug, steaming }: { mug: Mug; steaming: boolean }) {
  return <>
    <div className="room-mug-clear absolute pointer-events-none" style={{ left: 810, top: 476, width: 80, height: 70,
      maskImage: 'linear-gradient(to right, transparent, black 6px, black calc(100% - 6px), transparent), linear-gradient(to bottom, transparent, black 6px, black calc(100% - 6px), transparent)', maskComposite: 'intersect' }}>
      {LIGHTS.map(light => <img key={light} src={`room/mugs/clear-${light}.png`} alt="" draggable={false}
        className="absolute max-w-none select-none transition-opacity duration-[2000ms] ease-[ease] motion-reduce:transition-none"
        style={{ left: -810, top: -476, width: W, height: H, opacity: `var(--room-${light}-opacity, ${light === 'day' ? 1 : 0})` }} />)}
    </div>
    <div className="room-mug-art absolute pointer-events-none transition-[filter] duration-[2000ms] ease-[ease] motion-reduce:transition-none" data-mug={mug}
      style={{ left: 810, top: 466, width: 80, height: 80,
        filter: 'brightness(var(--plant-brightness, 1)) saturate(var(--plant-saturation, 1)) sepia(var(--plant-sepia, 0))' }}>
      <TeaMug mug={mug} steaming={steaming} />
    </div>
  </>;
}
