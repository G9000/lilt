import { useRoomArtReady } from './roomReadiness';
import { H, LIGHTS, roomUrl, W } from './scene';
import { BED_MASK, CHAIR_MASK, chairImage } from './chair';
import { useChair } from './chairState';

export { CHAIR_MASK } from './chair';

function MaskedPainting({ mask, clipPath, repair = false, className }: { mask?: string; clipPath?: string; repair?: boolean; className: string }) {
  return <div className={`${className} absolute inset-0 pointer-events-none select-none`} aria-hidden="true"
    style={{ width: W, height: H, clipPath, maskImage: mask ? `url(${mask})` : 'linear-gradient(to right, transparent 490px, black 530px, black 1050px, transparent 1120px)', maskSize: '100% 100%', maskRepeat: 'no-repeat' }}>
    {LIGHTS.map(light => <img key={light} src={repair ? `room/chair/clear-${light}.png` : roomUrl(light)} alt="" draggable={false}
      className="absolute inset-0 max-w-none transition-opacity duration-[2000ms] ease-[ease] motion-reduce:transition-none"
      style={{ width: W, height: H, opacity: `var(--room-${light}-opacity, ${light === 'day' ? 1 : 0})` }} />)}
  </div>;
}

export function ChairBackdrop() {
  const { shown } = useChair();
  if (shown === 'original') return null;
  return <div className="room-chair-clear" aria-hidden="true">
    <MaskedPainting mask={CHAIR_MASK} repair className="room-chair-silhouette-clear" />
    {/* Repair a continuous floor/wall area so the old chair's outline cannot remain as a seam. */}
    <MaskedPainting clipPath="polygon(490px 535px, 1120px 615px, 1120px 941px, 490px 941px)" repair className="room-chair-underdesk-clear" />
  </div>;
}

/** Chair and bed silhouettes preserve the room's depth independently of music loading. */
export function ChairForeground() {
  const { shown, ready } = useChair();
  useRoomArtReady('chair', ready);
  if (shown === 'original') return <MaskedPainting mask={CHAIR_MASK} className="room-chair-foreground" />;
  return <>
    <img className="room-chair-foreground room-chair-art absolute inset-0 pointer-events-none select-none max-w-none transition-[filter] duration-[2000ms] ease-[ease] motion-reduce:transition-none"
      data-chair={shown} src={chairImage(shown)} alt="" draggable={false} aria-hidden="true"
      style={{ width: W, height: H, filter: 'brightness(var(--plant-brightness, 1)) saturate(var(--plant-saturation, 1)) sepia(var(--plant-sepia, 0))' }} />
    <MaskedPainting mask={BED_MASK} className="room-chair-bed" />
  </>;
}
