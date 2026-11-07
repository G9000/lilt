export const HARDWARE = ['microphone', 'main-frame', 'side-frame'] as const;
export type Hardware = typeof HARDWARE[number];
export const FINISHES = ['black', 'cream', 'sage', 'silver'] as const;
export type Finish = typeof FINISHES[number];
export const hardwareTitle: Record<Hardware, string> = {
  microphone: 'Microphone', 'main-frame': 'Main monitor frame', 'side-frame': 'Side monitor frame',
};
export const finishName: Record<Finish, string> = { black: 'Original black', cream: 'Warm cream', sage: 'Soft sage', silver: 'Brushed silver' };
export const hardwareBox: Record<Hardware, [number, number, number, number]> = {
  microphone: [560, 215, 280, 290], 'main-frame': [840, 305, 330, 240], 'side-frame': [1153, 338, 280, 225],
};
export const hardwareKey = (kind: Hardware) => `lilt.room.${kind}`;
export const hardwareMask = (kind: Hardware) => `room/hardware/${kind === 'microphone' ? kind : kind.split('-')[0]}-mask.png`;
export const hardwareImage = (kind: Hardware, finish: Finish) => finish === 'black' ? 'room/room-day-v3.webp' : `room/hardware/${kind === 'microphone' ? kind : 'frames'}-${finish}.png`;
export const readFinish = (value: string | null): Finish => FINISHES.find(finish => finish === value) ?? 'black';
export const openHardware = (kind: Hardware) => window.dispatchEvent(new CustomEvent('lilt:hardware', { detail: kind }));
