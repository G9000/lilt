import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { closeDelayLine, delayedStream, openMic, wakeDelayLines } from "../recorder";

interface MicCtx {
  stream: MediaStream | null;
  error: string | null;
  request: (deviceId?: string) => Promise<MediaStream | null>;
  devices: MediaDeviceInfo[];
  deviceId: string | undefined;
  release: () => void;
}

const Ctx = createContext<MicCtx | null>(null);

export function MicProvider({ children }: { children: ReactNode }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(() => {
    try { return localStorage.getItem("lilt.mic") ?? undefined; } catch { return undefined; }
  });

  // The open stream lives in a ref too, so overlapping requests (a click while the auto-open is
  // pending, StrictMode's double effects) share one getUserMedia call and never orphan a stream.
  const current = useRef<MediaStream | null>(null);
  const pending = useRef<Promise<MediaStream | null> | null>(null);
  const chosenId = useRef(deviceId);
  chosenId.current = deviceId;

  const request = useCallback(async (id?: string): Promise<MediaStream | null> => {
    if (pending.current) {
      if (id === undefined) return pending.current;
      await pending.current;
    }
    const open = (async () => {
      try {
        const old = current.current;
        if (old) { closeDelayLine(old); old.getTracks().forEach((t) => t.stop()); current.current = null; }
        const s = await openMic(id ?? chosenId.current);
        current.current = s;
        delayedStream(s); // start the half-second pre-roll now, so the first take has it too
        setStream(s);
        setError(null);
        const chosen = s.getAudioTracks()[0]?.getSettings().deviceId;
        if (chosen) { setDeviceId(chosen); try { localStorage.setItem("lilt.mic", chosen); } catch { /* ignore */ } }
        const all = await navigator.mediaDevices.enumerateDevices();
        setDevices(all.filter((d) => d.kind === "audioinput"));
        return s;
      } catch (e: any) {
        if (!current.current) setStream(null); // the old stream was already stopped above
        const name = e?.name;
        setError(
          name === "NotAllowedError" ? "Microphone access was blocked. Allow the microphone for this page in your browser's site settings, then try again."
          : name === "NotFoundError" || name === "OverconstrainedError" ? "No microphone was found. Connect one, or pick another input."
          : name === "NotReadableError" ? "The microphone is busy in another app. Close it there and try again."
          : e?.message ?? "Couldn't open the microphone."
        );
        return current.current;
      } finally {
        pending.current = null;
      }
    })();
    pending.current = open;
    return open;
  }, []);

  // Any click or key wakes the pre-roll, so it's already filling when you press Record.
  useEffect(() => {
    const wake = () => wakeDelayLines();
    window.addEventListener("pointerdown", wake, true);
    window.addEventListener("keydown", wake, true);
    return () => { window.removeEventListener("pointerdown", wake, true); window.removeEventListener("keydown", wake, true); };
  }, []);

  const release = useCallback(() => {
    const s = current.current;
    if (s) { closeDelayLine(s); s.getTracks().forEach((t) => t.stop()); }
    current.current = null;
    setStream(null);
  }, []);

  return <Ctx.Provider value={{ stream, error, request, devices, deviceId, release }}>{children}</Ctx.Provider>;
}

export function useMic() {
  return useContext(Ctx)!;
}
