import { H, LIGHTS, roomUrl, W } from './scene';

export const CHAIR_MASK = 'room/chair/foreground.png';

/** The cutout supplies only the silhouette; the original painting supplies every chair pixel. */
export function ChairForeground() {
  return <div className="room-chair-foreground absolute inset-0 pointer-events-none select-none" aria-hidden="true"
    style={{ width: W, height: H, maskImage: `url(${CHAIR_MASK})`, maskSize: '100% 100%', maskRepeat: 'no-repeat' }}>
    {LIGHTS.map(light => <img key={light} src={roomUrl(light)} alt="" draggable={false}
      className="absolute inset-0 max-w-none transition-opacity duration-[2000ms] ease-[ease] motion-reduce:transition-none"
      style={{ width: W, height: H, opacity: `var(--room-${light}-opacity, ${light === 'day' ? 1 : 0})` }} />)}
  </div>;
}
