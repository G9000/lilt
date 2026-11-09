const PHASES = ["idle", "checking", "up_to_date", "available", "downloading", "ready", "installing", "unconfigured"] as const;
export interface DesktopUpdate {
  current: string;
  phase: typeof PHASES[number];
  version: string | null;
  failed: boolean;
  /** What went wrong, in Lilt's words. */
  error: string | null;
  /** The offered release's notes. */
  notes: string | null;
  /** Whole percent downloaded, once the size is known. */
  progress: number | null;
}

/** A step the app can take next, asked for with `requestUpdate`. */
export type UpdateStep = "check" | "download" | "install";

const active = (phase: DesktopUpdate["phase"]) => ["available", "downloading", "ready", "installing"].includes(phase);
const version = (value: unknown): value is string => typeof value === "string" && value.length <= 128 && /^\d+\.\d+\.\d+(?:[-+][\w.+-]+)?$/.test(value);
// Older apps don't send the newer fields; missing reads as nothing to show.
const text = (value: unknown, max: number): string | null | undefined =>
  value === undefined || value === null ? null : typeof value === "string" && value.length <= max ? value : undefined;

/** The status the desktop app publishes into this page. Anything malformed reads as no status. */
export function parseDesktopUpdate(value: unknown): DesktopUpdate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  if (!version(s.current) || !PHASES.includes(s.phase as DesktopUpdate["phase"]) || typeof s.failed !== "boolean" || (s.version !== null && !version(s.version))) return null;
  const error = text(s.error, 1000), notes = text(s.notes, 4000);
  const progress = s.progress === undefined || s.progress === null ? null
    : typeof s.progress === "number" && Number.isInteger(s.progress) && s.progress >= 0 && s.progress <= 100 ? s.progress : undefined;
  if (error === undefined || notes === undefined || progress === undefined) return null;
  const phase = s.phase as DesktopUpdate["phase"];
  return {
    current: s.current, phase, version: active(phase) ? s.version as string | null : null, failed: s.failed,
    error: s.failed ? error : null, notes: active(phase) ? notes : null, progress: phase === "downloading" ? progress : null,
  };
}

export function updateStatus(state: DesktopUpdate | null): string {
  if (!state) return "Waiting for app update status…";
  const next = state.version ? `Lilt ${state.version}` : "An update";
  const labels: Record<DesktopUpdate["phase"], string> = {
    idle: state.failed ? "Couldn't check for updates." : "Updates not checked yet.",
    checking: "Checking for updates…",
    up_to_date: "Lilt is up to date.",
    available: `${next} is available.`,
    downloading: `Downloading ${state.version ? `Lilt ${state.version}` : "the update"}…${state.progress !== null ? ` ${state.progress}%` : ""}`,
    ready: `${next} is downloaded and ready to install.`,
    installing: "Updating Lilt. It will close and open again in a moment…",
    unconfigured: "Updates are not configured for this build.",
  };
  return labels[state.phase];
}

/** The one thing to do next, as a button: check, download or install. None while a step runs. */
export function nextUpdateStep(state: DesktopUpdate | null): { step: UpdateStep; label: string } | null {
  if (!state) return null;
  if (state.phase === "idle" || state.phase === "up_to_date") return { step: "check", label: "Check for updates" };
  if (state.phase === "available") return { step: "download", label: state.version ? `Download Lilt ${state.version}` : "Download the update" };
  if (state.phase === "ready") return { step: "install", label: "Install and restart" };
  return null;
}

/** The update in the notifications: one notice per version that follows it from offer to install. */
export function updateNotice(state: DesktopUpdate | null) {
  if (!state || !active(state.phase) || !state.version || state.version === state.current) return null;
  const v = `Lilt ${state.version}`;
  const [title, body] = state.phase === "downloading"
    ? [`Downloading ${v}`, `${state.progress !== null ? `${state.progress}% so far. ` : ""}You can keep practising.`]
    : state.phase === "ready" ? [`${v} is ready to install`, "Install it from Settings → Updates once your take is saved. Lilt opens again on its own."]
    : state.phase === "installing" ? ["Updating Lilt", "Lilt closes, updates and opens again in a moment."]
    : [`${v} is available`, "Update from Settings → Updates when you're ready. Your recordings stay on this computer."];
  return { id: `app-update-${state.version}`, kind: "update" as const, title, body, when: "App update", to: "/settings/updates" };
}
