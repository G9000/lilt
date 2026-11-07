import { CAT_URL } from './scene';

export const CATS = [
  { id: 'original', name: 'Sleepy black & white', image: CAT_URL },
  { id: 'dilute-tuxedo', name: 'Dilute tuxedo', image: 'room/cats/dilute-tuxedo.png' },
  { id: 'ginger', name: 'Ginger tabby', image: 'room/cats/ginger.png' },
  { id: 'siamese', name: 'Siamese', image: 'room/cats/siamese.png' },
  { id: 'white', name: 'Fluffy white', image: 'room/cats/white.png' },
] as const;
export type RoomCat = typeof CATS[number]['id'];
export const CAT_KEY = 'lilt.room.cat';
export const readCat = (value: string | null): RoomCat => CATS.find(cat => cat.id === value)?.id ?? 'original';
export const catImage = (id: RoomCat) => CATS.find(cat => cat.id === id)!.image;
export const openCatPicker = () => window.dispatchEvent(new Event('lilt:cat-picker'));
