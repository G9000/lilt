export const CHAIR_KEY = 'lilt.room.chair';
export const CHAIR_MASK = 'room/chair/foreground.png';
export const BED_MASK = 'room/chair/bed-foreground.png';
export const CHAIRS = [
  { id: 'original', name: 'Mesh & pink throw' },
  { id: 'cream', name: 'Cream upholstered' },
  { id: 'sage', name: 'Sage padded' },
  { id: 'cane', name: 'Walnut & cane' },
] as const;
export type Chair = typeof CHAIRS[number]['id'];
export const readChair = (value: string | null): Chair => CHAIRS.find(chair => chair.id === value)?.id ?? 'original';
export const chairImage = (chair: Chair) => chair === 'original' ? CHAIR_MASK : `room/chair/${chair}.png`;
export const chairAssets = (chair: Chair): string[] => chair === 'original' ? [] : [
  chairImage(chair), CHAIR_MASK, BED_MASK, ...['day', 'morning', 'sunset', 'night'].map(light => `room/chair/clear-${light}.png`),
];
