import { useEffect, useState } from "react";
import { SettingsPage } from "../pages/Settings";
import { Icon } from "../components/bits";

/** Open Settings over the room, optionally at one section ("ai" for Connect your AI). */
export function openSettings(section?: "ai") {
  window.dispatchEvent(new CustomEvent("lilt:settings", { detail: section ?? null }));
}

/**
 * Settings as a sheet that slides in from the right over the room, like Notification Center, so
 * the room's widget and menu bar can open it without walking to the desk.
 */
export function SettingsSheet() {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => { setAt((e as CustomEvent<string | null>).detail); setOpen(true); };
    window.addEventListener("lilt:settings", on);
    return () => window.removeEventListener("lilt:settings", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest(".ss, .ss-open")) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey, true); };
  }, [open]);
  // Opened at a section: bring it into view once the page has loaded.
  useEffect(() => {
    if (!open || !at) return;
    let tries = 0;
    const id = window.setInterval(() => {
      const el = document.getElementById(`st-${at}`);
      if (el || ++tries > 20) { window.clearInterval(id); el?.scrollIntoView({ block: "start", behavior: "smooth" }); }
    }, 100);
    return () => window.clearInterval(id);
  }, [open, at]);
  return (
    <>
      <div className={`nc-scrim${open ? " on" : ""}`} aria-hidden="true" />
      <section className={`ss${open ? " open" : ""}`} aria-label="Settings" aria-hidden={!open} {...({ inert: open ? undefined : "" } as object)}>
        <header className="ss-head">
          <b>Settings</b>
          <button className="ss-close" onClick={() => setOpen(false)} aria-label="Close settings">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="ss-body">{open && <SettingsPage />}</div>
      </section>
    </>
  );
}

/** The settings button in the room's menu bar. */
export function SettingsButton() {
  return <button className="ds-mb-btn ss-open" onClick={() => openSettings()} aria-label="Settings">{Icon.settings}</button>;
}
