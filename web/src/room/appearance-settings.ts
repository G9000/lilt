import { weights, type Light, type Weights } from './scene.ts';

type RoomDecor = 'original' | 'leaves' | 'stars' | 'cat' | 'custom';
export type Monitor = 'main' | 'side';
export interface MonitorMedia { id: string; name: string; kind: 'picture' | 'gif' | 'video'; paused: boolean }
function readMedia(value: unknown): MonitorMedia | undefined {
  if (!value || typeof value !== 'object') return;
  const m = value as MonitorMedia;
  if (typeof m.id !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(m.id)
    || typeof m.name !== 'string' || !m.name.trim() || !['picture', 'gif', 'video'].includes(m.kind) || typeof m.paused !== 'boolean') return;
  return { id: m.id, name: m.name.slice(0, 256), kind: m.kind, paused: m.paused };
}
export interface RoomAppearancePrefs {
  light: 'auto' | Light;
  warmth: number;
  lights: 'auto' | 'on' | 'off';
  decor: RoomDecor;
  mainDecor: RoomDecor;
  mainMedia?: MonitorMedia;
  sideMedia?: MonitorMedia;
}
export const DEFAULT_APPEARANCE: RoomAppearancePrefs = { light: 'auto', warmth: 0, lights: 'auto', decor: 'original', mainDecor: 'original' };
export function readAppearance(raw: string | null): RoomAppearancePrefs {
  let value: Partial<RoomAppearancePrefs> = {};
  try { const parsed = JSON.parse(raw ?? '{}'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) value = parsed; } catch { /* Keep the original room if saved choices cannot be read. */ }
  const mainMedia = readMedia(value.mainMedia), sideMedia = readMedia(value.sideMedia);
  return {
    light: ['auto', 'morning', 'day', 'sunset', 'night'].includes(value.light ?? '') ? value.light! : 'auto',
    warmth: typeof value.warmth === 'number' && Number.isFinite(value.warmth) ? Math.max(-100, Math.min(100, value.warmth)) : 0,
    lights: ['auto', 'on', 'off'].includes(value.lights ?? '') ? value.lights! : 'auto',
    decor: value.decor === 'custom' && sideMedia ? 'custom' : ['original', 'leaves', 'stars', 'cat'].includes(value.decor ?? '') ? value.decor! : 'original',
    mainDecor: value.mainDecor === 'custom' && mainMedia ? 'custom' : ['original', 'leaves', 'stars', 'cat'].includes(value.mainDecor ?? '') ? value.mainDecor! : 'original',
    ...(mainMedia ? { mainMedia } : {}), ...(sideMedia ? { sideMedia } : {}),
  };
}
export function roomWeights(light: RoomAppearancePrefs['light'], minute: number): Weights {
  if (light === 'auto') return weights(minute);
  return { day: 0, morning: 0, sunset: 0, night: 0, [light]: 1 };
}
export const ROOM_DECOR = {
  original: '', leaves: 'pictures/plant-fern.webp', stars: 'pictures/nebula-cliffs.webp', cat: 'pictures/cat-window-nap.webp',
};
