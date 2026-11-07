import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { roomStyles } from '../desk/roomStyles';
import { CHAIRS, chairImage } from './chair';
import { chooseChair, retryChairArt, useChair } from './chairState';

export const openChairPicker = () => window.dispatchEvent(new Event('lilt:chair'));

export function ChairPicker({ inside }: { inside: boolean }) {
  const { selected, shown, failed, unsaved } = useChair();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), target = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const close = () => {
    dialog.current?.close(); setOpen(false);
    const opener = returnFocus.current;
    if (opener?.isConnected && opener.getClientRects().length) opener.focus();
    else {
      const shortcut = document.querySelector<HTMLButtonElement>('.room-chair-shortcut');
      (shortcut?.getClientRects().length ? shortcut : target.current)?.focus();
    }
  };
  useEffect(() => {
    const show = () => { if (!inside) { returnFocus.current = document.activeElement as HTMLElement; setOpen(true); } };
    window.addEventListener('lilt:chair', show);
    return () => window.removeEventListener('lilt:chair', show);
  }, [inside]);
  useEffect(() => { if (open && !inside) dialog.current?.showModal(); else dialog.current?.close(); }, [open, inside]);
  useEffect(() => { if (inside) setOpen(false); }, [inside]);
  return <>
    <button ref={target} type="button" disabled={inside} tabIndex={inside ? -1 : 0} aria-label="Choose your chair" aria-haspopup="dialog" aria-expanded={open}
      className={['room-chair-target pointer-events-auto', roomStyles['room-object']].join(' ')} style={{ left: 595, top: 555, width: 200, height: 240 }}
      onPointerDown={e => e.stopPropagation()} onPointerMove={e => e.stopPropagation()} onClick={openChairPicker}>
      <span>Choose chair</span>
    </button>
    {open && !inside && createPortal(<dialog ref={dialog} aria-labelledby="chair-picker-title" onCancel={e => { e.preventDefault(); close(); }}
      onClick={e => { if (e.target === e.currentTarget) close(); }} onPointerDown={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}
      className="m-auto max-h-[calc(100dvh-32px)] w-[360px] max-w-[calc(100vw-24px)] overflow-auto rounded-[22px] border border-[var(--hair)] bg-[var(--win)] p-0 text-[var(--ink)] shadow-2xl backdrop:bg-black/20 backdrop:backdrop-blur-sm">
      <div className="p-5">
        <div className="flex items-center justify-between gap-3"><h2 id="chair-picker-title" className="m-0 text-xl font-semibold">Choose your chair</h2>
          <button type="button" onClick={close} aria-label="Close chair picker" className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--fill)]"><svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button></div>
        <p className="mb-3 mt-1 text-sm text-[var(--ink-2)]">Make yourself comfortable.</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Chairs">{CHAIRS.map(chair => <button key={chair.id} type="button" aria-pressed={selected === chair.id} onClick={() => chooseChair(chair.id)}
          className="flex min-h-11 flex-col! items-center rounded-xl border border-[var(--hair)] bg-[var(--fill)] px-2 py-3 text-[var(--ink)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
          <svg viewBox="475 465 600 476" className="block h-28 w-full" aria-hidden="true"><image href={chairImage(chair.id)} width="1672" height="941" preserveAspectRatio="none" /></svg>
          <span className="mt-1 text-xs font-medium">{chair.name}</span>
        </button>)}</div>
        {failed ? <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Couldn't load this chair. Your previous chair is still here. <button type="button" onClick={retryChairArt} className="underline">Try again</button></p>
          : shown !== selected && <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Getting your chair ready…</p>}
        {unsaved && <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Your chair changed here, but this browser couldn't save it for next time.</p>}
        <button type="button" onClick={close} className="mt-4 min-h-11 w-full rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--page)]">Done</button>
      </div>
    </dialog>, document.body)}
  </>;
}
