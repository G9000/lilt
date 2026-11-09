import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MUGS, TEA_KEY, readTea, remainingTea, teaTime, type Tea } from './tea';
import { playSound, prepareSound } from '../sounds';
import { roomStyles } from '../desk/roomStyles';
import { PaintedMug, TeaMug, useMugArtwork } from './MugArt';
import { useArtworkHold } from './useArtworkHold';

export const openTeaBreak = () => window.dispatchEvent(new Event('lilt:tea'));

const CLINK_KEY = 'lilt.room.tea.clink';
function clinkOn() { try { return localStorage.getItem(CLINK_KEY) === 'on'; } catch { return false; } }

function loadTea() {
  try { return readTea(localStorage.getItem(TEA_KEY)); } catch { return readTea(null); }
}

const choice = 'min-h-11 rounded-xl border border-[var(--hair)] bg-[var(--fill)] px-3 py-2 text-[var(--ink)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]';

export function TeaBreak({ inside }: { inside: boolean }) {
  const [tea, setTea] = useState(loadTea);
  const [now, setNow] = useState(Date.now);
  const [open, setOpen] = useState(false);
  const [mugChoices, setMugChoices] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [clink, setClink] = useState(clinkOn);
  const returnFocus = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const { shown, failed, retry } = useMugArtwork(tea.mug);
  const remaining = remainingTea(tea.endsAt, now);
  const running = remaining !== null && remaining > 0;
  const finished = remaining === 0;
  const previous = useRef(remaining);
  const status = finished ? "Whenever you're ready." : running ? 'Enjoy your tea.' : 'A little time for yourself.';
  const openPicker = (artwork = false) => {
    if (!inside) { returnFocus.current = document.activeElement as HTMLElement; setNow(Date.now()); setMugChoices(artwork); setOpen(true); }
  };
  const mugHold = useArtworkHold({ onHold: () => openPicker(true), onClick: () => openPicker(), disabled: inside });

  const save = (patch: Partial<Tea>) => {
    const next = { ...tea, ...patch };
    setTea(next); setNow(Date.now());
    try { localStorage.setItem(TEA_KEY, JSON.stringify(next)); setUnsaved(false); }
    catch { setUnsaved(true); }
  };
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const wake = () => { previous.current = remainingTea(tea.endsAt, Date.now()); tick(); };
    const id = running ? window.setInterval(tick, 1000) : undefined;
    window.addEventListener('focus', wake);
    document.addEventListener('visibilitychange', wake);
    return () => { window.clearInterval(id); window.removeEventListener('focus', wake); document.removeEventListener('visibilitychange', wake); };
  }, [running, tea.endsAt]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === TEA_KEY || e.key === null) { setTea(loadTea()); setNow(Date.now()); }
      if (e.key === CLINK_KEY || e.key === null) setClink(clinkOn());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => {
    // Only the focused room that observes completion rings; returning later or reloading is quiet.
    if (remaining === 0 && previous.current !== null && previous.current > 0 && tea.endsAt !== null && now - tea.endsAt < 1500 && clink && !inside && !document.hidden && document.hasFocus()) playSound('clink', true);
    previous.current = remaining;
  }, [remaining, clink, inside, now, tea.endsAt]);
  useEffect(() => { if (inside) setOpen(false); }, [inside]);
  useEffect(() => {
    const show = () => openPicker();
    window.addEventListener('lilt:tea', show);
    return () => window.removeEventListener('lilt:tea', show);
  }, [inside]);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    return () => { dialog.current?.close(); };
  }, [open]);
  const close = () => { dialog.current?.close(); setOpen(false); returnFocus.current?.focus(); };

  return <>
    {shown && <PaintedMug mug={shown} steaming={running} warm={!finished} />}
    <button type="button" className={['room-mug-target pointer-events-auto', roomStyles['room-object']].join(' ')}
      data-outlined={!!shown}
      style={{ left: 848, top: 509, width: 66, height: 60 }}
      aria-label="Tea break" aria-haspopup="dialog" aria-expanded={open} disabled={inside}
      {...mugHold} data-room-tip={`Click for a tea break${running ? ` · ${teaTime(remaining)}` : finished ? " · Whenever you're ready." : ''} · Hold to change mug`}
      data-room-keyboard-tip={`Enter for a tea break${running ? ` · ${teaTime(remaining)}` : finished ? " · Whenever you're ready." : ''} · Choose Change mug in the controls`} />
    <span role="status" className="sr-only">{finished ? "Tea break finished. Whenever you're ready." : ''}</span>
    {open && createPortal(<dialog ref={dialog} aria-labelledby="tea-title" onCancel={e => { e.preventDefault(); close(); }}
      onClick={e => { if (e.target === e.currentTarget) close(); }} onPointerDown={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}
      className="m-auto max-h-[calc(100dvh-32px)] w-[340px] max-w-[calc(100vw-24px)] overflow-auto rounded-[22px] border border-[var(--hair)] bg-[var(--win)] p-0 text-[var(--ink)] shadow-2xl backdrop:bg-black/20 backdrop:backdrop-blur-sm">
      <div className="p-5">
        <div className="flex items-center justify-between gap-3"><h2 id="tea-title" className="m-0 text-xl font-semibold">Tea break</h2>
          <button type="button" onClick={close} aria-label="Close tea break" className="min-h-11 min-w-11 rounded-full bg-[var(--fill)] text-xl">×</button></div>
        <div className="mx-auto w-32"><TeaMug mug={tea.mug} steaming={running} /></div>
        <p className="m-0 text-center text-sm text-[var(--ink-2)]">{status}</p>
        {running && <p className="my-2 text-center text-2xl tabular-nums" role="timer" aria-live="off">{teaTime(remaining)}</p>}
        <details className="mt-5" open={mugChoices} onToggle={event => setMugChoices(event.currentTarget.open)}>
          <summary className="min-h-11 cursor-pointer rounded-lg px-2 py-3 text-sm text-[var(--ink-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">Change mug</summary>
          <fieldset><legend className="sr-only">Choose your mug</legend>
            <div className="grid grid-cols-4 gap-2">{MUGS.map(mug => <button type="button" key={mug.id} className={`${choice} px-1! py-1!`} aria-label={mug.label} aria-pressed={tea.mug === mug.id} title={mug.label} onClick={() => save({ mug: mug.id })}><TeaMug mug={mug.id} /></button>)}</div>
            <p className="mb-0 mt-2 text-center text-xs text-[var(--ink-2)]">{MUGS.find(m => m.id === tea.mug)!.label}</p>
          </fieldset>
        </details>
        {failed ? <p role="status" className="mb-0 mt-3 text-xs text-[var(--ink-2)]">Couldn't load this mug. Your previous cup is still here. <button type="button" onClick={retry} className="underline">Try again</button></p>
          : shown !== tea.mug && <p role="status" className="mb-0 mt-3 text-xs text-[var(--ink-2)]">Getting your mug ready…</p>}
        {!running && <fieldset className="mt-5"><legend className="text-sm">A little pause</legend><div className="grid grid-cols-3 gap-2">
          {([3, 5, 10] as const).map(minutes => <button key={minutes} type="button" className={choice} aria-pressed={tea.minutes === minutes} onClick={() => save({ minutes })}>{minutes} min</button>)}
        </div></fieldset>}
        <label className="mb-0 mt-4 flex min-h-11 items-center gap-3 text-sm font-normal"><input type="checkbox" checked={clink} onChange={e => {
          setClink(e.target.checked);
          try { localStorage.setItem(CLINK_KEY, e.target.checked ? 'on' : 'off'); } catch { setUnsaved(true); }
          if (e.target.checked) prepareSound();
        }} />A soft clink when it's ready</label>
        <button type="button" className="mt-3 min-h-11 w-full rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--page)]" onClick={() => { if (!running && clink) prepareSound(); save({ endsAt: running ? null : Date.now() + tea.minutes * 60000 }); close(); }}>{running ? 'End break' : 'Start break'}</button>
        {unsaved && <p className="mb-0 mt-3 text-xs text-[var(--ink-2)]" role="status">Your timer works here, but this browser couldn't save it for next time.</p>}
      </div>
    </dialog>, document.body)}
  </>;
}
