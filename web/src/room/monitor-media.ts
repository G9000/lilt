import type { MonitorMedia } from './appearance-settings';

const CACHE = 'lilt-monitor-media-v1';
const key = (id: string, poster = false) => new URL(`/__lilt_monitor_media__/${id}${poster ? '/still' : ''}`, location.origin).href;
const types: Record<string, MonitorMedia['kind']> = { 'image/png': 'picture', 'image/jpeg': 'picture', 'image/webp': 'picture', 'image/gif': 'gif', 'video/mp4': 'video', 'video/webm': 'video' };

export async function prepareMonitorMedia(file: File) {
  const kind = types[file.type];
  if (!kind) throw new Error('Choose a PNG, JPG, WebP, GIF, MP4 or WebM file.');
  if (!file.size || file.size > 25 * 1024 * 1024) throw new Error('Choose a file smaller than 25 MB.');
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  const signature = file.type === 'image/png' ? bytes[0] === 137 && ascii(1, 4) === 'PNG'
    : file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : file.type === 'image/webp' ? ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
    : file.type === 'image/gif' ? ['GIF87a', 'GIF89a'].includes(ascii(0, 6))
    : file.type === 'video/mp4' ? ascii(4, 8) === 'ftyp' : bytes[0] === 26 && bytes[1] === 69 && bytes[2] === 223 && bytes[3] === 163;
  if (!signature) throw new Error('This file could not be read. Try another picture or video.');
  const url = URL.createObjectURL(file);
  const media = kind === 'video' ? document.createElement('video') : new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer); media.removeEventListener(kind === 'video' ? 'loadeddata' : 'load', loaded); media.removeEventListener('error', failed);
        if (error) reject(error); else resolve();
      };
      const loaded = () => finish();
      const failed = () => finish(new Error('This file cannot play here. Try another picture or an MP4/WebM video.'));
      const timer = window.setTimeout(() => finish(new Error('This file took too long to open. Try a smaller file.')), 15000);
      media.addEventListener(kind === 'video' ? 'loadeddata' : 'load', loaded);
      media.addEventListener('error', failed);
      if (media instanceof HTMLVideoElement) { media.muted = true; media.playsInline = true; media.preload = 'auto'; }
      media.src = url;
    });
    const width = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
    const height = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
    if (!width || !height || width > 4096 || height > 4096) throw new Error('Choose media no larger than 4096 × 4096 pixels.');
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1040 / width, 600 / height);
    canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('The preview could not be created. Try again.');
    ctx.drawImage(media, 0, 0, canvas.width, canvas.height);
    const poster = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The preview could not be created.')), 'image/png'));
    // Picture uploads are flattened, so animated PNG/WebP cannot bypass pause or reduced motion.
    return { file: kind === 'picture' ? poster : file, poster, kind, name: file.name.slice(0, 256) };
  } finally {
    if (media instanceof HTMLVideoElement) { media.pause(); media.removeAttribute('src'); media.load(); }
    else media.src = '';
    URL.revokeObjectURL(url);
  }
}

export async function saveMonitorFile(prepared: Awaited<ReturnType<typeof prepareMonitorMedia>>) {
  const id = crypto.randomUUID();
  try {
    const cache = await caches.open(CACHE);
    try {
      await cache.put(key(id), new Response(prepared.file, { headers: { 'Content-Type': prepared.file.type } }));
      await cache.put(key(id, true), new Response(prepared.poster, { headers: { 'Content-Type': 'image/png' } }));
    } catch (error) { await Promise.all([cache.delete(key(id)), cache.delete(key(id, true))]); throw error; }
  } catch { throw new Error('There is not enough browser storage, or saving is unavailable. Try a smaller file.'); }
  return id;
}

export async function loadMonitorFile(id: string) {
  const cache = await caches.open(CACHE);
  const [file, poster] = await Promise.all([cache.match(key(id)), cache.match(key(id, true))]);
  if (!file || !poster) throw new Error('This upload is no longer saved in this browser. Choose the file again.');
  return { file: await file.blob(), poster: await poster.blob() };
}

export async function removeMonitorFile(id: string) {
  const cache = await caches.open(CACHE);
  await Promise.all([cache.delete(key(id)), cache.delete(key(id, true))]);
}
