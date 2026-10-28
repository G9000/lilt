import { useEffect, useState } from "react";
import { SettingsPage } from "../pages/Settings";
import { Icon } from "../components/bits";

type Pane = Parameters<typeof SettingsPage>[0]["start"];

/** Open Settings over the room or the desk, optionally at one pane ("ai" for AI connections). */
export function openSettings(pane?: Pane) {
  window.dispatchEvent(new CustomEvent("lilt:settings", { detail: pane ?? null }));
}

/**
 * Settings as its own window over everything, like System Settings: large, centred, the room or
 * the desk dimmed behind it. Escape, the red light or a click outside closes it.
 */
export function SettingsSheet() {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<Pane>(null);
  useEffect(() => {
    const on = (e: Event) => { setAt((e as CustomEvent<Pane>).detail); setOpen(true); };
    window.addEventListener("lilt:settings", on);
    return () => window.removeEventListener("lilt:settings", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);
  return (
    <>
      {/* A click outside only closes Settings: the scrim takes it, so it never also opens the
          computer, a card or the radio underneath. */}
      <div className={`ss-scrim${open ? " on" : ""}`} aria-hidden="true" onClick={() => setOpen(false)} />
      <section className={`ss${open ? " open" : ""}`} role="dialog" aria-label="Settings" aria-hidden={!open} {...({ inert: open ? undefined : "" } as object)}>
        {open && <SettingsPage start={at} onClose={() => setOpen(false)} />}
      </section>
    </>
  );
}

/** The settings button in the menu bar. */
export function SettingsButton() {
  return <button className="ds-mb-btn ss-open" onClick={() => openSettings()} aria-label="Settings">{Icon.settings}</button>;
}
