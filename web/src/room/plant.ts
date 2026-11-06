export const PLANT_KEY = 'lilt.room.plant';
export const PLANTS = [
  { id: 'sprout', name: 'Ficus' },
  { id: 'monstera', name: 'Monstera' },
  { id: 'fern', name: 'Fern' },
  { id: 'succulent', name: 'Jade plant' },
] as const;
export type Plant = typeof PLANTS[number]['id'];
export const readPlant = (raw: string | null): Plant => PLANTS.find(p => p.id === raw)?.id ?? 'sprout';
export const plantDays = (days: number): number => Number.isFinite(days) ? Math.max(0, Math.min(7, Math.floor(days))) : 0;
export const plantCanopyScale = (days: number) => .9 + plantDays(days) / 70;
export const plantImage = (plant: Plant) => `room/plants/${plant}.png`;
export function plantLight(weights: Record<'day' | 'morning' | 'sunset' | 'night', number>) {
  return {
    brightness: weights.day + weights.morning * .94 + weights.sunset * .93 + weights.night * .76,
    saturation: weights.day + weights.morning * .92 + weights.sunset * 1.04 + weights.night * .85,
    sepia: weights.morning * .06 + weights.sunset * .18 + weights.night * .08,
  };
}
