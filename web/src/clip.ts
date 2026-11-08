// Saving part of a take as a file to share: the bounds you pick and the address that cuts it. The server
// cuts the clip from the take's decoded copy (`/api/takes/{id}/clip`), so it plays the same everywhere.

/** The longest clip saved in one go, in seconds; the server holds to the same limit. */
export const CLIP_MAX_S = 300;
/** The shortest clip worth saving, in seconds. */
export const CLIP_MIN_S = 0.5;

/**
 * Start and end, kept inside the take, at least half a second apart (moving the end back if it has
 * to), and at most `CLIP_MAX_S` long (bringing the end in to fit).
 */
export function clipBounds(start: number, end: number, duration: number): [number, number] {
  const d = Math.max(0, duration);
  let s = Math.min(Math.max(0, start), Math.max(0, d - CLIP_MIN_S));
  let e = Math.min(Math.max(end, s + CLIP_MIN_S), d);
  if (e - s > CLIP_MAX_S) e = s + CLIP_MAX_S;
  if (e < s) s = e = 0;
  return [round(s), round(e)];
}

const round = (x: number) => Math.round(x * 10) / 10;

/** The address of the clip file, which downloads (or plays) the part chosen. */
export function clipUrl(takeId: string, start: number, end: number): string {
  return `/api/takes/${encodeURIComponent(takeId)}/clip?start=${start.toFixed(1)}&end=${end.toFixed(1)}`;
}

/** A time in a take as it reads on a clock: 0:07, 1:05. */
export function clipTime(s: number): string {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
