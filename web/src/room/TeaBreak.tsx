import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MUGS, TEA_KEY, readTea, remainingTea, teaTime, type Mug, type Tea } from './tea';
import { playSound, prepareSound } from '../sounds';

const CLINK_KEY = 'lilt.room.tea.clink';
function clinkOn() { try { return localStorage.getItem(CLINK_KEY) === 'on'; } catch { return false; } }

function loadTea() {
  try { return readTea(localStorage.getItem(TEA_KEY)); } catch { return readTea(null); }
}

export function TeaMug({ mug, steaming = false }: { mug: Mug; steaming?: boolean }) {
  const colors = MUGS.find(m => m.id === mug)!;
  return <svg viewBox="0 0 144 132" className="block w-full" aria-hidden="true" data-mug={mug}>
    <ellipse cx="69" cy="118" rx="49" ry="7" fill={colors.edge} opacity=".15" />
    <ellipse cx="68" cy="113" rx="46" ry="7" fill={colors.body} stroke={colors.edge} strokeWidth="1.4" />
    <g className={`tea-steam transition-opacity duration-1000 ${steaming ? 'opacity-60' : 'opacity-0'}`} fill="none" stroke={colors.edge} strokeWidth="2.5" strokeLinecap="round">
      {[49, 68, 87].map((x, i) => <path key={x} d={`M${x} 39c-10-9 10-14 0-25`} className={steaming ? 'motion-safe:animate-[tea-steam_3s_ease-in-out_infinite]' : ''} style={{ animationDelay: `${i * -.8}s` }} />)}
    </g>
    <path d="M104 57h8c24 0 23 35-1 35h-8v-10h7c12 0 13-15 1-15h-7" fill={colors.body} stroke={colors.edge} strokeWidth="2.5" />
    <path d={mug === 'sage' ? 'M30 52h76l-7 42q-3 16-31 16T37 94Z' : 'M30 52h76v38q0 23-38 23T30 90Z'} fill={colors.body} stroke={colors.edge} strokeWidth="2" />
    {mug === 'blue' && <g stroke={colors.detail} strokeWidth="7" opacity=".85"><path d="M42 60v43M59 61v47M77 61v47M94 60v43" /></g>}
    {mug === 'cream' && <g fill={colors.detail} opacity=".65">{[[42,73],[57,92],[87,76],[72,101],[93,96],[37,89],[65,69],[78,86]].map(([cx,cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.3" />)}</g>}
    {mug === 'sage' && <path d="M63 96V74m0 12c-12 0-15-10-15-10 12 0 15 10 15 10Zm0-6c12 0 16-11 16-11-12 0-16 11-16 11Z" fill={colors.detail} stroke={colors.edge} strokeWidth="1.3" />}
    {mug === 'cat' && <g fill="none" stroke={colors.detail} strokeWidth="2" strokeLinecap="round"><path d="m42 63 2-12 12 9m24 0 12-9 2 12M46 79q5 6 10 0m24 0q5 6 10 0M65 85l3 3 3-3m-3 3q-5 7-9 2m9-2q5 7 9 2M42 88l-7-1m9 6-7 2m55-7 7-1m-9 6 7 2" /></g>}
    <ellipse cx="68" cy="52" rx="38" ry="9" fill={colors.body} stroke={colors.edge} strokeWidth="2" />
    <ellipse cx="68" cy="53" rx="32" ry="5" fill="#8b6346" />
    <path d="M44 52q21-5 43 0" fill="none" stroke="#c9a879" strokeWidth="1.5" opacity=".7" />
  </svg>;
}

const choice = 'min-h-11 rounded-xl border border-[var(--hair)] bg-[var(--fill)] px-3 py-2 text-[var(--ink)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]';

export function TeaBreak({ inside }: { inside: boolean }) {
  const [tea, setTea] = useState(loadTea);
  const [now, setNow] = useState(Date.now);
  const [open, setOpen] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [clink, setClink] = useState(clinkOn);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const down = useRef<{ x: number; y: number } | null>(null);
  const remaining = remainingTea(tea.endsAt, now);
  const running = remaining !== null && remaining > 0;
  const finished = remaining === 0;
  const previous = useRef(remaining);
  const status = finished ? "Whenever you're ready." : running ? 'Enjoy your tea.' : 'A little time for yourself.';

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
    if (open) dialog.current?.showModal();
    return () => { dialog.current?.close(); };
  }, [open]);
  const close = () => { dialog.current?.close(); setOpen(false); trigger.current?.focus(); };

  return <>
    <button ref={trigger} type="button" className="tea-widget pointer-events-auto flex w-[132px] flex-col items-center border-0 bg-transparent p-0 text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
      aria-label="Tea break" aria-haspopup="dialog" aria-expanded={open} disabled={inside}
      onPointerDown={e => { down.current = { x: e.clientX, y: e.clientY }; }}
      onClick={e => {
        if (inside) return;
        const start = down.current; down.current = null;
        if (e.detail === 0 || !start || Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) { setNow(Date.now()); setOpen(true); }
      }}>
      <TeaMug mug={tea.mug} steaming={running} />
      <span className="-mt-1 rounded-xl bg-[var(--win)] px-3 py-1.5 text-center text-xs shadow-sm">
        <span className="block font-medium">Tea break{running ? ` · ${teaTime(remaining)}` : ''}</span>
        {finished && <span className="mt-1 block text-[var(--ink-2)]">Whenever you're ready.</span>}
      </span>
    </button>
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
        <fieldset className="mt-5"><legend className="text-sm">Choose your mug</legend>
          <div className="grid grid-cols-4 gap-2">{MUGS.map(mug => <button type="button" key={mug.id} className={`${choice} px-1! py-1!`} aria-label={mug.label} aria-pressed={tea.mug === mug.id} title={mug.label} onClick={() => save({ mug: mug.id })}><TeaMug mug={mug.id} /></button>)}</div>
          <p className="mb-0 mt-2 text-center text-xs text-[var(--ink-2)]">{MUGS.find(m => m.id === tea.mug)!.label}</p>
        </fieldset>
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
