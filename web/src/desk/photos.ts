import { useEffect, useState } from "react";
import { api, PhotoIndex } from "../api";
import { Picture, PICTURES } from "./pictures";

/**
 * The pictures you can see in Photos and on the clock: Lilt's own photos (not the views of the room),
 * less any you hid, then the ones you added (kept by the server in
 * <data>/photos). One copy, shared by every widget and window, and
 * which picture the clock shows (one you picked, or a new photo each time you come in).
 */

let index: PhotoIndex | null = null;
let loading: Promise<void> | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function refreshPhotos() {
  loading = api.photos().then((i) => { index = i; emit(); }, () => { loading = null; });
  return loading;
}
/** After a change the server answered with the new list. */
export function setPhotoIndex(i: PhotoIndex) { index = i; emit(); }

const yours = (p: PhotoIndex["uploaded"][number]): Picture => ({
  id: p.id, name: p.name, url: () => `/api/photos/${p.id}/image`, photo: true, mine: true,
  clock: { backgroundSize: "cover", backgroundPosition: "center" }, card: { backgroundSize: "cover", backgroundPosition: "center" },
});

export function visiblePictures(): Picture[] {
  const hidden = new Set(index?.hidden ?? []);
  return [...PICTURES.filter((p) => p.photo && !hidden.has(p.id)), ...(index?.uploaded ?? []).map(yours)];
}

export function usePhotos() {
  const [, bump] = useState(0);
  useEffect(() => {
    const f = () => bump((n) => n + 1);
    subs.add(f);
    if (!index && !loading) void refreshPhotos();
    return () => { subs.delete(f); };
  }, []);
  return { pictures: visiblePictures(), hidden: index?.hidden.length ?? 0, loaded: !!index };
}

/* ---------- the clock's picture ---------- */

/** "shuffle" (the default: a different photo each time), or the id of one you picked. */
const PICTURE_KEY = "lilt.clock.picture.v2";
/** The photo it showed last, so shuffling never shows the same one twice running. */
const LAST_KEY = "lilt.clock.last";
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode: forget on reload */ } };

export function pinnedPicture(): string | null { const v = read(PICTURE_KEY); return v && v !== "shuffle" ? v : null; }
/** Keep one picture on the clock, or (null) go back to a new photo each time. Every clock follows. */
export function pinPicture(id: string | null) {
  write(PICTURE_KEY, id ?? "shuffle");
  window.dispatchEvent(new Event("lilt:clock-picture"));
}
/** A photo to shuffle to: any but the last one shown. */
export function shufflePicture(list: Picture[]): string {
  const fresh = list.filter((p) => p.id !== read(LAST_KEY));
  const from = fresh.length ? fresh : list;
  const p = from[Math.floor(Math.random() * from.length)] ?? PICTURES[0];
  write(LAST_KEY, p.id);
  return p.id;
}
