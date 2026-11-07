import { type Player } from './player';

// Each sprite has different transparent padding and feet. Place the feet on the desk,
// then let the foreground chair cover the lower left edge instead of moving the chair.
export const PLAYER_PLACEMENT: Record<Player, { left: number; top: number; width: number; height: number; angle: number; shadow: { left: number; top: number; width: number } }> = {
  cassette: { left: 616, top: 402, width: 231, height: 154, angle: 2, shadow: { left: 667, top: 529, width: 125 } },
  boombox: { left: 615, top: 391, width: 240, height: 160, angle: 2, shadow: { left: 664, top: 524, width: 135 } },
  radio: { left: 626, top: 414, width: 210, height: 140, angle: 3, shadow: { left: 666, top: 531, width: 126 } },
  turntable: { left: 614, top: 414, width: 228, height: 152, angle: 3, shadow: { left: 660, top: 542, width: 140 } },
};
