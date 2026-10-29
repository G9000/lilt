import { FormEvent, useEffect, useRef, useState } from "react";
import { accessToken, clientId, redirectUri, setClientId, signedIn, signIn, signOut, spotify } from "./spotifyAuth";

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

/* ------------------------------------------------------------------ signed in: your own Spotify */

interface Track { name: string; artists: string; art: string | null; paused: boolean }
interface Playlist { id: string; name: string; uri: string; image: string | null; count: number }
let sdk: Promise<any> | null = null;
/** Spotify's Web Playback SDK: Lilt becomes a Spotify device ("Lilt"). Loaded only when you're signed in. */
function playbackSdk(): Promise<any> {
  return (sdk ??= new Promise((resolve) => {
    (window as any).onSpotifyWebPlaybackSDKReady = () => resolve((window as any).Spotify);
    const s = document.createElement("script");
    s.src = "https://sdk.scdn.co/spotify-player.js";
    s.async = true;
    document.body.appendChild(s);
  }));
}
const LAST = "lilt.spotify.last";

function MySpotify() {
  const player = useRef<any>(null);
  const [device, setDevice] = useState<string | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [lists, setLists] = useState<Playlist[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    let live = true, ducked = false;
    void spotify<{ display_name: string }>("/me").then((u) => live && setMe(u?.display_name ?? null), (e) => live && setErr(e.message));
    void spotify<{ items: any[] }>("/me/playlists?limit=50").then((r) => live && setLists((r?.items ?? []).filter(Boolean).map((p) => ({
      id: p.id, name: p.name, uri: p.uri, image: p.images?.[p.images.length - 1]?.url ?? p.images?.[0]?.url ?? null, count: p.tracks?.total ?? 0,
    })))).catch(() => live && setLists([]));
    void playbackSdk().then((Spotify) => {
      if (!live) return;
      const p = new Spotify.Player({ name: "Lilt", volume: 0.6, getOAuthToken: (cb: (t: string) => void) => { void accessToken().then((t) => t && cb(t)); } });
      player.current = p;
      p.addListener("ready", ({ device_id }: { device_id: string }) => live && setDevice(device_id));
      p.addListener("not_ready", () => live && setDevice(null));
      p.addListener("account_error", () => live && setErr("Playing in Lilt needs Spotify Premium. You can still paste a playlist link to use Spotify's own player."));
      p.addListener("authentication_error", () => { if (live) { setErr("Spotify signed you out. Sign in again."); signOut(); } });
      p.addListener("initialization_error", ({ message }: { message: string }) => live && setErr(message));
      p.addListener("player_state_changed", (st: any) => {
        if (!live || !st) return;
        const t = st.track_window?.current_track;
        setTrack(t ? { name: t.name, artists: t.artists.map((a: any) => a.name).join(", "), art: t.album?.images?.[0]?.url ?? null, paused: st.paused } : null);
      });
      void p.connect();
    });
    // Out of the way while you record or listen, back afterwards.
    const onMic = (e: Event) => {
      const busy = (e as CustomEvent<boolean>).detail, p = player.current;
      if (!p) return;
      void p.getCurrentState().then((st: any) => {
        if (busy && st && !st.paused) { ducked = true; void p.pause(); }
        else if (!busy && ducked) { ducked = false; void p.resume(); }
      });
    };
    window.addEventListener("lilt:mic", onMic);
    return () => { live = false; window.removeEventListener("lilt:mic", onMic); player.current?.disconnect(); player.current = null; };
  }, []);

  const play = async (uri: string) => {
    if (!device) return;
    setPicking(false); setErr(null);
    try { localStorage.setItem(LAST, uri); } catch { /* private mode */ }
    try { await spotify(`/me/player/play?device_id=${device}`, { method: "PUT", body: JSON.stringify({ context_uri: uri }) }); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };
  const toggle = async () => {
    if (track) return void player.current?.togglePlay();
    const last = (() => { try { return localStorage.getItem(LAST); } catch { return null; } })() ?? lists?.[0]?.uri;
    if (last) await play(last); else setPicking(true);
  };

  return (
    <div className="sp sp-me">
      <div className="sp-now">
        <span className={`sp-art${track && !track.paused ? " spin" : ""}`}>{track?.art ? <img src={track.art} alt="" /> : <i aria-hidden="true">♪</i>}</span>
        <span className="sp-what">
          <small>{err ? "Spotify" : !device ? "Connecting to Spotify…" : track ? (track.paused ? "Paused" : "Now playing") : `Signed in${me ? ` as ${me}` : ""}`}</small>
          <b>{track?.name ?? "Pick a playlist"}</b>
          {track && <small>{track.artists}</small>}
        </span>
      </div>
      <div className="sp-ctl">
        <button className="ds-r-skip" onClick={() => void player.current?.previousTrack()} disabled={!track} aria-label="Previous track"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3v10M13 3L6 8l7 5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg></button>
        <button className="ds-r-play" onClick={() => void toggle()} disabled={!device} aria-label={track && !track.paused ? "Pause Spotify" : "Play Spotify"}>
          {track && !track.paused
            ? <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5h2.2v9H3zM6.8 1.5H9v9H6.8z" fill="currentColor" /></svg>
            : <svg viewBox="0 0 12 12" aria-hidden="true" style={{ marginLeft: 2 }}><path d="M3 1.5l7.5 4.5L3 10.5z" fill="currentColor" /></svg>}
        </button>
        <button className="ds-r-skip" onClick={() => void player.current?.nextTrack()} disabled={!track} aria-label="Next track"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12 3v10M3 3l7 5-7 5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg></button>
        <button className="sp-chip quiet" onClick={() => setPicking((v) => !v)} aria-expanded={picking}>Your playlists</button>
      </div>
      {picking && (
        <ul className="sp-lists" aria-label="Your playlists">
          {lists === null ? <li className="sp-empty">Loading…</li> : lists.length === 0 ? <li className="sp-empty">No playlists found.</li>
            : lists.map((p) => (
              <li key={p.id}><button onClick={() => void play(p.uri)} disabled={!device}>
                {p.image ? <img src={p.image} alt="" /> : <i aria-hidden="true">♪</i>}<span><b>{p.name}</b><small>{p.count} tracks</small></span>
              </button></li>
            ))}
        </ul>
      )}
      {err && <p className="sp-err" role="alert">{err}</p>}
      <button className="sp-change" onClick={() => signOut()}>Sign out of Spotify</button>
    </div>
  );
}

/* ------------------------------------------------------------------ setting up: your Spotify app */

function Setup({ onEmbed }: { onEmbed: () => void }) {
  const [id, setId] = useState(clientId() ?? "");
  const [copied, setCopied] = useState(false);
  const uri = redirectUri();
  const onLocalhost = location.hostname === "localhost";
  if (clientId()) return (
    <div className="sp sp-setup">
      <button className="sp-signin" onClick={() => void signIn()}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1ed760" /><path d="M6.5 9.3c3.6-1 7.6-.7 10.9 1M7.2 12.4c3-.8 6.2-.5 8.9.9M7.9 15.3c2.4-.6 4.8-.4 6.9.7" fill="none" stroke="#000" strokeWidth="1.6" strokeLinecap="round" /></svg>
        Sign in with Spotify
      </button>
      <small>Plays your own playlists in Lilt. Needs Spotify Premium.</small>
      <div className="sp-row"><button type="button" className="sp-chip quiet" onClick={onEmbed}>Paste a link instead</button><button type="button" className="sp-chip quiet" onClick={() => setClientId(null)}>Change Client ID</button></div>
    </div>
  );
  return (
    <form className="sp sp-setup" onSubmit={(e) => { e.preventDefault(); if (id.trim()) setClientId(id); }}>
      <b className="sp-h">Connect your Spotify</b>
      {onLocalhost
        ? <small>Spotify only signs in at 127.0.0.1. <a href={location.href.replace("//localhost", "//127.0.0.1")}>Open Lilt there</a> to connect.</small>
        : <ol className="sp-steps">
            <li>At <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">developer.spotify.com</a>, create an app (Web API and Web Playback SDK).</li>
            <li>Add this Redirect URI: <button type="button" className="sp-copy" onClick={() => { void navigator.clipboard?.writeText(uri); setCopied(true); }}>{uri}<span>{copied ? "Copied" : "Copy"}</span></button></li>
            <li>Paste the app's Client ID:</li>
          </ol>}
      {!onLocalhost && <input value={id} onChange={(e) => setId(e.target.value)} placeholder="Client ID" aria-label="Spotify Client ID" spellCheck={false} />}
      <div className="sp-row">
        {!onLocalhost && <button className="sp-chip" disabled={!id.trim()}>Save</button>}
        <button type="button" className="sp-chip quiet" onClick={onEmbed}>Or paste a playlist link</button>
      </div>
    </form>
  );
}

/** The Spotify side of the radio: your own Spotify when you've signed in; otherwise set it up, or
 *  just paste a link for Spotify's embed player. */
export function SpotifyRadio() {
  const [, bump] = useState(0);
  const [embed, setEmbed] = useState(() => !!savedSpotify() && !signedIn());
  useEffect(() => { const on = () => bump((n) => n + 1); window.addEventListener("lilt:spotify", on); return () => window.removeEventListener("lilt:spotify", on); }, []);
  if (signedIn()) return <MySpotify />;
  if (embed) return <EmbedRadio onBack={() => setEmbed(false)} />;
  return <Setup onEmbed={() => setEmbed(true)} />;
}

/** Without signing in: paste a link, and Spotify's embed player plays it (previews unless you're signed in to Spotify in this browser). */
function EmbedRadio({ onUse, onBack }: { onUse?: () => void; onBack: () => void }) {
  const [uri, setUri] = useState<string | null>(savedSpotify);
  const [editing, setEditing] = useState(!uri);
  const [link, setLink] = useState("");
  const [bad, setBad] = useState(false);
  const use = (u: string) => { saveSpotify(u); setUri(u); setEditing(false); setBad(false); setLink(""); onUse?.(); };
  const submit = (e: FormEvent) => { e.preventDefault(); const u = spotifyUri(link); if (u) use(u); else setBad(true); };
  if (uri && !editing) return (
    <div className="sp">
      <Player uri={uri} />
      <div className="sp-row"><button className="sp-change" onClick={() => setEditing(true)}>Change playlist</button><button className="sp-change" onClick={onBack}>Sign in to your Spotify</button></div>
    </div>
  );
  return (
    <form className="sp sp-pick" onSubmit={submit}>
      <input value={link} onChange={(e) => { setLink(e.target.value); setBad(false); }} placeholder="Paste a Spotify playlist link" aria-label="Spotify playlist, album or track link" aria-invalid={bad} />
      <div className="sp-row">
        {SUGGESTED.map((s) => <button key={s.uri} type="button" className="sp-chip" onClick={() => use(s.uri)}>{s.label}</button>)}
        {uri && <button type="button" className="sp-chip quiet" onClick={() => setEditing(false)}>Cancel</button>}
        <button type="button" className="sp-chip quiet" onClick={onBack}>Sign in instead</button>
      </div>
      <small>{bad ? "That doesn't look like a Spotify link." : "Spotify loads only once you pick something. It pauses while the mic is on."}</small>
    </form>
  );
}
