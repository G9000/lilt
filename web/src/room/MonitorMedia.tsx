import { CSSProperties, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { MonitorMedia as Media, Monitor, ROOM_DECOR, RoomAppearancePrefs } from './appearance-settings';
import { loadMonitorFile } from './monitor-media';
import { MAIN_SCREEN, SIDE_SCREEN, quadMatrix } from './scene';

const allowed = new Set<string>();
const issues = new Map<string, string>();
const unavailable = new Set<string>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
function report(id: string, message: string, missing = false) { issues.set(id, message); if (missing) unavailable.add(id); notify(); }
export function allowMonitorMotion(id: string) { allowed.add(id); if (!unavailable.has(id)) issues.delete(id); notify(); }
export function useMonitorIssue(id?: string) { return useSyncExternalStore(subscribe, () => id ? issues.get(id) : undefined); }
export function useMonitorPaused(media?: Media) {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { allowed.clear(); setReduced(query.matches); notify(); };
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  const permitted = useSyncExternalStore(subscribe, () => !!media && allowed.has(media.id));
  const issue = useMonitorIssue(media?.id);
  return !media || media.paused || !!issue || (reduced && !permitted);
}

function useFile(media: Media) {
  const [file, setFile] = useState<{ id: string; url: string; poster: string }>();
  useEffect(() => {
    let disposed = false;
    let urls: string[] = [];
    void loadMonitorFile(media.id).then(data => {
      if (disposed) return;
      urls = [URL.createObjectURL(data.file), URL.createObjectURL(data.poster)];
      setFile({ id: media.id, url: urls[0], poster: urls[1] });
    }, error => { if (!disposed) report(media.id, error instanceof Error ? error.message : 'This upload could not be opened. Choose the file again.', true); });
    return () => { disposed = true; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [media.id]);
  return file?.id === media.id ? file : undefined;
}

export function MonitorMedia({ media, active, className, monitor, style }: {
  media: Media; active: boolean; className: string; monitor: Monitor; style?: CSSProperties;
}) {
  const file = useFile(media);
  const paused = useMonitorPaused(media);
  const [visible, setVisible] = useState(!document.hidden);
  const video = useRef<HTMLVideoElement>(null);
  const playing = active && visible && !paused;
  useEffect(() => {
    const change = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let cancelled = false;
    element.muted = true;
    if (playing) void element.play().catch(error => {
      if (!cancelled && error.name !== 'AbortError') report(media.id, 'Playback could not start. Press Play to try again, or choose another video.');
    });
    else element.pause();
    return () => { cancelled = true; element.pause(); };
  }, [file?.url, playing, media.id]);
  if (!file) return null;
  const common = { className, style, 'data-monitor': monitor, 'data-media-kind': media.kind };
  if (media.kind === 'video') return <video {...common} ref={video} src={file.url} poster={file.poster} muted loop playsInline preload="auto"
    aria-hidden="true" onError={() => report(media.id, 'This video cannot play here. Choose another MP4 or WebM file.')} />;
  return <img {...common} src={media.kind === 'gif' && playing ? file.url : file.poster} alt="" draggable={false} />;
}

export function MonitorScreen({ monitor, appearance, inside }: { monitor: Monitor; appearance: RoomAppearancePrefs; inside: boolean }) {
  const decor = monitor === 'main' ? appearance.mainDecor : appearance.decor;
  const media = monitor === 'main' ? appearance.mainMedia : appearance.sideMedia;
  const style = { transform: quadMatrix(520, 300, monitor === 'main' ? MAIN_SCREEN : SIDE_SCREEN) };
  if (decor === 'custom' && media) return <MonitorMedia key={media.id} media={media} monitor={monitor} active={!inside} className="room-monitor-art" style={style} />;
  if (decor === 'original' || decor === 'custom') return null;
  return <img className="room-monitor-art" data-monitor={monitor} src={ROOM_DECOR[decor]} alt="" draggable={false} style={style} />;
}
