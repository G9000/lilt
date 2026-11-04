import { useEffect, useRef, useState } from 'react';
import { createCorner, type Action, type Corner, type CornerState, type CornerStyle } from './scene';
import './corner.css';

const FAN = ['off', 'low', 'high'] as const;

export default function PaintedCorner({ style = 'painted' }: { style?: CornerStyle }) {
  const canvas = useRef<HTMLCanvasElement>(null), corner = useRef<Corner | null>(null);
  const [state, setState] = useState<CornerState>(() => ({ lamp: false, fan: 0, paused: window.matchMedia('(prefers-reduced-motion: reduce)').matches }));
  const current = useRef(state); current.current = state;
  const [ready, setReady] = useState(false), [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  const [hover, setHover] = useState<Action | null>(null);
  const act = (action: Action) => setState(s => action === 'lamp' ? { ...s, lamp: !s.lamp } : { ...s, fan: ((s.fan + 1) % 3) as CornerState['fan'] });
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setState(s => ({ ...s, paused: mq.matches }));
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    let mounted = true;
    setReady(false); setError(false);
    try {
      corner.current = createCorner(canvas.current!, current.current, {
        action: act, hover: setHover,
        ready: () => { if (mounted) setReady(true); },
        error: () => { if (mounted) { setError(true); setReady(false); } },
      }, style);
    } catch { setError(true); }
    return () => { mounted = false; corner.current?.dispose(); corner.current = null; };
  }, [attempt, style]);
  useEffect(() => { if (!error) corner.current?.set(state); }, [state, error]);
  return <main className="pc" data-style={style} data-ready={ready && !error}>
    <canvas key={`${style}-${attempt}`} ref={canvas} className="pc-canvas" tabIndex={0} role="img"
      aria-label="Painted room. Drag to look around; arrow keys to turn, plus and minus to zoom."
      onKeyDown={e => {
        if (error || e.altKey || e.ctrlKey || e.metaKey) return;
        const moves: Record<string, [number, number?, number?]> = { ArrowLeft: [-0.07], ArrowRight: [0.07], ArrowUp: [0, -0.05], ArrowDown: [0, 0.05], '+': [0, 0, 0.9], '=': [0, 0, 0.9], '-': [0, 0, 1.1] };
        if (moves[e.key]) { e.preventDefault(); corner.current?.move(...moves[e.key]); }
        if (e.key === 'Home') { e.preventDefault(); corner.current?.reset(); }
      }} />
    <header className="pc-header">
      <a href="#/" className="pc-back"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m11 5-5 5 5 5M6 10h10" /></svg>Back to Lilt</a>
      <div className="pc-title"><h1>A quiet corner</h1><p>{style === 'sketch' ? 'Ink, paper & afternoon light.' : 'A little room to try.'}</p></div>
      <nav className="pc-styles" aria-label="Room art style">
        <a href="#/painted-corner" aria-current={style === 'painted' ? 'page' : undefined}>Summer paint</a>
        <a href="#/sketched-corner" aria-current={style === 'sketch' ? 'page' : undefined}>Warm sketch</a>
      </nav>
    </header>
    {!ready && !error && <div className="pc-message" role="status"><p>Opening the window…</p></div>}
    {error && <div className="pc-message" role="alert"><h2>The room needs a fresh start.</h2><p>Try again, or return to Lilt. If it keeps happening, check that your browser’s graphics acceleration is on.</p><button onClick={() => setAttempt(a => a + 1)}>Try again</button><a href="#/">Back to Lilt</a></div>}
    <div className="pc-bottom">
      <p className="pc-hint">{hover === 'lamp' ? 'Touch the lamp to change the light.' : hover === 'fan' ? 'Touch the fan to change its speed.' : 'Drag to look around. Scroll or pinch to move closer.'}</p>
      <div className="pc-controls" aria-label="Room controls">
        <button disabled={!ready || error} aria-label="Lamp" aria-pressed={state.lamp} onClick={() => act('lamp')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m9 3-4 9h14l-4-9ZM12 12v8m-5 1h10" /></svg><span>Lamp <small>{state.lamp ? 'on' : 'off'}</small></span></button>
        <button disabled={!ready || error} aria-label={`Fan: ${FAN[state.fan]}`} onClick={() => act('fan')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="12" cy="10" r="7" /><circle cx="12" cy="10" r="1.3" /><path d="M12 8V4m2 7 4 2m-8-2-4 2m6 4v4m-4 0h8" /></svg><span>Fan <small>{FAN[state.fan]}</small></span></button>
        <span className="pc-divider" />
        <button disabled={!ready || error} onClick={() => corner.current?.reset()}>Reset view</button>
        <button disabled={!ready || error} aria-pressed={state.paused} onClick={() => setState(s => ({ ...s, paused: !s.paused }))}>{state.paused ? 'Resume motion' : 'Pause motion'}</button>
      </div>
      <p className="pc-status" role="status" aria-live="polite">Lamp {state.lamp ? 'on' : 'off'} · Fan {FAN[state.fan]}{state.paused ? ' · Motion paused' : ''}</p>
    </div>
  </main>;
}
