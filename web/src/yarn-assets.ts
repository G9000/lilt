/** Local artwork loads independently of the microphone and never blocks play. */
const sources = {
  day: '/yarn/room-day.webp', night: '/yarn/room-night.webp',
  kitten: '/yarn/kitten.webp', reach: '/yarn/kitten-reach.webp', rest: '/yarn/kitten-rest.webp',
};
export type YarnArt = Record<keyof typeof sources, HTMLImageElement>;

export function loadYarnArt(changed: () => void) {
  const images = {} as YarnArt;
  for (const key of Object.keys(sources) as (keyof YarnArt)[]) {
    const image = new Image();
    image.onload = changed;
    image.onerror = changed;
    image.src = sources[key];
    images[key] = image;
  }
  return { images, dispose: () => {
    for (const image of Object.values(images)) { image.onload = null; image.onerror = null; }
  } };
}

export const artReady = (image: HTMLImageElement) => image.complete && image.naturalWidth > 0;
