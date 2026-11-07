import { type Player } from './player';

const spin = 'room-player-spin motion-safe:animate-[player-spin_8s_linear_infinite]';

/** Small moving parts sit over the generated artwork; the case and tonearm stay still. */
export function PlayerMotion({ player, playing, moving }: { player: Player; playing: boolean; moving: boolean }) {
  const motion = { animationPlayState: moving ? 'running' : 'paused', transformBox: 'fill-box', transformOrigin: 'center' } as const;
  return <svg viewBox="0 0 1536 1024" className="absolute inset-0 h-full w-full" aria-hidden="true">
    {(player === 'cassette' || player === 'boombox') && (player === 'cassette' ? [[682, 614], [828, 614]] : [[679, 600], [826, 600]]).map(([x, y]) =>
      <g key={x} transform={`translate(${x} ${y})`}><g className={spin} style={motion}>
        <circle r="18" fill="#493c35" />
        <path d="M0-15v7M13-7l-6 3M13 7l-6-3M0 15V8M-13 7l6-3M-13-7l6 3" fill="none" stroke="#ad9680" strokeWidth="4" strokeLinecap="round" />
      </g></g>)}
    {player === 'turntable' && <g transform="translate(664 500) scale(1 .4)">
      <g className={spin} style={{ ...motion, transformBox: 'view-box', transformOrigin: '0px 0px', animationDuration: '5s' }}>
        <circle r="95" fill="none" stroke="#edb29c" strokeWidth="2" opacity=".35" />
        <path d="M-75-20a78 78 0 0 1 32-48M45 57a73 73 0 0 1-23 12" fill="none" stroke="#f5c4a8" strokeWidth="6" strokeLinecap="round" opacity=".65" />
      </g>
    </g>}
    <g className={`room-player-light transition-opacity duration-700 motion-reduce:transition-none ${playing ? 'opacity-100' : 'opacity-0'}`}>
      {player === 'radio' ? <rect x="766" y="442" width="350" height="108" rx="40" fill="#ffca70" className="room-player-tuning motion-safe:animate-[player-tuning_4s_ease-in-out_infinite]" style={{ opacity: .18, animationPlayState: moving ? 'running' : 'paused' }} />
        : <circle cx={player === 'turntable' ? 1098 : player === 'boombox' ? 760 : 1135} cy={player === 'turntable' ? 741 : player === 'boombox' ? 390 : 510} r="7" fill="#ffd5a0" style={{ filter: 'drop-shadow(0 0 8px #ffbd75)' }} />}
    </g>
  </svg>;
}
