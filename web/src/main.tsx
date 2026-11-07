import React from "react";
import { createRoot } from "react-dom/client";
import { dataClient } from "./dataGeneration";
import { clearBrowserAfterReset, watchBrowserReset, withResetBrowserLock, RESET_PENDING_KEY } from "./resetBrowserData";
import "./styles.css";

const host = document.getElementById("root")!;
const marker = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value);

// Keep this screen independent of App imports: several room modules read their
// stored choices when imported, and must only do that after cleanup completes.
function notice(title: string, message: string, action?: { label: string; run: () => void }) {
  host.replaceChildren();
  const section = document.createElement("main");
  section.className = "mx-auto grid max-w-xl gap-4 p-6 text-[var(--ink)]";
  section.setAttribute("role", "status");
  const heading = document.createElement("h1"); heading.className = "text-2xl font-semibold"; heading.textContent = title;
  const paragraph = document.createElement("p"); paragraph.textContent = message;
  section.append(heading, paragraph);
  if (action) {
    const button = document.createElement("button");
    button.className = "min-h-11 rounded-xl bg-[var(--fill)] px-4 py-2 text-[var(--ink)]";
    button.textContent = action.label; button.addEventListener("click", action.run); section.append(button);
  }
  host.append(section);
}

async function start() {
  const url = new URL(location.href);
  let resetId: string | null = null;
  let pending = false;
  let complete = false;
  let clearing = false;
  notice("Opening Lilt", "Checking the connection…");
  try {
    // Read the marker inside the cleanup lock. A delayed older response must
    // never clear choices another tab saved after completing a newer reset.
    const { response, result } = await withResetBrowserLock(async () => {
      const response = await fetch("/api/reset", { cache: "no-store" });
      const result = await response.json().catch(() => null);
      const header = response.headers.get("X-Lilt-Reset");
      resetId = marker(header) ? header : marker(result?.reset_id) ? result.reset_id : null;
      pending = result?.pending_cleanup === true;
      if (resetId) {
        try { localStorage.setItem(RESET_PENDING_KEY, resetId); } catch { /* Cleanup reports unavailable storage below. */ }
        notice("Clearing browser data", "Checking Lilt’s saved browser data…");
        clearing = true;
        await clearBrowserAfterReset(resetId, true);
        clearing = false;
      }
      return { response, result };
    });
    if (!response.ok && response.status !== 404 && !pending) throw new Error(result?.error ?? "Lilt couldn’t check whether your data was reset. Check the connection and try again.");
    complete = url.searchParams.get("lilt-reset") === resetId && url.searchParams.get("lilt-reset-result") === "complete";
  } catch (error) {
    if (resetId || pending || clearing || url.searchParams.has("lilt-reset")) {
      notice(clearing ? "Browser cleanup is unfinished" : "Lilt couldn’t connect", error instanceof Error ? error.message : "Lilt couldn’t finish checking its browser data.", { label: clearing ? "Retry browser cleanup" : "Try again", run: () => void start() });
      return;
    }
    // Keep the room available when the server is offline. On reconnection the
    // data client checks the reset marker before allowing any mutation.
  }
  if (pending) {
    notice("Reset cleanup is unfinished", "The reset did not finish. Restart the Lilt server or installed app to complete recovery before making changes.", { label: "Check again", run: () => void start() });
    return;
  }
  if (url.searchParams.has("lilt-reset")) {
    notice(complete ? "Lilt data has been reset" : "Browser data has been cleared", complete ? "Your saved Lilt data, managed backups and this address’s browser data have been deleted. Downloaded copies elsewhere remain." : "This browser has cleared the data from before the reset. Lilt is ready to open.", { label: "Open Lilt", run: () => {
      url.searchParams.delete("lilt-reset"); url.searchParams.delete("lilt-reset-result"); url.hash = "/"; location.replace(url.href);
    } });
    return;
  }
  watchBrowserReset(dataClient, resetId);
  const [{ App }, { finishSignIn }] = await Promise.all([import("./App"), import("./desk/spotifyAuth")]);
  const error = await finishSignIn();
  if (error) console.warn("Spotify sign-in:", error);
  createRoot(host).render(<React.StrictMode><App /></React.StrictMode>);
}

void start();
