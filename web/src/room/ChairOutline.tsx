import { useId } from 'react';
import { type Chair } from './chair';
import { CHAIR_OUTLINES } from './chairOutlinePaths';

export function ChairOutline({ chair, visible }: { chair: Chair; visible: boolean }) {
  const glowId = useId();
  return <svg viewBox="0 0 600 481" aria-hidden="true" data-chair={chair} data-visible={visible}
    className="room-chair-outline pointer-events-none absolute inset-0 h-full w-full overflow-visible transition-opacity duration-200 motion-reduce:transition-none"
    style={{ opacity: visible ? 1 : 0 }}>
    <defs><filter id={glowId} x="-20" y="-20" width="640" height="521" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="4" /></filter></defs>
    <path d={CHAIR_OUTLINES[chair]} fill="none" stroke="#a8dfff" strokeWidth="8" opacity=".6" filter={`url(#${glowId})`} />
    <path d={CHAIR_OUTLINES[chair]} fill="none" stroke="#c9edff" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>;
}
