import { useEffect, useState } from "react";
import { parseDesktopUpdate } from "./desktopUpdate";

type DesktopWindow = Window & { __LILT_DESKTOP__?: boolean; __LILT_APP_UPDATE__?: unknown };
export const isDesktop = () => (window as DesktopWindow).__LILT_DESKTOP__ === true;
const read = () => isDesktop() ? parseDesktopUpdate((window as DesktopWindow).__LILT_APP_UPDATE__) : null;

export function useDesktopUpdate() {
  const [status, setStatus] = useState(read);
  useEffect(() => {
    const refresh = () => setStatus(read());
    window.addEventListener("lilt:app-update", refresh);
    // Native delivery can happen between render and subscription, or before React loads.
    refresh();
    return () => window.removeEventListener("lilt:app-update", refresh);
  }, []);
  return status;
}

export function openAppUpdates() {
  if (isDesktop()) window.location.href = "lilt://updates";
}
