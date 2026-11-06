const PHASES = ["idle", "checking", "up_to_date", "available", "downloading", "ready", "installing", "unconfigured"] as const;
export interface DesktopUpdate {
  current: string;
  phase: typeof PHASES[number];
  version: string | null;
  failed: boolean;
}

const active = (phase: DesktopUpdate["phase"]) => ["available", "downloading", "ready", "installing"].includes(phase);
const version = (value: unknown): value is string => typeof value === "string" && value.length <= 128 && /^\d+\.\d+\.\d+(?:[-+][\w.+-]+)?$/.test(value);

/** This is display data only; every update action stays in the bundled native window. */
export function parseDesktopUpdate(value: unknown): DesktopUpdate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  if (!version(s.current) || !PHASES.includes(s.phase as DesktopUpdate["phase"]) || typeof s.failed !== "boolean" || (s.version !== null && !version(s.version))) return null;
  const phase = s.phase as DesktopUpdate["phase"];
  return { current: s.current, phase, version: active(phase) ? s.version as string | null : null, failed: s.failed };
}

export function updateStatus(state: DesktopUpdate | null): string {
  if (!state) return "Waiting for app update status…";
  const next = state.version ? `Lilt ${state.version}` : "An update";
  const labels: Record<DesktopUpdate["phase"], string> = {
    idle: state.failed ? "Couldn't check for updates. Open app updates to try again." : "Updates not checked yet.",
    checking: "Checking for updates…",
    up_to_date: "Lilt is up to date.",
    available: `${next} is available.`,
    downloading: `Downloading ${state.version ? `Lilt ${state.version}` : "the update"}…`,
    ready: `${next} is ready to install.`,
    installing: "Updating Lilt. Your app will restart…",
    unconfigured: "Updates are not configured for this build.",
  };
  return labels[state.phase] + (state.failed && active(state.phase) ? " Open app updates for details." : "");
}

export function updateNotice(state: DesktopUpdate | null) {
  if (!state || !active(state.phase) || !state.version || state.version === state.current) return null;
  return {
    id: `app-update-${state.version}`, kind: "update" as const,
    title: `Lilt ${state.version} is available`,
    body: "See what’s new and choose when to update. Your recordings stay on this computer.",
    when: "App update", to: "lilt://updates",
  };
}
