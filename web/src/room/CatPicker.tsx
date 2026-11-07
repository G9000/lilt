import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATS } from './catChoices';
import { type RoomCatState } from './useRoomCat';

export function CatPicker({ inside, state }: { inside: boolean; state: RoomCatState }) {
  const { selected, shown, failed, unsaved, choose, retry } = state;
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), opener = useRef<HTMLElement | null>(null);
  const title = useId();
  const close = () => {
    dialog.current?.close(); setOpen(false);
    const original = opener.current;
    (original?.isConnected && original.getClientRects().length ? original : document.querySelector<HTMLElement>('.room-appearance-trigger'))?.focus();
  };
  useEffect(() => {
    const show = () => { if (!inside) { opener.current = document.activeElement as HTMLElement; setOpen(true); } };
    window.addEventListener('lilt:cat-picker', show);
    return () => window.removeEventListener('lilt:cat-picker', show);
  }, [inside]);
  useEffect(() => { if (inside) setOpen(false); }, [inside]);
  useEffect(() => { if (open && !inside) dialog.current?.showModal(); else dialog.current?.close(); }, [open, inside]);
  if (!open || inside) return null;
  return createPortal(<dialog ref={dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) close(); }} onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}
    className="m-auto max-h-[calc(100dvh-32px)] w-[360px] max-w-[calc(100vw-24px)] overflow-auto rounded-[22px] border border-[var(--hair)] bg-[var(--win)] p-0 text-[var(--ink)] shadow-2xl backdrop:bg-black/20 backdrop:backdrop-blur-sm">
    <div className="p-5">
      <div className="flex items-center justify-between gap-3"><h2 id={title} className="m-0 text-xl font-semibold">Choose your cat</h2>
        <button type="button" onClick={close} aria-label="Close cat picker" className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--fill)]"><svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button></div>
      <p className="mb-4 mt-2 text-sm text-[var(--ink-2)]">Someone sleepy to keep you company. Click your cat in the room to give them a little pet.</p>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Cats">{CATS.map(cat => <button key={cat.id} type="button" aria-pressed={selected === cat.id} onClick={() => choose(cat.id)}
        className="flex min-h-11 flex-col! items-center rounded-xl border border-[var(--hair)] bg-[var(--fill)] px-3 py-3 text-[var(--ink)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
        <img src={cat.image} alt="" draggable={false} className="pointer-events-none h-20 w-full object-contain" /><span className="mt-2 text-xs font-medium">{cat.name}</span>
      </button>)}</div>
      {failed ? <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">{shown ? "Couldn't load this cat. Your previous companion is still here." : "Couldn't load the cat artwork."} <button type="button" onClick={retry} className="underline">Try again</button></p>
        : shown !== selected && <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Getting your cat comfortable…</p>}
      {unsaved && <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Your cat changed here, but this browser couldn't save the choice for next time.</p>}
      <button type="button" onClick={close} className="mt-4 min-h-11 w-full rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--page)]">Done</button>
    </div>
  </dialog>, document.body);
}
