import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { roomStyles } from '../desk/roomStyles';
import { COFFEE_URL, LIGHTS, W, H } from './scene';
import { PROP_BOUNDS } from './propBounds';
import { PROP_CHOICES, PROP_REPAIR, propImage, propPlacement, type PropKind, type PropDesign } from './roomPropOptions';
import { type RoomPropState } from './useRoomProp';
import { ObjectOutline } from './ObjectOutline';
import { useArtworkHold } from './useArtworkHold';

export const openRoomProp = (kind: PropKind) => window.dispatchEvent(new Event(`lilt:${kind}`));

function PropSprite({ design }: { design: PropDesign }) {
  const { width, height, box } = PROP_BOUNDS[design];
  return <svg viewBox={box.join(' ')} aria-hidden="true" className="block h-full w-full overflow-visible">
    <image href={propImage(design)} width={width} height={height} />
  </svg>;
}

/** Repairs go below the monitor media, so a straw removal cannot overwrite an uploaded picture. */
export function RoomPropBackdrop({ kind, shown }: { kind: PropKind; shown: PropDesign | null }) {
  if (!shown) return null;
  const box = PROP_REPAIR[kind];
  return <div className={`room-${kind}-clear pointer-events-none absolute`} style={{ ...box,
    maskImage: 'linear-gradient(to right, transparent, black 5px, black calc(100% - 5px), transparent), linear-gradient(to bottom, transparent, black 5px, black calc(100% - 5px), transparent)', maskComposite: 'intersect' }}>
    {LIGHTS.map(light => <img key={light} src={`room/props/clear-${light}.png`} alt="" draggable={false}
      className="absolute max-w-none select-none transition-opacity duration-[2000ms] ease-[ease] motion-reduce:transition-none"
      style={{ left: -box.left, top: -box.top, width: W, height: H, opacity: `var(--room-${light}-opacity, ${light === 'day' ? 1 : 0})` }} />)}
  </div>;
}

export function RoomProp({ kind, state, inside, onCoffee }: { kind: PropKind; state: RoomPropState; inside: boolean; onCoffee?: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  const { selected, shown, failed, unsaved, choose, retry } = state;
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), target = useRef<HTMLAnchorElement>(null), opener = useRef<HTMLElement | null>(null);
  const titleId = useId(), shadowId = useId();
  const title = kind === 'coffee' ? 'Choose your drink' : 'Choose your camera';
  const hold = useArtworkHold({ onHold: () => openRoomProp(kind), disabled: inside || open,
    onClick: event => { if (kind === 'coffee') onCoffee?.(event as MouseEvent<HTMLAnchorElement>); } });
  const close = () => {
    dialog.current?.close(); setOpen(false);
    const visible = (element: HTMLElement | null): element is HTMLElement => !!element?.isConnected && !!element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
    const shortcut = document.querySelector<HTMLElement>(`.room-${kind}-shortcut`);
    (visible(opener.current) ? opener.current : visible(shortcut) ? shortcut : target.current)?.focus();
  };
  useEffect(() => {
    const show = () => { if (!inside) { opener.current = document.activeElement as HTMLElement; setOpen(true); } };
    window.addEventListener(`lilt:${kind}`, show);
    return () => window.removeEventListener(`lilt:${kind}`, show);
  }, [kind, inside]);
  useEffect(() => { if (inside) setOpen(false); }, [inside]);
  useEffect(() => { if (open && !inside) dialog.current?.showModal(); else dialog.current?.close(); }, [open, inside]);
  const placement = propPlacement(kind, shown ?? selected);
  const repair = PROP_REPAIR[kind];
  return <>
    {shown && <div className={`room-${kind}-art pointer-events-none absolute select-none transition-[filter] duration-[2000ms] ease-[ease] motion-reduce:transition-none`}
      data-design={shown} style={{ ...placement, filter: 'brightness(var(--plant-brightness, 1)) saturate(var(--plant-saturation, 1)) sepia(var(--plant-sepia, 0))' }}>
      <svg className="room-prop-shadow absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${placement.width} ${placement.height}`} aria-hidden="true">
        <defs><radialGradient id={shadowId}><stop stopColor="#33231b" stopOpacity=".5" /><stop offset="1" stopColor="#33231b" stopOpacity="0" /></radialGradient></defs>
        <ellipse cx={placement.width / 2} cy={placement.height - .5} rx={placement.width * .52} ry={kind === 'coffee' ? 3 : 4} fill={`url(#${shadowId})`} />
      </svg>
      <div className="relative h-full w-full"><PropSprite design={shown} /></div>
      <ObjectOutline kind={kind}><PropSprite design={shown} /></ObjectOutline>
    </div>}
    <a ref={target} href={kind === 'coffee' ? COFFEE_URL : '#/photos'} target={kind === 'coffee' ? '_blank' : undefined} rel={kind === 'coffee' ? 'noopener noreferrer' : undefined}
      aria-disabled={inside} tabIndex={inside ? -1 : 0} aria-label={kind === 'coffee' ? 'Buy me a coffee' : 'Open Photos'} aria-haspopup="dialog" aria-expanded={open} data-outlined={!!shown}
      className={`room-${kind}-target pointer-events-auto ${roomStyles['room-object']}`}
      style={{ left: repair.left + repair.width / 2, top: repair.top + repair.height / 2, width: repair.width, height: repair.height }}
      {...hold} data-room-tip={kind === 'coffee' ? 'Click for Buy me a coffee · Hold to change drink' : 'Click for Photos · Hold to change camera'}
      data-room-keyboard-tip={kind === 'coffee' ? 'Enter for Buy me a coffee (opens a new tab)' : 'Enter for Photos'} />
    {open && !inside && createPortal(<dialog ref={dialog} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); close(); }}
      onClick={e => { if (e.target === e.currentTarget) close(); }} onPointerDown={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}
      className="m-auto max-h-[calc(100dvh-32px)] w-[360px] max-w-[calc(100vw-24px)] overflow-auto rounded-[22px] border border-[var(--hair)] bg-[var(--win)] p-0 text-[var(--ink)] shadow-2xl backdrop:bg-black/20 backdrop:backdrop-blur-sm">
      <div className="p-5">
        <div className="flex items-center justify-between gap-3"><h2 id={titleId} className="m-0 text-xl font-semibold">{title}</h2>
          <button type="button" onClick={close} aria-label={`Close ${kind} picker`} className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--fill)]"><svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button></div>
        <p className="mb-4 mt-2 text-sm text-[var(--ink-2)]">{kind === 'coffee' ? 'Something nice beside your desk.' : 'A little way to keep your moments.'}</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label={kind === 'coffee' ? 'Drinks' : 'Cameras'}>{PROP_CHOICES[kind].map(choice => <button key={choice.id} type="button" aria-pressed={selected === choice.id} onClick={() => choose(choice.id)}
          className="flex min-h-11 flex-col! items-center rounded-xl border border-[var(--hair)] bg-[var(--fill)] px-3 py-3 text-[var(--ink)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
          <div className="h-24 w-full"><PropSprite design={choice.id} /></div><span className="mt-2 text-xs font-medium">{choice.name}</span>
        </button>)}</div>
        {failed ? <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Couldn't load this {kind === 'coffee' ? 'drink' : 'camera'}. Your previous one is still here. <button type="button" onClick={retry} className="underline">Try again</button></p>
          : shown !== selected && <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Getting your {kind === 'coffee' ? 'drink' : 'camera'} ready…</p>}
        {unsaved && <p role="status" className="mb-0 mt-3 text-sm text-[var(--ink-2)]">Your choice changed here, but this browser couldn't save it for next time.</p>}
        {kind === 'camera'
          ? <a href="#/photos" onClick={close} className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-[var(--fill)] px-4 py-2 text-sm font-medium text-[var(--ink)]">Open Photos</a>
          : <a href={COFFEE_URL} target="_blank" rel="noopener noreferrer" onClick={event => { onCoffee?.(event); close(); }} className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-[var(--fill)] px-4 py-2 text-sm font-medium text-[var(--ink)]">Buy me a coffee</a>}
        <button type="button" onClick={close} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--page)]">Done</button>
      </div>
    </dialog>, document.body)}
  </>;
}
