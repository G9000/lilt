import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATS, openCatPicker } from './catChoices';
import { type RoomCatState } from './useRoomCat';
import { CAT_BOX } from './scene';
import { roomStyles } from '../desk/roomStyles';
import { ObjectOutline } from './ObjectOutline';

export function CatPicker({ inside, state, onPet }: { inside: boolean; state: RoomCatState; onPet: () => void }) {
  const { selected, shown, failed, unsaved, choose, retry } = state;
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), opener = useRef<HTMLElement | null>(null);
  const press = useRef<{ id: number; x: number; y: number; timer: number } | null>(null);
  const suppressClick = useRef(false);
  const title = useId();
  const hint = useId();
  const stopPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };
  const cancelPress = () => {
    if (press.current) suppressClick.current = true;
    stopPress();
  };
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
  useEffect(() => { cancelPress(); }, [inside, open]);
  useEffect(() => {
    const hide = () => { if (document.hidden) cancelPress(); };
    window.addEventListener('blur', cancelPress);
    document.addEventListener('visibilitychange', hide);
    return () => { cancelPress(); window.removeEventListener('blur', cancelPress); document.removeEventListener('visibilitychange', hide); };
  }, []);
  useEffect(() => { if (open && !inside) dialog.current?.showModal(); else dialog.current?.close(); }, [open, inside]);
  return <>
    {state.image && <div className="room-cat-contour pointer-events-none absolute" style={{ left: CAT_BOX.x, top: CAT_BOX.y, width: CAT_BOX.w, height: CAT_BOX.h,
      transformOrigin: `50% ${CAT_BOX.h - 8}px`, transform: 'scale(var(--cat-scale-x, 1), var(--cat-scale-y, 1))' }}>
      <ObjectOutline kind="cat"><img src={state.image.src} alt="" draggable={false} className="block h-full w-full" /></ObjectOutline>
    </div>}
    <button type="button" disabled={inside || !state.image} tabIndex={inside ? -1 : 0} aria-label="Pet the cat" aria-describedby={hint} aria-haspopup="dialog" aria-expanded={open} data-outlined={!!state.image}
      className={`room-cat-target pointer-events-auto select-none ${roomStyles['room-object']}`}
      style={{ left: CAT_BOX.x + CAT_BOX.w / 2, top: CAT_BOX.y + CAT_BOX.h / 2, width: CAT_BOX.w, height: CAT_BOX.h }}
      onClick={event => { if (event.detail === 0 || !suppressClick.current) onPet(); }}
      onPointerDown={event => {
        event.stopPropagation();
        if (!event.isPrimary || event.button !== 0) return;
        cancelPress(); suppressClick.current = false;
        event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
        press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, timer: window.setTimeout(() => {
          suppressClick.current = true; openCatPicker();
        }, 650) };
      }}
      onPointerMove={event => {
        event.stopPropagation();
        const held = press.current;
        if (held?.id === event.pointerId && Math.hypot(event.clientX - held.x, event.clientY - held.y) > 10) cancelPress();
      }}
      onPointerUp={event => { if (press.current?.id === event.pointerId) stopPress(); }}
      onPointerCancel={cancelPress} onLostPointerCapture={cancelPress} onBlur={cancelPress}
      onKeyDown={event => { if (event.key === 'Escape') cancelPress(); }}
      onContextMenu={event => event.preventDefault()}>
      <span id={hint}>Click to pet · Hold to choose</span>
    </button>
    {open && !inside && createPortal(<dialog ref={dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); close(); }}
    onClickCapture={event => {
      // Touch release can target the newly opened modal instead of the captured cat.
      if (suppressClick.current && event.detail > 0) { suppressClick.current = false; event.preventDefault(); event.stopPropagation(); }
    }}
    onClick={event => { if (event.target === event.currentTarget) close(); }}
    onPointerDown={event => { suppressClick.current = false; event.stopPropagation(); }} onKeyDown={event => event.stopPropagation()}
    className="m-auto max-h-[calc(100dvh-32px)] w-[360px] max-w-[calc(100vw-24px)] overflow-auto rounded-[22px] border border-[var(--hair)] bg-[var(--win)] p-0 text-[var(--ink)] shadow-2xl backdrop:bg-black/20 backdrop:backdrop-blur-sm">
    <div className="p-5">
      <div className="flex items-center justify-between gap-3"><h2 id={title} className="m-0 text-xl font-semibold">Choose your cat</h2>
        <button type="button" onClick={close} aria-label="Close cat picker" className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--fill)]"><svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button></div>
      <p className="mb-4 mt-2 text-sm text-[var(--ink-2)]">Someone sleepy to keep you company.</p>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Cats">{CATS.map(cat => <button key={cat.id} type="button" aria-pressed={selected === cat.id} onClick={() => choose(cat.id)}
        className="flex min-h-11 flex-col! items-center rounded-xl border border-[var(--hair)] bg-[var(--fill)] px-3 py-3 text-[var(--ink)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
        <img src={cat.image} alt="" draggable={false} className="pointer-events-none h-20 w-full object-contain" /><span className="mt-2 text-xs font-medium">{cat.name}</span>
      </button>)}</div>
      {failed ? <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">{shown ? "Couldn't load this cat. Your previous companion is still here." : "Couldn't load the cat artwork."} <button type="button" onClick={retry} className="underline">Try again</button></p>
        : shown !== selected && <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Getting your cat comfortable…</p>}
      {unsaved && <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Your cat changed here, but this browser couldn't save the choice for next time.</p>}
      <button type="button" disabled={!state.image} onClick={() => { close(); onPet(); }} className="mt-4 min-h-11 w-full rounded-xl bg-[var(--fill)] px-4 py-2 text-sm font-medium text-[var(--ink)]">Pet the cat</button>
      <button type="button" onClick={close} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--page)]">Done</button>
    </div>
  </dialog>, document.body)}
  </>;
}
