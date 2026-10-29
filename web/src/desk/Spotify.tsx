import { FormEvent, useEffect, useRef, useState } from "react";

/**
 * Spotify in the radio: paste a playlist, album or track link and Spotify's own embed player plays it.
 * Nothing loads from Spotify until a link is added. Signed in to Spotify in this browser you hear whole
 * tracks; otherwise Spotify plays previews. Like the lo-fi radio, it pauses while the mic is on.
 */

const KEY = "lilt.spotify";
export const SUGGESTED = [
  { label: "lofi beats", uri: "spotify:playlist:37i9dQZF1DWWQRwui0ExPn" },
  { label: "Lofi Girl", uri: "spotify:playlist:0vvXsWCC9xrXsKd4FyS8kM" },
];

/** A Spotify link or URI as `spotify:<kind>:<id>`, or null. */
export function spotifyUri(link: string): string | null {
  const s = link.trim();
  const m = s.match(/^spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]{10,})$/)
    ?? s.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]{10,})/);
  return m ? `spotify:${m[1]}:${m[2]}` : null;
}

export function savedSpotify(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
function saveSpotify(uri: string | null) {
  try { if (uri) localStorage.setItem(KEY, uri); else localStorage.removeItem(KEY); } catch { /* private mode */ }
}

interface Controller { pause(): void; resume(): void; destroy(): void; addListener(e: string, f: (x: any) => void): void }
let api: Promise<any> | null = null;
/** Spotify's iFrame API, loaded once and only when a player is shown. */
function spotifyApi(): Promise<any> {
  return (api ??= new Promise((resolve) => {
    (window as any).onSpotifyIframeApiReady = (IFrameAPI: any) => resolve(IFrameAPI);
    const s = document.createElement("script");
    s.src = "https://open.spotify.com/embed/iframe-api/v1";
    s.async = true;
    document.body.appendChild(s);
  }));
}

function Player({ uri }: { uri: string }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let ctl: Controller | null = null, live = true, playing = false, ducked = false;
    void spotifyApi().then((IFrameAPI) => {
      if (!live || !host.current) return;
      const el = document.createElement("div");
      host.current.replaceChildren(el);
      IFrameAPI.createController(el, { uri, width: "100%", height: 80 }, (c: Controller) => {
        ctl = c;
        c.addListener("playback_update", (e: any) => { playing = !e?.data?.isPaused; });
      });
    });
    // Out of the way while you record or listen, back afterwards.
    const onMic = (e: Event) => {
      const busy = (e as CustomEvent<boolean>).detail;
      if (busy && playing) { ducked = true; ctl?.pause(); }
      else if (!busy && ducked) { ducked = false; ctl?.resume(); }
    };
    window.addEventListener("lilt:mic", onMic);
    return () => { live = false; window.removeEventListener("lilt:mic", onMic); ctl?.destroy(); };
  }, [uri]);
  return <div className="sp-player" ref={host} />;
}

/** The Spotify side of the radio: choose what to play, then Spotify's player. */
export function SpotifyRadio({ onUse }: { onUse?: () => void }) {
  const [uri, setUri] = useState<string | null>(savedSpotify);
  const [editing, setEditing] = useState(!uri);
  const [link, setLink] = useState("");
  const [bad, setBad] = useState(false);
  const use = (u: string) => { saveSpotify(u); setUri(u); setEditing(false); setBad(false); setLink(""); onUse?.(); };
  const submit = (e: FormEvent) => { e.preventDefault(); const u = spotifyUri(link); if (u) use(u); else setBad(true); };
  if (uri && !editing) return (
    <div className="sp">
      <Player uri={uri} />
      <button className="sp-change" onClick={() => setEditing(true)}>Change playlist</button>
    </div>
  );
  return (
    <form className="sp sp-pick" onSubmit={submit}>
      <input value={link} onChange={(e) => { setLink(e.target.value); setBad(false); }} placeholder="Paste a Spotify playlist link" aria-label="Spotify playlist, album or track link" aria-invalid={bad} />
      <div className="sp-row">
        {SUGGESTED.map((s) => <button key={s.uri} type="button" className="sp-chip" onClick={() => use(s.uri)}>{s.label}</button>)}
        {uri && <button type="button" className="sp-chip quiet" onClick={() => setEditing(false)}>Cancel</button>}
      </div>
      <small>{bad ? "That doesn't look like a Spotify link." : "Spotify loads only once you pick something. It pauses while the mic is on."}</small>
    </form>
  );
}
