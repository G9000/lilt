import { PROP_BOUNDS } from './propBounds';

export type PropKind = 'coffee' | 'camera';
export type PropDesign = keyof typeof PROP_BOUNDS;
export const PROP_CHOICES: Record<PropKind, readonly { id: PropDesign; name: string }[]> = {
  coffee: [
    { id: 'coffee-latte', name: 'Iced latte' }, { id: 'coffee-coldbrew', name: 'Cold brew' },
    { id: 'coffee-matcha', name: 'Iced matcha' }, { id: 'coffee-strawberry', name: 'Strawberry milk' },
  ],
  camera: [
    { id: 'camera-black', name: 'Classic black' }, { id: 'camera-silver', name: 'Silver film' },
    { id: 'camera-instant', name: 'Cream instant' }, { id: 'camera-sage', name: 'Sage compact' },
  ],
};
export const propKey = (kind: PropKind) => `lilt.room.${kind}`;
export const readProp = (kind: PropKind, value: string | null): PropDesign =>
  PROP_CHOICES[kind].find(choice => choice.id === value)?.id ?? PROP_CHOICES[kind][0].id;
export const propImage = (design: PropDesign) => `room/props/${design}.png`;
export const PROP_REPAIR = {
  coffee: { left: 1158, top: 455, width: 66, height: 128 },
  camera: { left: 1234, top: 520, width: 119, height: 80 },
};

export function propPlacement(kind: PropKind, design: PropDesign) {
  const { box } = PROP_BOUNDS[design];
  const scale = Math.min((kind === 'coffee' ? 48 : 96) / box[2], (kind === 'coffee' ? 110 : 68) / box[3]);
  const width = box[2] * scale, height = box[3] * scale;
  return { left: (kind === 'coffee' ? 1189 : 1292) - width / 2, top: (kind === 'coffee' ? 574 : 590) - height, width, height };
}
