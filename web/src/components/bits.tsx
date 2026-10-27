import { ReactNode, useEffect, useState } from "react";
import { STATE_LABEL, STATUS_LABEL, SkillCard, Take, TakeStatus } from "../api";

const STATUS_ICON: Record<string, ReactNode> = {
  saved: <path d="M3.5 8.5l3 3 6-7" />,
  review_ready: <path d="M3.5 8.5l3 3 6-7" />,
  analysis_pending: <path d="M4 8h.01M8 8h.01M12 8h.01" strokeWidth="2.4" />,
  analysis_failed: <path d="M8 3.5v5.5M8 12.2h.01" strokeWidth="2" />,
  error: <path d="M8 3.5v5.5M8 12.2h.01" strokeWidth="2" />,
  saving: <path d="M8 13V3.5M4.5 7L8 3.5 11.5 7" />,
};

export function StatusBadge({ status }: { status: TakeStatus | "idle" | "error" }) {
  if (status === "idle") return null;
  const cls: Record<string, string> = {
    recording: "rec", saving: "saving", saved: "saved", analysis_pending: "pending",
    review_ready: "saved", analysis_failed: "failed", error: "failed",
  };
  const text = status === "error" ? "Not saved yet" : STATUS_LABEL[status];
  return (
    <span className={`badge ${cls[status]}`} role="status">
      {STATUS_ICON[status] && (
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{STATUS_ICON[status]}</svg>
      )}
      {text}
    </span>
  );
}

/** A skill's state as a small drawn mark and its words; colour comes from `.skill-state.<state>`. */
export function SkillState({ state }: { state: SkillCard["state"] }) {
  const mark: Record<SkillCard["state"], ReactNode> = {
    not_assessed: <circle cx="8" cy="8" r="5.5" strokeDasharray="2.2 2.2" />,
    more_evidence: <><circle cx="8" cy="8" r="5.5" /><path d="M5.5 8h.01M8 8h.01M10.5 8h.01" strokeWidth="2.2" /></>,
    practice_focus: <><circle cx="8" cy="8" r="5.5" /><circle cx="8" cy="8" r="2" /></>,
    stable: <path d="M3.5 6.5h9M3.5 9.5h9" />,
    progress: <path d="M4 11.5l7-7M5.5 4.5H11v5.5" />,
    recording_issue: <><path d="M8 2.5l6 10.5H2z" /><path d="M8 6.5v3M8 11.2h.01" /></>,
  };
  return (
    <span className={`skill-state ${state}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{mark[state]}</svg>
      {STATE_LABEL[state]}
    </span>
  );
}

/** A take's name in plain words: "Reference, before the session". */
export function takeName(t: Take) {
  const role = t.role.replace(/_/g, " ");
  const when = t.phase === "pre" ? ", before the session" : t.phase === "post" ? ", after the session" : t.phase !== "none" ? ` (${t.phase})` : "";
  return role.charAt(0).toUpperCase() + role.slice(1) + when;
}

export function TakeFlags({ take }: { take: Take }) {
  const flags = take.analysis_summary?.quality_flags ?? [];
  return (
    <>
      {take.completeness === "missing_tail" && <span className="badge failed">End missing</span>}
      {take.completeness === "interrupted" && <span className="badge failed">Interrupted, saved part kept</span>}
      {flags.map((f) => <span key={f.code} className="badge failed" title={f.message}>{f.code.replace(/_/g, " ")}</span>)}
    </>
  );
}

/** Drawn marks for the callout icons pages pass as short strings ("!", "→", "✓"). */
const CALLOUT_ICON: Record<string, ReactNode> = {
  "!": <><circle cx="8" cy="8" r="6.25" /><path d="M8 4.9v3.6M8 11.1h.01" /></>,
  "→": <path d="M3 8h10M9 4l4 4-4 4" />,
  "✓": <path d="M3.5 8.5l3 3 6-7" />,
  i: <><circle cx="8" cy="8" r="6.25" /><path d="M8 7.4v3.8M8 4.9h.01" /></>,
};

export function Callout({ kind = "info", icon, children }: { kind?: "info" | "warn" | "ok" | "pink"; icon?: string; children: ReactNode }) {
  return (
    <div className={`callout ${kind}`}>
      {icon && (
        <span className="ico" aria-hidden="true">
          {CALLOUT_ICON[icon]
            ? <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", marginTop: 3 }}>{CALLOUT_ICON[icon]}</svg>
            : icon}
        </span>
      )}
      <div>{children}</div>
    </div>
  );
}

export function Steps({ total, current }: { total: number; current: number }) {
  return (
    <div className="steps" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => <span key={i} className={i < current ? "done" : i === current ? "now" : ""} />)}
    </div>
  );
}

export function Choices({ name, options, value, onChange }: { name: string; options: { id: string; label: string }[]; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <div className="choices">
      {options.map((o) => (
        <label className="choice" key={o.id} style={{ margin: 0, fontWeight: "inherit" }}>
          <input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

export function Toast({ text }: { text: string | null }) {
  return text ? <div className="toast" role="status">{text}</div> : null;
}

export function useToast(): [string | null, (s: string) => void] {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => setT(null), 2600);
    return () => clearTimeout(id);
  }, [t]);
  return [t, setT];
}

/** Poll a take until analysis settles. */
export function useTakeStatus(take: Take | null, onUpdate: (t: Take) => void) {
  useEffect(() => {
    if (!take || !["analysis_pending", "saved", "saving"].includes(take.status)) return;
    const id = setInterval(async () => {
      const r = await fetch(`/api/takes/${take.id}`);
      if (r.ok) onUpdate(await r.json());
    }, 1500);
    return () => clearInterval(id);
  }, [take?.id, take?.status]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function PitchTrace({ analysis }: { analysis: any }) {
  const f0: (number | null)[] = analysis?.contour?.f0_hz ?? [];
  const step: number = analysis?.contour?.time_step ?? 0.01;
  const t0: number = analysis?.contour?.t0 ?? 0;
  const vals = f0.filter((v): v is number => v !== null);
  if (!Array.isArray(f0) || vals.length < 3) {
    return <p className="small muted">No pitch trace: {analysis?.measures?.f0_median_hz?.unavailable_reason?.replace(/_/g, " ") ?? "not enough voiced sound"}.</p>;
  }
  const st = (hz: number) => 12 * Math.log2(hz / 100);
  const lo = Math.floor(Math.min(...vals.map(st))) - 1, hi = Math.ceil(Math.max(...vals.map(st))) + 1;
  const dur = t0 + f0.length * step;
  const W = 600, H = 120;
  const x = (i: number) => ((t0 + i * step) / dur) * W;
  const y = (hz: number) => H - ((st(hz) - lo) / (hi - lo)) * H;
  const paths: string[] = [];
  let cur = "";
  f0.forEach((v, i) => {
    if (v === null) { if (cur) paths.push(cur); cur = ""; return; }
    cur += `${cur ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });
  if (cur) paths.push(cur);
  const med = analysis?.measures?.f0_median_hz?.value;
  return (
    <figure className="pitch" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Pitch trace. Median ${med ? med.toFixed(0) + " Hz" : "unavailable"}. Gaps are unvoiced or silent parts.`}>
        {med && <line x1="0" x2={W} y1={y(med)} y2={y(med)} stroke="var(--muted)" strokeDasharray="4 4" strokeWidth="1" />}
        {paths.map((d, i) => <path key={i} d={d} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
      </svg>
      <figcaption className="small muted">
        Pitch over time (log scale). Gaps are unvoiced or silent parts; no line is drawn through them. Dashed: median{med ? ` ${med.toFixed(0)} Hz` : ""}. Descriptive only.
      </figcaption>
    </figure>
  );
}

export const Icon = {
  star: <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true"><path d="M8 1.9l1.85 3.85 4.2.55-3.08 2.9.78 4.17L8 11.33 4.25 13.37l.78-4.17L1.95 6.3l4.2-.55z" /></svg>,
  play: <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M4.5 2.8l9 5.2-9 5.2z" fill="currentColor" /></svg>,
  back: <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>,
  chevron: <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>,
  download: <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 2.5v8M4.5 7.5L8 11l3.5-3.5M3 13.5h10" /></svg>,
  studio: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10" /></svg>,
  texts: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 5h14M5 10h14M5 15h9M5 20h6" /></svg>,
  sun: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>,
  auto: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" /></svg>,
  today: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><circle cx="12" cy="12" r="4" /></svg>,
  progress: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 19h16M6 15l4-4 3 3 5-6" /></svg>,
  history: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4M12 8v4l3 2" /></svg>,
  library: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 4h4v16H5zM10 4h4v16h-4zM15 5l3.5-1 3 15-3.5 1z" /></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>,
};
