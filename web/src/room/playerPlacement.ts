import { type Player } from './player';

// Each sprite has different transparent padding and feet. Place the feet on the desk,
// then let the foreground chair cover the lower left edge instead of moving the chair.
// Contact points use the sprite's 1536 × 1024 coordinates so shadows rotate with its feet.
export const PLAYER_PLACEMENT: Record<Player, { left: number; top: number; width: number; height: number; angle: number; contact: { feet: [number, number]; baseline: number } }> = {
  cassette: { left: 616, top: 402, width: 231, height: 154, angle: 2, contact: { feet: [446, 1054], baseline: 860 } },
  boombox: { left: 615, top: 391, width: 240, height: 160, angle: 2, contact: { feet: [401, 1111], baseline: 852 } },
  radio: { left: 626, top: 414, width: 210, height: 140, angle: 3, contact: { feet: [402, 1074], baseline: 865 } },
  turntable: { left: 617, top: 411, width: 218, height: 145.33, angle: 8, contact: { feet: [368, 1110], baseline: 874 } },
};
