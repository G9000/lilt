import { useId, type ReactNode } from 'react';
import './objectOutline.css';

/** Trace the rendered cutout, so growth and replacement artwork keep their own contour. */
export function ObjectOutline({ kind, children }: { kind: 'mug' | 'plant' | 'player' | 'coffee' | 'camera' | 'cat'; children: ReactNode }) {
  const id = useId();
  return <div aria-hidden="true" className={`room-object-outline room-${kind}-outline pointer-events-none absolute inset-0`}>
    <svg width="0" height="0" className="absolute" aria-hidden="true"><defs>
      <filter id={id} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
        <feComponentTransfer in="SourceAlpha" result="shape"><feFuncA type="discrete" tableValues="0 1" /></feComponentTransfer>
        <feMorphology in="shape" operator="dilate" radius="1.7" result="expanded" />
        <feComposite in="expanded" in2="shape" operator="out" result="edge" />
        <feMorphology in="shape" operator="dilate" radius="4" result="wide" />
        <feComposite in="wide" in2="shape" operator="out" result="halo" />
        <feGaussianBlur in="halo" stdDeviation="4" result="blur" />
        <feFlood floodColor="#a8dfff" floodOpacity=".6" result="glowColor" />
        <feComposite in="glowColor" in2="blur" operator="in" result="glow" />
        <feFlood floodColor="#c9edff" result="edgeColor" />
        <feComposite in="edgeColor" in2="edge" operator="in" result="line" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="line" /></feMerge>
      </filter>
    </defs></svg>
    <div className="absolute inset-0" style={{ filter: `url(#${id})` }}>{children}</div>
  </div>;
}
