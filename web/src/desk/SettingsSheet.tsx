import { roomStyles } from "./roomStyles";
import { lazy, useEffect, useState } from "react";
import type { SettingsPage as SettingsComponent } from "../pages/Settings";
import { Deferred } from "../components/Deferred";
import { Icon } from "../components/bits";

const SettingsPage = lazy(() => import("../pages/Settings").then(m => ({ default: m.SettingsPage })));
type Pane = Parameters<typeof SettingsComponent>[0]["start"];

/** Open Settings over the room or the desk, optionally at one pane ("ai" for AI connections, "about" for About Lilt). */
export function openSettings(pane?: Pane) {
  window.dispatchEvent(new CustomEvent("lilt:settings", { detail: pane ?? null }));
}

/**
 * Settings as its own window over everything, like System Settings: large, centred, the room or
 * the desk dimmed behind it. Escape, the red light, Done (on phones), a click outside or going to
 * another page closes it.
 */
export function SettingsSheet() {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<Pane>(null);
  useEffect(() => {
    // The page it opened over; `#/settings` swaps itself for `#/` as it opens, which isn't leaving.
    let openedOn = "";
    const on = (e: Event) => { openedOn = window.location.hash; setAt((e as CustomEvent<Pane>).detail); setOpen(true); };
    const away = () => { if (window.location.hash !== openedOn) setOpen(false); };
    window.addEventListener("lilt:settings", on);
    window.addEventListener("hashchange", away);
    return () => { window.removeEventListener("lilt:settings", on); window.removeEventListener("hashchange", away); };
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
      <div className={[`ss-scrim${open ? " on" : ""}`, roomStyles["ss-scrim"]].join(" ")} aria-hidden="true" onClick={() => setOpen(false)} />
      <section className={[`ss${open ? " open" : ""}`, roomStyles["ss"]].join(" ")} role="dialog" aria-label="Settings" aria-hidden={!open} {...({ inert: open ? undefined : "" } as object)}>
        {/* On a phone the red light is too small to aim for, so Done sits where a thumb expects it. */}
        {open && <button type="button" className="absolute top-[6px] right-[8px] z-[5] hidden min-h-[44px] px-[14px] rounded-[12px] font-semibold text-accent-ink max-[700px]:inline-flex" onClick={() => setOpen(false)}>Done</button>}
        {open && <Deferred><SettingsPage start={at} onClose={() => setOpen(false)} /></Deferred>}
      </section>
    </>
  );
}

/** The settings button in the menu bar. */
export function SettingsButton() {
  return <button className={["ds-mb-btn ss-open", roomStyles["ds-mb-btn"]].join(" ")} onClick={() => openSettings()} aria-label="Settings" data-tip="Settings">{Icon.settings}</button>;
}
