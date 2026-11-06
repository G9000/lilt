import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { roomStyles } from '../desk/roomStyles';
import { cx } from '../ui/cx';
import { desktop } from '../ui/desktop';
import { PlantArt } from './PlantArt';
import { PLANTS, PLANT_KEY, readPlant, plantDays, type Plant } from './plant';

function storedPlant() { try { return readPlant(localStorage.getItem(PLANT_KEY)); } catch { return readPlant(null); } }

export function PlantWidget({ days, inside }: { days: number; inside: boolean }) {
  const [plant, setPlant] = useState(storedPlant);
  const [open, setOpen] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const down = useRef<{ x: number; y: number } | null>(null);
  const count = plantDays(days);
  const summary = count ? `Practised ${count} day${count === 1 ? '' : 's'} this week` : 'A new week: it grows each day you practise';
  const choose = (id: Plant) => {
    setPlant(id);
    try { localStorage.setItem(PLANT_KEY, id); setUnsaved(false); } catch { setUnsaved(true); }
  };
  const close = () => { dialog.current?.close(); setOpen(false); trigger.current?.focus(); };
  useEffect(() => {
    const sync = (e: StorageEvent) => { if (e.key === PLANT_KEY || e.key === null) { setPlant(storedPlant()); setUnsaved(false); } };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => { if (inside) setOpen(false); }, [inside]);
  useEffect(() => { if (open) dialog.current?.showModal(); return () => { dialog.current?.close(); }; }, [open]);

  return <>
    <button ref={trigger} type="button" disabled={inside} aria-label={`Choose your plant. ${summary}`} aria-haspopup="dialog" aria-expanded={open}
      className={cx(['ds-w ds-plant relative border-0 text-left cursor-pointer', roomStyles['ds-w'], roomStyles['ds-plant'], 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]'].join(' '), desktop['ds-w'])}
      title="Choose your plant" onPointerDown={e => { down.current = { x: e.clientX, y: e.clientY }; }}
      onClick={e => { const start = down.current; down.current = null; if (!inside && (e.detail === 0 || !start || Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6)) setOpen(true); }}>
      <PlantArt plant={plant} days={count} />
      <span className="absolute right-2 top-2 rounded-full bg-[#fbf6ee] px-1.5 py-0.5 text-[9px] text-[#70614e]">Choose plant</span>
      <span className={['ds-p-text', roomStyles['ds-p-text']].join(' ')}>{count
        ? <><b>{count} day{count === 1 ? '' : 's'}</b><span>this week. It grows when you practise.</span></>
        : <><b>A new week</b><span>It grows each day you practise.</span></>}</span>
    </button>
    {open && createPortal(<dialog ref={dialog} aria-labelledby="plant-picker-title" onCancel={e => { e.preventDefault(); close(); }}
      onClick={e => { if (e.target === e.currentTarget) close(); }} onPointerDown={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}
      className="m-auto max-h-[calc(100dvh-32px)] w-[380px] max-w-[calc(100vw-24px)] overflow-auto rounded-[22px] border border-[var(--hair)] bg-[var(--win)] p-0 text-[var(--ink)] shadow-2xl backdrop:bg-black/20 backdrop:backdrop-blur-sm">
      <div className="p-5">
        <div className="flex items-center justify-between gap-3"><h2 id="plant-picker-title" className="m-0 text-xl font-semibold">Choose your plant</h2>
          <button type="button" onClick={close} aria-label="Close plant picker" className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--fill)]"><svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button></div>
        <p className="mb-4 mt-2 text-sm text-[var(--ink-2)]">A little growth each day you practise.</p>
        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Plants">{PLANTS.map(p => <button key={p.id} type="button" aria-pressed={plant === p.id} onClick={() => choose(p.id)}
          className="min-h-11 rounded-xl border border-[var(--hair)] bg-[var(--fill)] px-2 py-3 text-[var(--ink)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
          <span className="mx-auto block h-24 w-24"><PlantArt plant={p.id} days={count} /></span><span className="mt-2 block text-sm">{p.name}</span>
        </button>)}</div>
        <p className="mb-0 mt-4 text-center text-xs text-[var(--ink-2)]">{count ? `Showing your growth from ${count} day${count === 1 ? '' : 's'} this week.` : 'A new week. Your plant has room to grow.'}</p>
        {unsaved && <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Your plant changed here, but this browser couldn't save it for next time.</p>}
        <button type="button" onClick={close} className="mt-4 min-h-11 w-full rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--page)]">Done</button>
      </div>
    </dialog>, document.body)}
  </>;
}
