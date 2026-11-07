import { useRoomArtReady } from './roomReadiness';
import { useEffect, useId, useState } from 'react';
import { useMusic } from '../desk/musicState';
import { useRadio } from '../desk/lofi';
import { LIGHTS, W, H } from './scene';
import { playerImage } from './player';
import { usePlayer } from './playerState';
import { PlayerMotion } from './PlayerMotion';
import { PLAYER_PLACEMENT } from './playerPlacement';
import { ObjectOutline } from './ObjectOutline';

export function PlayerBackdrop() {
  const { shown } = usePlayer();
  if (!shown) return null;
  return <div className="room-player-clear absolute pointer-events-none" style={{ left: 636, top: 420, width: 180, height: 108,
    maskImage: 'linear-gradient(to right, transparent, black 6px, black calc(100% - 6px), transparent), linear-gradient(to bottom, transparent, black 6px, black calc(100% - 6px), transparent)', maskComposite: 'intersect' }}>
    {LIGHTS.map(light => <img key={light} src={`room/players/clear-${light}.png`} alt="" draggable={false}
      className="absolute max-w-none select-none transition-opacity duration-[2000ms] ease-[ease] motion-reduce:transition-none"
      style={{ left: -636, top: -420, width: W, height: H, opacity: `var(--room-${light}-opacity, ${light === 'day' ? 1 : 0})` }} />)}
  </div>;
}

export function RoomPlayer({ inside }: { inside: boolean }) {
  const shadowId = useId();
  const { shown, ready } = usePlayer();
  useRoomArtReady('player', ready);
  const music = useMusic(), radio = useRadio();
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  const playback = music.source === 'spotify' ? music.spotify : radio;
  const playing = playback.playing && !playback.ducked;
  const moving = playing && !inside && !hidden;
  if (!shown) return null;
  const { contact, angle, ...placement } = PLAYER_PLACEMENT[shown];
  return <div className="room-player-art absolute pointer-events-none select-none transition-[filter] duration-[2000ms] ease-[ease] motion-reduce:transition-none"
      data-player={shown} data-playing={playing} data-moving={moving} aria-hidden="true"
      style={{ ...placement, transform: `rotate(${angle}deg)`,
        filter: 'brightness(var(--plant-brightness, 1)) saturate(var(--plant-saturation, 1)) sepia(var(--plant-sepia, 0))' }}>
      <svg viewBox="0 0 1536 1024" className="room-player-shadow absolute inset-0 h-full w-full" aria-hidden="true">
        <defs><radialGradient id={shadowId}>
          <stop stopColor="#2f1d17" stopOpacity=".65" />
          <stop offset=".55" stopColor="#2f1d17" stopOpacity=".3" />
          <stop offset="1" stopColor="#2f1d17" stopOpacity="0" />
        </radialGradient></defs>
        <ellipse cx={(contact.feet[0] + contact.feet[1]) / 2} cy={contact.baseline - 16} rx="490" ry="58" fill={`url(#${shadowId})`} />
        {contact.feet.map(x => <ellipse key={x} cx={x} cy={contact.baseline} rx="76" ry="22" fill={`url(#${shadowId})`} />)}
      </svg>
      <img src={playerImage(shown)} alt="" draggable={false} className="relative block h-full w-full max-w-none" />
      <PlayerMotion player={shown} playing={playing} moving={moving} />
      <ObjectOutline kind="player"><img src={playerImage(shown)} alt="" draggable={false} className="block h-full w-full max-w-none" /></ObjectOutline>
    </div>;
}
