import { loadRoomImage, useRoomArtReady } from './roomReadiness';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { roomStyles } from '../desk/roomStyles';
import { LIGHTS, W, H } from './scene';
import { PLANTS, PLANT_KEY, readPlant, plantDays, plantCanopyScale, plantImage, type Plant } from './plant';
import { ObjectOutline } from './ObjectOutline';
import { useArtworkHold } from './useArtworkHold';

function PlantShape({ plant, count, outline = false }: { plant: Plant; count: number; outline?: boolean }) {
  return <>
    <img src={plantImage(plant)} alt="" draggable={false} className="absolute inset-0 h-full w-full max-w-none"
      style={{ clipPath: 'inset(75% 0 0)' }} />
    <img src={plantImage(plant)} alt="" draggable={false} className={`${outline ? 'room-plant-outline-canopy' : 'room-plant-canopy'} absolute inset-0 h-full w-full max-w-none transition-transform duration-1000 motion-reduce:transition-none`}
      style={{ clipPath: 'inset(0 0 25%)', transformOrigin: '50% 75%', transform: `scale(${plantCanopyScale(count)})` }} />
  </>;
}

function storedPlant() { try { return readPlant(localStorage.getItem(PLANT_KEY)); } catch { return readPlant(null); } }

export const openRoomPlant = () => window.dispatchEvent(new Event('lilt:plant'));

/** The room's floor plant: a local background repair and a shaded cutout, both in painting pixels. */
export function RoomPlant({ days, inside }: { days: number; inside: boolean }) {
  const [plant, setPlant] = useState(storedPlant);
  const [shown, setShown] = useState<Plant | null>(null);
  const [open, setOpen] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<typeof plant | null>(null);
  useRoomArtReady('plant', settled === plant);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const count = plantDays(days);
  const summary = count ? `${count} day${count === 1 ? '' : 's'} of practice this week` : 'A new week. Room to grow.';
  const choose = (id: Plant) => {
    setPlant(id);
    try { localStorage.setItem(PLANT_KEY, id); setUnsaved(false); } catch { setUnsaved(true); }
  };
  const openPicker = () => { if (!inside) { returnFocus.current = document.activeElement as HTMLElement; setOpen(true); } };
  const close = () => { dialog.current?.close(); setOpen(false); returnFocus.current?.focus(); };
  const hold = useArtworkHold({ onHold: openPicker, disabled: inside || open });
  useEffect(() => {
    let ignore = false;
    setFailed(false);
    setSettled(null);
    // Keep the original painting (or the last loaded plant) until the entire replacement is ready.
    void Promise.all([plantImage(plant), ...LIGHTS.map(light => `room/plants/clear-${light}.png`)].map(loadRoomImage))
      .then(() => { if (!ignore) { setShown(plant); setSettled(plant); } }, () => { if (!ignore) { setFailed(true); setSettled(plant); } });
    return () => { ignore = true; };
  }, [plant, attempt]);
  useEffect(() => {
    const sync = (e: StorageEvent) => { if (e.key === PLANT_KEY || e.key === null) { setPlant(storedPlant()); setUnsaved(false); } };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => {
    window.addEventListener('lilt:plant', openPicker);
    return () => window.removeEventListener('lilt:plant', openPicker);
  }, [inside]); // The event also opens this picker from the room's narrow-screen shortcuts.
  useEffect(() => { if (inside) setOpen(false); }, [inside]);
  useEffect(() => { if (open) dialog.current?.showModal(); return () => { dialog.current?.close(); }; }, [open]);

  return <>
    {shown && <>
      <div className="room-plant-clear absolute pointer-events-none" style={{ left: 300, top: 386, width: 176, height: 334,
        maskImage: 'linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent), linear-gradient(to bottom, transparent, black 8px, black calc(100% - 8px), transparent)', maskComposite: 'intersect' }}>
        {LIGHTS.map(light => <img key={light} src={`room/plants/clear-${light}.png`} alt="" draggable={false}
          className="absolute max-w-none select-none transition-opacity duration-[2000ms] ease-[ease] motion-reduce:transition-none"
          style={{ left: -300, top: -386, width: W, height: H, opacity: `var(--room-${light}-opacity, ${light === 'day' ? 1 : 0})` }} />)}
      </div>
      <div className="room-plant-art absolute pointer-events-none select-none transition-[filter] duration-[2000ms] ease-[ease] motion-reduce:transition-none" data-plant={shown} data-days={count}
        style={{ left: 286, top: 366, width: 192, height: 360, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 94% 100%, 0 84%)',
          filter: 'brightness(var(--plant-brightness, 1)) saturate(var(--plant-saturation, 1)) sepia(var(--plant-sepia, 0))' }}>
        <PlantShape plant={shown} count={count} />
        <ObjectOutline kind="plant"><PlantShape plant={shown} count={count} outline /></ObjectOutline>
      </div>
    </>}
    <button type="button" disabled={inside} aria-label={`Choose your plant. ${summary}`} aria-haspopup="dialog" aria-expanded={open}
      data-outlined={!!shown}
      className={['room-plant-target pointer-events-auto', roomStyles['room-object']].join(' ')} style={{ left: 382, top: 548, width: 132, height: 312 }}
      {...hold} title="Hold to choose your plant">
      <span>Hold to choose plant · {summary}</span>
    </button>
    {open && createPortal(<dialog ref={dialog} aria-labelledby="plant-picker-title" onCancel={e => { e.preventDefault(); close(); }}
      onClick={e => { if (e.target === e.currentTarget) close(); }} onPointerDown={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}
      className="m-auto max-h-[calc(100dvh-32px)] w-[420px] max-w-[calc(100vw-24px)] overflow-auto rounded-[22px] border border-[var(--hair)] bg-[var(--win)] p-0 text-[var(--ink)] shadow-2xl backdrop:bg-black/20 backdrop:backdrop-blur-sm">
      <div className="p-5">
        <div className="flex items-center justify-between gap-3"><h2 id="plant-picker-title" className="m-0 text-xl font-semibold">Choose your plant</h2>
          <button type="button" onClick={close} aria-label="Close plant picker" className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--fill)]"><svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button></div>
        <p className="mb-4 mt-2 text-sm text-[var(--ink-2)]">A little life beside your desk.</p>
        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Plants">{PLANTS.map(p => <button key={p.id} type="button" aria-pressed={plant === p.id} onClick={() => choose(p.id)}
          className="flex min-h-11 flex-col! items-center justify-center rounded-xl border border-[var(--hair)] bg-[var(--fill)] px-2 py-3 text-[var(--ink)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
          <img src={plantImage(p.id)} alt="" className="block h-36 w-24 object-contain" /><span className="mt-2 block text-sm">{p.name}</span>
        </button>)}</div>
        <p className="mb-0 mt-4 text-center text-sm text-[var(--ink-2)]">{summary}{count > 0 ? '. A little more room to grow.' : ''}</p>
        <p className="mb-0 mt-1 text-center text-xs text-[var(--ink-2)]">Its leaves grow a little with each day you practise.</p>
        {failed ? <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Couldn't load this plant. Your previous plant is still here. <button type="button" onClick={() => setAttempt(n => n + 1)} className="underline">Try again</button></p>
          : shown !== plant && <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Getting your plant ready…</p>}
        {unsaved && <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Your plant changed here, but this browser couldn't save it for next time.</p>}
        <button type="button" onClick={close} className="mt-4 min-h-11 w-full rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--page)]">Done</button>
      </div>
    </dialog>, document.body)}
  </>;
}
