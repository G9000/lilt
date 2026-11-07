import { useEffect, useState } from 'react';
import { useMusic } from '../desk/musicState';
import { useRadio } from '../desk/lofi';
import { LIGHTS, W, H } from './scene';
import { playerImage } from './player';
import { usePlayer } from './playerState';
import { PlayerMotion } from './PlayerMotion';
import { ChairForeground } from './ChairForeground';
import { PLAYER_PLACEMENT } from './playerPlacement';

export function RoomPlayer({ inside }: { inside: boolean }) {
  const { shown } = usePlayer();
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
  const { shadow, angle, ...placement } = PLAYER_PLACEMENT[shown];
  return <>
    <div className="room-player-clear absolute pointer-events-none" style={{ left: 636, top: 420, width: 180, height: 108,
      maskImage: 'linear-gradient(to right, transparent, black 6px, black calc(100% - 6px), transparent), linear-gradient(to bottom, transparent, black 6px, black calc(100% - 6px), transparent)', maskComposite: 'intersect' }}>
      {LIGHTS.map(light => <img key={light} src={`room/players/clear-${light}.png`} alt="" draggable={false}
        className="absolute max-w-none select-none transition-opacity duration-[2000ms] ease-[ease] motion-reduce:transition-none"
        style={{ left: -636, top: -420, width: W, height: H, opacity: `var(--room-${light}-opacity, ${light === 'day' ? 1 : 0})` }} />)}
    </div>
    <div className="room-player-shadow absolute pointer-events-none" aria-hidden="true"
      style={{ ...shadow, height: 8, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(47, 29, 23, .34), transparent 70%)', transform: `rotate(${angle}deg)` }} />
    <div className="room-player-art absolute pointer-events-none select-none transition-[filter] duration-[2000ms] ease-[ease] motion-reduce:transition-none"
      data-player={shown} data-playing={playing} data-moving={moving} aria-hidden="true"
      style={{ ...placement, transform: `rotate(${angle}deg)`,
        filter: 'brightness(var(--plant-brightness, 1)) saturate(var(--plant-saturation, 1)) sepia(var(--plant-sepia, 0))' }}>
      <img src={playerImage(shown)} alt="" draggable={false} className="block h-full w-full max-w-none" />
      <PlayerMotion player={shown} playing={playing} moving={moving} />
    </div>
    <ChairForeground />
  </>;
}
