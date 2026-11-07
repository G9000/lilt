import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { roomStyles } from '../desk/roomStyles';
import { W, H } from './scene';
import { FINISHES, HARDWARE, finishName, hardwareBox, hardwareImage, hardwareMask, hardwareTitle, openHardware, type Finish, type Hardware } from './hardware';
import { useHardware } from './useHardware';
import { HARDWARE_OUTLINES } from './hardwareOutlinePaths';
import './hardware.css';

function HardwareSprite({ kind, finish }: { kind: Hardware; finish: Finish }) {
  const id = useId();
  return <svg className="pointer-events-none block h-full w-full overflow-hidden" viewBox={hardwareBox[kind].join(' ')} aria-hidden="true">
    <defs><mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H} style={{ maskType: 'alpha' }}><image href={hardwareMask(kind)} width={W} height={H} /></mask></defs>
    <image href={hardwareImage(kind, finish)} width={W} height={H} mask={`url(#${id})`} />
  </svg>;
}

function HardwareOutline({ kind }: { kind: Hardware }) {
  const id = useId(), [, , width, height] = hardwareBox[kind];
  return <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className={`room-object-outline room-${kind}-outline pointer-events-none absolute inset-0 h-full w-full overflow-visible`}>
    <defs><filter id={id} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" /></filter></defs>
    <path d={HARDWARE_OUTLINES[kind]} fill="none" stroke="#a8dfff" strokeWidth="8" opacity=".6" filter={`url(#${id})`} />
    <path d={HARDWARE_OUTLINES[kind]} fill="none" stroke="#c9edff" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>;
}

function HardwareObject({ kind, inside, onEnter }: { kind: Hardware; inside: boolean; onEnter: () => void }) {
  const { selected, shown, failed, unsaved, choose, retry } = useHardware(kind);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), target = useRef<HTMLButtonElement>(null), opener = useRef<HTMLElement | null>(null);
  const title = useId();
  const [left, top, width, height] = hardwareBox[kind];
  const close = () => {
    dialog.current?.close(); setOpen(false);
    const original = opener.current;
    const fallback = document.querySelector<HTMLElement>('.room-appearance-trigger');
    (original?.isConnected && original.getClientRects().length ? original : fallback ?? target.current)?.focus();
  };
  useEffect(() => {
    const show = (event: Event) => { if (!inside && (event as CustomEvent).detail === kind) { opener.current = document.activeElement as HTMLElement; setOpen(true); } };
    window.addEventListener('lilt:hardware', show);
    return () => window.removeEventListener('lilt:hardware', show);
  }, [kind, inside]);
  useEffect(() => { if (inside) setOpen(false); }, [inside]);
  useEffect(() => { if (open && !inside) dialog.current?.showModal(); else dialog.current?.close(); }, [open, inside]);
  return <>
    {shown && <div className={`room-hardware-art room-${kind}-art pointer-events-none absolute`} data-design={shown} style={{ left, top, width, height }}>
      {shown !== 'black' && <div className="room-hardware-finish h-full w-full"><HardwareSprite kind={kind} finish={shown} /></div>}
      <HardwareOutline kind={kind} />
    </div>}
    <button ref={target} type="button" disabled={inside} tabIndex={inside ? -1 : 0} aria-label={`Choose ${hardwareTitle[kind].toLowerCase()}`} aria-haspopup="dialog" aria-expanded={open} data-outlined={!!shown}
      className={`room-hardware-target room-${kind}-target ${kind === 'microphone' ? 'room-microphone' : ''} pointer-events-auto ${roomStyles['room-object']}`}
      style={{ left, top, width, height, transform: 'none', clipPath: `path(evenodd, '${HARDWARE_OUTLINES[kind]}')` }} onClick={() => openHardware(kind)} onPointerDown={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()}>
      <span>{hardwareTitle[kind]}</span>
    </button>
    {open && !inside && createPortal(<dialog ref={dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => { if (event.target === event.currentTarget) close(); }} onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}
      className="m-auto max-h-[calc(100dvh-32px)] w-[360px] max-w-[calc(100vw-24px)] overflow-auto rounded-[22px] border border-[var(--hair)] bg-[var(--win)] p-0 text-[var(--ink)] shadow-2xl backdrop:bg-black/20 backdrop:backdrop-blur-sm">
      <div className="p-5">
        <div className="flex items-center justify-between gap-3"><h2 id={title} className="m-0 text-xl font-semibold">{hardwareTitle[kind]}</h2>
          <button type="button" onClick={close} aria-label="Close hardware picker" className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--fill)]"><svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button></div>
        <p className="mb-4 mt-2 text-sm text-[var(--ink-2)]">{kind === 'microphone' ? 'A finish for your recording corner.' : 'A little colour around your screen.'}</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Finishes">{FINISHES.map(finish => <button key={finish} type="button" aria-pressed={selected === finish} onClick={() => choose(finish)}
          className="flex min-h-11 flex-col! items-center rounded-xl border border-[var(--hair)] bg-[var(--fill)] px-3 py-3 text-[var(--ink)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
          <div className="h-24 w-full"><HardwareSprite kind={kind} finish={finish} /></div><span className="mt-2 text-xs font-medium">{finishName[finish]}</span>
        </button>)}</div>
        {failed ? <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Couldn't load this finish. Your previous artwork is still here. <button type="button" onClick={retry} className="underline">Try again</button></p>
          : shown !== selected && <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Getting your finish ready…</p>}
        {unsaved && <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Your choice changed here, but this browser couldn't save it for next time.</p>}
        {kind === 'microphone' && <button type="button" onClick={() => { close(); onEnter(); }} className="mt-4 min-h-11 w-full rounded-xl bg-[var(--fill)] px-4 py-2 text-sm font-medium">Open Practice</button>}
        <button type="button" onClick={close} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--page)]">Done</button>
      </div>
    </dialog>, document.body)}
  </>;
}

export function RoomHardware(props: { inside: boolean; onEnter: () => void }) {
  return <>{HARDWARE.map(kind => <HardwareObject key={kind} kind={kind} {...props} />)}</>;
}
