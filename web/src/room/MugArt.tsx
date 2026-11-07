import { loadRoomImage, useRoomArtReady } from './roomReadiness';
import { useEffect, useState } from 'react';
import { LIGHTS, W, H } from './scene';
import { type Mug } from './tea';
import { ObjectOutline } from './ObjectOutline';

const mugImage = (mug: Mug) => `room/mugs/${mug}.png`;


export function useMugArtwork(mug: Mug) {
  const [shown, setShown] = useState<Mug | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<typeof mug | null>(null);
  useRoomArtReady('mug', settled === mug);
  useEffect(() => {
    let ignore = false;
    setFailed(false);
    setSettled(null);
    // Keep the painted cup until the full replacement is ready; stale choices cannot replace it.
    void Promise.all([mugImage(mug), ...LIGHTS.map(light => `room/mugs/clear-${light}.png`)].map(loadRoomImage))
      .then(() => { if (!ignore) { setShown(mug); setSettled(mug); } }, () => { if (!ignore) { setFailed(true); setSettled(mug); } });
    return () => { ignore = true; };
  }, [mug, attempt]);
  return { shown, failed, retry: () => setAttempt(n => n + 1) };
}

export function TeaMug({ mug, steaming = false, warm = false }: { mug: Mug; steaming?: boolean; warm?: boolean }) {
  const active = steaming || warm;
  const rim = { cream: 26, sage: 32, blue: 29, cat: 32 }[mug];
  return <div className="relative aspect-square w-full" aria-hidden="true">
    <img src={mugImage(mug)} data-mug={mug} alt="" draggable={false} className="block h-full w-full select-none" />
    <svg viewBox="0 0 100 100" data-steam={steaming ? 'brewing' : warm ? 'warm' : 'settled'}
      className={`tea-steam pointer-events-none absolute inset-0 h-full w-full overflow-visible transition-opacity duration-[1800ms] motion-reduce:transition-none ${steaming ? 'opacity-75' : warm ? 'opacity-45' : 'opacity-0'}`}
      fill="none" stroke="#fff4e6" strokeWidth="2" strokeLinecap="round" style={{ filter: 'blur(.4px)' }}>
      {[35, 44, 53].map((x, i) => <path key={x} d={`M${x} ${rim}c-7-8 8-13 1-21s-4-10 0-14`}
        className={active ? 'motion-safe:animate-[tea-steam_5s_ease-in-out_infinite]' : ''}
        style={{ opacity: .65, transformBox: 'fill-box', transformOrigin: 'center bottom', animationDuration: `${(steaming ? 4.4 : 6) + i * .6}s`, animationDelay: `${-i * 1.8 - .8}s` }} />)}
    </svg>
  </div>;
}

export function PaintedMug({ mug, steaming, warm }: { mug: Mug; steaming: boolean; warm: boolean }) {
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
      <TeaMug mug={mug} steaming={steaming} warm={warm} />
      <ObjectOutline kind="mug"><img src={mugImage(mug)} alt="" draggable={false} className="block h-full w-full" /></ObjectOutline>
    </div>
  </>;
}
