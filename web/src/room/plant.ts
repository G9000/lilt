export const PLANT_KEY = 'lilt.room.plant';
export const PLANTS = [
  { id: 'sprout', name: 'Original sprout' },
  { id: 'monstera', name: 'Monstera' },
  { id: 'fern', name: 'Fern' },
  { id: 'succulent', name: 'Succulent' },
] as const;
export type Plant = typeof PLANTS[number]['id'];
export const readPlant = (raw: string | null): Plant => PLANTS.find(p => p.id === raw)?.id ?? 'sprout';
export const plantDays = (days: number): number => Number.isFinite(days) ? Math.max(0, Math.min(7, Math.floor(days))) : 0;
