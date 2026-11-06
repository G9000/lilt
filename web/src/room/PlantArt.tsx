import { useId } from 'react';
import { plantDays, type Plant } from './plant';

const SPROUT = [[61, 74, -1], [60, 64, 1], [60, 54, -1], [61, 45, 1], [61, 37, -1], [61, 31, 1], [61, 27, 0]];
const MONSTERA = [[46, 70, -35], [91, 68, 30], [38, 47, -40], [97, 43, 35], [55, 29, -20], [83, 23, 20], [70, 9, 0]];
const FERN = [[-65, 44], [65, 44], [-43, 59], [43, 59], [-23, 73], [23, 73], [0, 88]];
const SUCCULENT = [-75, 75, -50, 50, -25, 25, 0];

/** Each day fills one leaf or frond. Unfilled outlines are quiet buds, never missing-day marks. */
export function PlantArt({ plant, days }: { plant: Plant; days: number }) {
  const potId = useId();
  const growth = plantDays(days);
  const leaf = (i: number) => ({
    'data-grown': i < growth ? 'true' : 'false',
    className: i < growth ? 'leaf motion-safe:animate-[ds-sway_4s_ease-in-out_infinite]' : 'bud',
    fill: i < growth ? (plant === 'succulent' ? (i % 2 ? '#9dbda0' : '#79a98b') : i % 2 ? '#5a9965' : '#397953') : 'none',
    stroke: i < growth ? (plant === 'succulent' ? '#537e63' : '#326646') : '#b2ad99',
    strokeWidth: i < growth ? 1 : 1.2,
    strokeDasharray: i < growth ? undefined : '2.5 2.5',
    style: { transformOrigin: plant === 'sprout' ? `${SPROUT[i][0]}px ${SPROUT[i][1]}px` : '70px 98px', animationDelay: `${-i * .6}s` },
  });
  if (plant === 'sprout') return <svg viewBox="22 14 76 94" aria-hidden="true" data-plant={plant} className="h-full w-full">
    <defs><linearGradient id={potId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e98a62" /><stop offset="1" stopColor="#c8623c" /></linearGradient></defs>
    <path d="M60 84 C60 66 58 50 61 30" stroke="#3f7a45" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    {SPROUT.map(([x, y, side], i) => <path key={i} {...leaf(i)} d={side === 0 ? `M${x} ${y}c-6-8-2-16 0-18c2 2 6 10 0 18z` : side < 0 ? `M${x} ${y}c-10-2-18-8-20-14c8-2 16 2 20 14z` : `M${x} ${y}c10-2 18-8 20-14c-8-2-16 2-20 14z`} />)}
    <path d="M40 82h40l-5 24H45z" fill={`url(#${potId})`} /><rect x="37" y="78" width="46" height="8" rx="3" fill="#f0a07a" />
  </svg>;
  return <svg viewBox="0 0 140 140" aria-hidden="true" data-plant={plant} className="h-full w-full">
    <ellipse cx="70" cy="133" rx="34" ry="4" fill="#514b3b" opacity=".12" />
    {plant === 'monstera' && <>
      {MONSTERA.map(([x, y, angle], i) => <g key={i}>
        <path d={`M70 108Q70 ${y + 38} ${x} ${y + 24}`} fill="none" stroke="#578064" strokeWidth="1.7" />
        <g transform={`translate(${x} ${y}) rotate(${angle} 0 18)`}>
          <g className={leaf(i).className} style={{ ...leaf(i).style, transformOrigin: '0px 25px' }}>
          <path {...leaf(i)} className={undefined} style={undefined} d="M0 27C-24 15-22-6-9-4Q-3-5 0 3Q6-7 14-2C26 10 13 22 0 27Z" />
          {i < growth && <path d="M0 25V5m0 13-11-7m11 1 12-6m-12 0-6-5" fill="none" stroke="#b4c9a0" strokeWidth="1.4" strokeLinecap="round" />}
          </g>
        </g>
      </g>)}
    </>}
    {plant === 'fern' && FERN.map(([angle, length], i) => <g key={i} transform={`rotate(${angle} 70 104)`}>
      <g {...leaf(i)}>
        <path d={`M70 104Q64 ${104 - length / 2} 70 ${104 - length}`} fill="none" stroke={i < growth ? '#537a4d' : '#b2ad99'} />
        {[.22, .39, .56, .73, .9].map((fraction, j) => {
          const y = 104 - length * fraction, width = 12 - j * 1.6;
          return <path key={j} d={`M68 ${y}q${-width} 0 ${-width - 3} -10q${width} -1 ${width + 3} 10m0 0q${width} 0 ${width + 4} -10q${-width} -1 ${-width - 4} 10`} />;
        })}
      </g>
    </g>)}
    {plant === 'succulent' && SUCCULENT.map((angle, i) => <g key={i} transform={`rotate(${angle} 70 101)`}>
      <g className={leaf(i).className} style={leaf(i).style}>
      <path {...leaf(i)} className={undefined} style={undefined} d={`M70 104C${42 + i} 85 54 ${52 - i * 2} 70 ${42 - i * 2}C86 ${52 - i * 2} ${98 - i} 85 70 104Z`} />
      {i < growth && <path d={`M70 97V${55 - i * 2}`} stroke="#dce5c8" strokeWidth="1.3" opacity=".65" />}
      </g>
    </g>)}
    <path d="M41 103h58l-6 27H47z" fill={plant === 'monstera' ? '#e7d4ad' : plant === 'fern' ? '#b98162' : '#e3c5be'} stroke={plant === 'fern' ? '#8c604d' : '#a58e7b'} strokeWidth="1.5" />
    <rect x="38" y="99" width="64" height="8" rx="3" fill={plant === 'monstera' ? '#efe3c8' : plant === 'fern' ? '#ce9b79' : '#efd6ca'} />
    {plant === 'monstera' && <path d="M52 110v15m9-15v15m9-15v15m9-15v15m9-15v15" stroke="#c4b28f" strokeWidth="1.2" />}
    {plant === 'fern' && <path d="M46 114h48m-46 7h44" stroke="#d9b293" strokeWidth="1.2" />}
    {plant === 'succulent' && <path d="M53 119q4-6 8 0t8 0 8 0 8 0" fill="none" stroke="#b08f86" strokeWidth="1.4" />}
  </svg>;
}
