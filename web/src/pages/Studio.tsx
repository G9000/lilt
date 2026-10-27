import "../styles/voice.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, Profile, Take, TextItem, TextLevel, Texts } from "../api";
import { AudioPlayer, useTakePitch } from "../components/AudioPlayer";
import { Callout, StatusBadge, TakeFlags, useTakeStatus, Toast, useToast } from "../components/bits";
import { LiveReadout, LiveRoll, useLivePitch } from "../components/LivePitch";
import { RecordPanel, useMic } from "../components/Recording";
import { ReadAlong, ReadNotes } from "../components/ReadAlong";
import { go } from "../App";

const Star = ({ on }: { on: boolean }) => <svg viewBox="0 0 16 16" aria-hidden="true" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" /></svg>;
const Ext = () => <svg className="vext" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 2.5h5v5M9.5 2.5l-7 7" /></svg>;

function pick(level: TextLevel, avoid?: string): TextItem {
  const pool = level.items.filter((i) => i.id !== avoid);
  return pool[Math.floor(Math.random() * pool.length)] ?? level.items[0];
}
const next = (level: TextLevel, cur: TextItem) => level.items[(level.items.findIndex((i) => i.id === cur.id) + 1) % level.items.length];

export function StudioPage({ levelId, itemId }: { levelId?: string; itemId?: string }) {
  const [texts, setTexts] = useState<Texts | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [level, setLevel] = useState<TextLevel | null>(null);
  const [item, setItem] = useState<TextItem | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);
  const [previous, setPrevious] = useState<Take | null>(null);
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const starts = useRef<(number | null)[] | null>(null);
  const [toast, setToast] = useToast();
  const mic = useMic();
  const band = profile?.comfort_range_hz ?? null;

  useEffect(() => {
    void Promise.all([api.texts(), api.profile(), api.studioSession()]).then(([t, p, s]) => {
      setTexts(t);
      setProfile(p);
      setSessionId(s.id);
      const lv = t.levels.find((l) => l.id === levelId) ?? t.levels[0];
      setLevel(lv);
      setItem(lv.items.find((i) => i.id === itemId) ?? lv.items[0]);
      void api.session(s.id).then((d) => setTakes(d.takes.filter((x) => x.role === "free")));
    });
  }, [levelId, itemId]);

  const promptId = level && item ? `text.${level.id}.${item.id}` : "";
  useEffect(() => {
    if (!promptId) return;
    void api.history({ prompt_id: promptId, days: 365 }).then((h) => setPrevious(h.takes.length ? h.takes[h.takes.length - 1] : null));
  }, [promptId]);

  const livePoints = useLivePitch(mic.stream, listening);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || recording) return;
      if (e.key === "n" && level) setItem((cur) => pick(level, cur?.id));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [level, recording]);

  const latestForText = useMemo(() => takes.filter((t) => t.prompt_id === promptId), [takes, promptId]);
  const latest = latestForText[latestForText.length - 1] ?? null;
  const before = latestForText.length >= 2 ? latestForText[latestForText.length - 2] : previous && previous.id !== latest?.id ? previous : null;
  const latestPitch = useTakePitch(latest?.id, latest?.status === "review_ready");

  if (!texts || !level || !item || !sessionId) return <p className="vloading">Loading…</p>;

  const isPrompt = level.kind === "prompt";
  const startListening = async () => {
    const s = mic.stream ?? (await mic.request());
    if (s) setListening(true);
  };
  const useRange = async (t: Take) => {
    const a = await api.analysis(t.id).catch(() => null);
    const p10 = a?.measures?.f0_p10_hz?.value, p90 = a?.measures?.f0_p90_hz?.value;
    if (!p10 || !p90 || !profile) { setToast("No pitch range for this take"); return; }
    const p = await api.saveProfile({ ...profile, comfort_range_hz: [Math.round(p10), Math.round(p90)] });
    setProfile(p);
    setToast(`Your range is now ${Math.round(p10)}–${Math.round(p90)} Hz`);
  };
  const onSaved = async (t: Take) => {
    let saved = t;
    if (starts.current && !isPrompt) saved = await api.patchTake(t.id, { read_along: { starts: starts.current, text: item.text } }).catch(() => t);
    starts.current = null;
    setTakes((xs) => [...xs, saved]);
    setToast("Saved");
  };

  return (
    <div className="vpage vstudio">
      <h1 className="sr-only">Studio</h1>
      <div className="segmented vseg" role="group" aria-label="Level">
        {texts.levels.map((l) => (
          <button key={l.id} aria-pressed={l.id === level.id} onClick={() => { setLevel(l); setItem(l.items[0]); }} title={l.subtitle} disabled={recording}>
            {l.title}
          </button>
        ))}
      </div>

      <RecordPanel
        key={`${promptId}-${latestForText.length}`}
        label={`level ${level.level} · ${level.title}`}
        hint={isPrompt ? "Answer in your own words" : undefined}
        meta={{ session_id: sessionId, role: "free", prompt_id: promptId, prompt_text: item.text }}
        live={!listening}
        band={band}
        steadiness={level.kind === "hum"}
        onStateChange={(st) => setRecording(st === "recording")}
        onSaved={(t) => void onSaved(t)}
        knob={{ label: "Next text", onTurn: () => setItem((cur) => (cur ? next(level, cur) : cur)) }}
        screen={(rec) => (
          <>
            {isPrompt
              ? <p className="readtext" aria-label={item.text}>{item.text}</p>
              : <ReadAlong text={item.text} levelId={level.id} hint={item.hint} kind={level.kind} stream={mic.stream} active={rec}
                  onStarts={(s) => { starts.current = s; }} alignment={latest?.read_along?.starts ?? null} pitch={latestPitch} />}
            {isPrompt && <p className="vtip">{item.hint}</p>}
            {listening && !rec && (
              <div className="vlive fade-in">
                <LiveReadout points={livePoints} band={band} showSteadiness={level.kind === "hum"} />
                <LiveRoll points={livePoints} band={band} height={120} />
                <p className="vlive-foot">Listening, not recording. Nothing is saved.</p>
              </div>
            )}
          </>
        )}
        keys={!listening
          ? <button className="btn-secondary" onClick={() => void startListening()} disabled={recording}>Show my pitch live</button>
          : <button className="btn-secondary" aria-pressed="true" onClick={() => setListening(false)}>Stop listening</button>}
      />
      {mic.error && <Callout kind="warn"><p>{mic.error}</p></Callout>}
      {!isPrompt && <ReadNotes text={item.text} levelId={level.id} hint={item.hint} />}

      {latest && <TakeResult take={latest} before={before} band={band} onUseRange={useRange} onUpdate={(t) => setTakes((xs) => xs.map((x) => (x.id === t.id ? t : x)))} />}

      <div className="vfoot">
        {band
          ? <a className="textlink" href="#/settings">Your range {band[0]}–{band[1]} Hz</a>
          : <a className="textlink" href="#/settings">Set a comfortable range</a>}
        <button className="textlink" onClick={() => setItem(pick(level, item.id))} disabled={recording}>Pick another at random <kbd>N</kbd></button>
      </div>

      <details className="why">
        <summary>How this works</summary>
        <div className="body">
          <p>{level.basis} {level.written_by}{level.source_url && <> <a href={level.source_url} target="_blank" rel="noreferrer">Source<Ext /></a></>}</p>
          <p style={{ margin: 0 }}>The highlighted word follows the beat of your syllables, on this computer only, with no speech recognition. It's a reading guide and can drift; tap a word to put it back. Saved takes are measured more carefully afterwards. Nothing here is graded.</p>
        </div>
      </details>
      <Toast text={toast} />
    </div>
  );
}

function TakeResult({ take, before, band, onUseRange, onUpdate }: { take: Take; before: Take | null; band: [number, number] | null; onUseRange: (t: Take) => void; onUpdate: (t: Take) => void }) {
  useTakeStatus(take, onUpdate);
  const ready = take.status === "review_ready";
  return (
    <section className="vresult fade-in" aria-labelledby="res-h">
      <div className="vresult-head">
        <h2 id="res-h">Your take</h2>
        <StatusBadge status={take.status} />
        <TakeFlags take={take} />
      </div>
      <div className={before ? "ab" : ""}>
        {before && <AudioPlayer src={before.audio_url} tag="A" label={`before · ${before.local_date ?? new Date(before.created_utc).toLocaleDateString()}`} knownDuration={before.analysis_summary?.duration_s} pitchTakeId={before.id} band={band} compact />}
        <AudioPlayer key={`${take.id}-${ready}`} src={take.audio_url} tag={before ? "B" : undefined} label="this take" knownDuration={take.analysis_summary?.duration_s} pitchTakeId={ready ? take.id : undefined} band={band} compact={!!before} />
      </div>
      {!ready && take.status === "analysis_pending" && <p className="vcap">Measuring your pitch line…</p>}
      {before && <p className="vcap">Listen to both. Which feels more like you? Your ear decides.</p>}
      <div className="vactions">
        <button className="btn-secondary vfav" onClick={() => void api.patchTake(take.id, { favourite: !take.favourite }).then(onUpdate)} aria-pressed={take.favourite}><Star on={take.favourite} />{take.favourite ? "Favourite" : "I like this one"}</button>
        {ready && <button className="btn-ghost" onClick={() => onUseRange(take)}>Use this take's range as my comfortable range</button>}
        {before && <button className="btn-ghost" onClick={() => go(`/compare?a=${before.id}&b=${take.id}`)}>Detailed comparison</button>}
      </div>
    </section>
  );
}
