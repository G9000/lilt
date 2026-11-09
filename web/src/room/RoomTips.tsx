import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

const SEEN_KEY = 'lilt.room.tips.dismissed';
let dismissedThisVisit = false;
export const showRoomTips = () => window.dispatchEvent(new Event('lilt:room-tips'));

function dismissed() {
  try { return dismissedThisVisit || localStorage.getItem(SEEN_KEY) === '1'; }
  catch { return dismissedThisVisit; }
}

type Tip = { target: HTMLElement; keyboard: boolean };

/** One label outside the painting, so clipped silhouettes never clip their explanation. */
function RoomTooltip({ stage }: { stage: RefObject<HTMLDivElement> }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [text, setText] = useState('');
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const surface = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    let hovered: HTMLElement | null = null, focused: HTMLElement | null = null;
    let blocked: HTMLElement | null = null, active: Tip | null = null;
    let timer = 0;
    const clear = () => window.clearTimeout(timer);
    const hide = () => { clear(); active = null; setTip(null); };
    const targetOf = (value: EventTarget | null) => {
      const target = value instanceof Element ? value.closest<HTMLElement>('[data-room-tip]') : null;
      return target && stage.current?.contains(target) ? target : null;
    };
    const show = (target: HTMLElement, keyboard: boolean) => {
      clear();
      if (target === blocked || target.matches(':disabled, [aria-disabled="true"], [aria-expanded="true"]')) return;
      const reveal = () => { active = { target, keyboard }; setTip(active); };
      if (keyboard) reveal(); else { active = null; setTip(null); timer = window.setTimeout(reveal, 300); }
    };
    const over = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      if (surface.current?.contains(event.target as Node)) { clear(); return; }
      const target = targetOf(event.target);
      if (target && target !== hovered) { hovered = target; show(target, false); }
    };
    const out = (event: PointerEvent) => {
      const next = targetOf(event.relatedTarget);
      if (next === hovered && next) return;
      if (blocked === targetOf(event.target)) blocked = null;
      hovered = null;
      clear();
      if (!surface.current?.contains(event.relatedTarget as Node)) {
        timer = window.setTimeout(() => { hide(); if (focused) show(focused, true); }, 160);
      }
    };
    const focus = (event: FocusEvent) => {
      const target = targetOf(event.target);
      if (target?.matches(':focus-visible')) { focused = target; show(target, true); }
      else { focused = null; hide(); }
    };
    const blur = () => { blocked = null; focused = null; hide(); };
    const press = () => { blocked = hovered ?? focused; hovered = null; focused = null; hide(); };
    const key = (event: KeyboardEvent) => {
      const target = active?.target ?? hovered ?? focused;
      if (event.key !== 'Escape' || !target || target === blocked) return;
      blocked = target; hide();
      // Let the target cancel a pending hold, while keeping this Escape from dismissing the hint too.
      event.preventDefault();
    };
    document.addEventListener('pointerover', over, true);
    document.addEventListener('pointerout', out, true);
    document.addEventListener('focusin', focus, true);
    document.addEventListener('focusout', blur, true);
    document.addEventListener('pointerdown', press, true);
    document.addEventListener('keydown', key, true);
    window.addEventListener('blur', press);
    window.addEventListener('resize', press);
    return () => {
      clear();
      document.removeEventListener('pointerover', over, true);
      document.removeEventListener('pointerout', out, true);
      document.removeEventListener('focusin', focus, true);
      document.removeEventListener('focusout', blur, true);
      document.removeEventListener('pointerdown', press, true);
      document.removeEventListener('keydown', key, true);
      window.removeEventListener('blur', press);
      window.removeEventListener('resize', press);
    };
  }, [stage]);

  useLayoutEffect(() => {
    if (!tip) return;
    const { target, keyboard } = tip;
    const update = () => setText((keyboard ? target.dataset.roomKeyboardTip : '') || target.dataset.roomTip || '');
    update();
    const previous = target.getAttribute('aria-describedby');
    target.setAttribute('aria-describedby', [previous, id].filter(Boolean).join(' '));
    const observer = new MutationObserver(update);
    observer.observe(target, { attributes: true, attributeFilter: ['data-room-tip', 'data-room-keyboard-tip'] });
    return () => {
      observer.disconnect();
      if (previous === null) target.removeAttribute('aria-describedby'); else target.setAttribute('aria-describedby', previous);
    };
  }, [tip, id]);

  useLayoutEffect(() => {
    if (!tip || !surface.current) return;
    const anchor = tip.target.getBoundingClientRect(), box = surface.current.getBoundingClientRect();
    const x = (Math.max(0, anchor.left) + Math.min(innerWidth, anchor.right)) / 2 - box.width / 2;
    const y = anchor.top - box.height - 8;
    setPosition({
      left: Math.max(12, Math.min(innerWidth - box.width - 12, x)),
      top: Math.max(12, Math.min(innerHeight - box.height - 12, y >= 12 ? y : anchor.bottom + 8)),
    });
  }, [tip, text]);

  return tip && createPortal(<div ref={surface} id={id} role="tooltip" style={position}
    className="room-tooltip fixed z-[30] w-max max-w-[min(340px,calc(100vw-24px))] rounded-xl border border-[var(--hair)] bg-[var(--panel)] px-3 py-2 text-center text-xs font-medium leading-relaxed text-[var(--ink)] shadow-lg">
    {text}
  </div>, document.body);
}

export function RoomTips({ ready, inside, stage }: { ready: boolean; inside: boolean; stage: RefObject<HTMLDivElement> }) {
  const [hidden, setHidden] = useState(dismissed);
  const [manual, setManual] = useState(false);
  const [replay, setReplay] = useState(0);
  const [settled, setSettled] = useState(false);
  const done = useRef<HTMLButtonElement>(null);
  const hint = useRef<HTMLElement>(null);
  const title = useId();
  const active = ready && !inside && settled;
  const visible = active && !hidden;
  const dismiss = () => {
    dismissedThisVisit = true;
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* Dismissal still lasts this visit. */ }
    setHidden(true);
    if (manual || hint.current?.contains(document.activeElement)) document.querySelector<HTMLElement>('.room-appearance-trigger')?.focus();
    setManual(false);
  };

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const update = () => setSettled(element.classList.contains('settled'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(element, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [stage]);
  useEffect(() => {
    const show = () => { setHidden(false); setManual(true); setReplay(value => value + 1); };
    const sync = (event: StorageEvent) => {
      if (event.key === SEEN_KEY && event.newValue === '1') {
        dismissedThisVisit = true; setHidden(true); setManual(false);
        if (hint.current?.contains(document.activeElement)) document.querySelector<HTMLElement>('.room-appearance-trigger')?.focus();
      }
    };
    window.addEventListener('lilt:room-tips', show);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('lilt:room-tips', show); window.removeEventListener('storage', sync); };
  }, []);
  useEffect(() => { if (inside) setManual(false); }, [inside]);
  useEffect(() => { if (visible && manual) done.current?.focus(); }, [visible, manual, replay]);
  useEffect(() => {
    if (!visible) return;
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open], .room-appearance')) return;
      dismiss();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [visible, manual]);

  return <>
    {active && <RoomTooltip stage={stage} />}
    {visible && <aside ref={hint} aria-labelledby={title}
      className="room-tips pointer-events-auto fixed bottom-6 right-6 z-[6] w-[320px] max-w-[calc(100vw-32px)] rounded-2xl border border-[var(--hair)] bg-[var(--panel)] p-4 text-[var(--ink)] shadow-lg max-sm:bottom-4 max-sm:right-4">
      <h2 id={title} className="m-0 text-sm font-semibold">This room is yours.</h2>
      <p className="mb-3 mt-1 text-sm leading-relaxed text-[var(--ink-2)]"><span className="[@media_(pointer:coarse)]:hidden">Click</span><span className="hidden [@media_(pointer:coarse)]:inline">Tap</span> things to use them; hold to change their look.</p>
      <p className="mb-3 mt-0 hidden text-xs leading-relaxed text-[var(--ink-2)] [@media_(max-width:767px),_(max-aspect-ratio:4/3)]:block">The room shortcuts keep things within reach.</p>
      <button ref={done} type="button" onClick={dismiss} className="min-h-11 rounded-lg bg-[var(--fill)] px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">Got it</button>
    </aside>}
  </>;
}
