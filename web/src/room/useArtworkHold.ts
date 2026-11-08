import { useEffect, useRef, type MouseEvent, type PointerEvent, type KeyboardEvent } from 'react';

/** The cat's gesture, shared by painted objects with a separate everyday action. */
export function useArtworkHold({ onHold, onClick, disabled = false }: {
  onHold: () => void;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
}) {
  const callbacks = useRef({ onHold, onClick, disabled });
  callbacks.current = { onHold, onClick, disabled };
  const press = useRef<{ id: number; x: number; y: number; timer: number } | null>(null);
  const suppress = useRef(false);
  const stop = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };
  const cancel = () => { if (press.current) suppress.current = true; stop(); };
  useEffect(() => { if (disabled) cancel(); }, [disabled]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) cancel(); };
    const fresh = () => { suppress.current = false; };
    const releaseClick = (event: globalThis.MouseEvent) => {
      // showModal moves focus and can retarget the held pointer's release to a choice.
      if (suppress.current && event.detail > 0) {
        suppress.current = false; event.preventDefault(); event.stopImmediatePropagation();
      }
    };
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', hidden);
    document.addEventListener('pointerdown', fresh, true);
    document.addEventListener('click', releaseClick, true);
    return () => {
      stop();
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', hidden);
      document.removeEventListener('pointerdown', fresh, true);
      document.removeEventListener('click', releaseClick, true);
    };
  }, []);
  return {
    onClick(event: MouseEvent<HTMLElement>) {
      event.stopPropagation();
      if (callbacks.current.disabled || (suppress.current && event.detail > 0)) { event.preventDefault(); return; }
      if (callbacks.current.onClick) callbacks.current.onClick(event);
      else { event.preventDefault(); if (event.detail === 0) callbacks.current.onHold(); }
    },
    onPointerDown(event: PointerEvent<HTMLElement>) {
      event.stopPropagation();
      if (callbacks.current.disabled || !event.isPrimary || event.button !== 0) return;
      cancel(); suppress.current = false;
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, timer: window.setTimeout(() => {
        if (callbacks.current.disabled) return;
        suppress.current = true;
        callbacks.current.onHold();
      }, 650) };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      event.stopPropagation();
      const held = press.current;
      if (held?.id === event.pointerId && Math.hypot(event.clientX - held.x, event.clientY - held.y) > 10) cancel();
    },
    onPointerUp(event: PointerEvent<HTMLElement>) { if (press.current?.id === event.pointerId) stop(); },
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
    onBlur: cancel,
    onKeyDown(event: KeyboardEvent<HTMLElement>) { if (event.key === 'Escape') cancel(); },
    onContextMenu(event: MouseEvent<HTMLElement>) { event.preventDefault(); },
  };
}
