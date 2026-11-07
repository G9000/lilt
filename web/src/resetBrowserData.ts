// These are acknowledgements, not practice data. Keep them across cleanup so a
// later visit does not erase choices made after the reset.
export const RESET_MARKER_KEY = "lilt.reset.marker";
export const RESET_PENDING_KEY = "lilt.reset.pending";
export const RESET_CONFIRMATION = "DELETE ALL DATA";

type BrowserStorage = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">;
interface ResetStores {
  local: BrowserStorage;
  session: BrowserStorage;
  deleteCapture: () => Promise<unknown>;
  deleteMonitorMedia: () => Promise<unknown>;
}

export function clearLiltStorage(storage: BrowserStorage) {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
  for (const key of keys) {
    if (key?.startsWith("lilt.") && key !== RESET_MARKER_KEY && key !== RESET_PENDING_KEY) storage.removeItem(key);
  }
}

export async function clearResetBrowserData(id: string, stores: ResetStores) {
  // Each tab owns its session storage; the other stores are shared by this origin.
  if (stores.session.getItem(RESET_MARKER_KEY) !== id) {
    clearLiltStorage(stores.session);
    stores.session.setItem(RESET_MARKER_KEY, id);
  }
  if (stores.local.getItem(RESET_MARKER_KEY) === id) {
    if (stores.local.getItem(RESET_PENDING_KEY) === id) stores.local.removeItem(RESET_PENDING_KEY);
    return;
  }
  clearLiltStorage(stores.local);
  const results = await Promise.allSettled([stores.deleteCapture(), stores.deleteMonitorMedia()]);
  const failed = results.find(result => result.status === "rejected");
  if (failed?.status === "rejected") throw failed.reason;
  stores.local.setItem(RESET_MARKER_KEY, id);
  stores.local.removeItem(RESET_PENDING_KEY);
}

function deleteCapture() {
  if (!globalThis.indexedDB) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("lilt-capture");
    const timeout = setTimeout(() => reject(new Error("Recording storage is still open. Close other Lilt windows, then retry browser cleanup.")), 10000);
    request.onsuccess = () => { clearTimeout(timeout); resolve(); };
    request.onerror = () => { clearTimeout(timeout); reject(new Error("This browser couldn’t clear its saved recording chunks. Retry browser cleanup.")); };
    request.onblocked = () => { clearTimeout(timeout); reject(new Error("Recording storage is still open. Close other Lilt windows, then retry browser cleanup.")); };
  });
}

export function withResetBrowserLock<T>(action: () => Promise<T>) {
  return navigator.locks ? navigator.locks.request("lilt.room.appearance", action) : action();
}

export function clearBrowserAfterReset(id: string, lockHeld = false) {
  const clear = () => clearResetBrowserData(id, {
    local: localStorage, session: sessionStorage, deleteCapture,
    deleteMonitorMedia: () => globalThis.caches ? caches.delete("lilt-monitor-media-v1") : Promise.resolve(),
  });
  // Match monitor uploads' lock so an upload finishing in another tab cannot
  // put its media back while cleanup is deleting the cache.
  return lockHeld ? clear() : withResetBrowserLock(clear);
}

export function reloadForReset(id: string, outcome: "complete" | "incomplete" | "unknown" = "unknown") {
  try { localStorage.setItem(RESET_PENDING_KEY, id); } catch { /* The server marker also reaches each tab on its next request. */ }
  const url = new URL(location.href);
  url.searchParams.set("lilt-reset", id);
  url.searchParams.set("lilt-reset-result", outcome);
  // Unload every module before cleanup: room stores and pending callbacks must
  // not repopulate storage from their old in-memory state.
  location.replace(url.href);
}

export function watchBrowserReset(client: {
  watchReset: (id: string | null, handler: (id: string, url: string, method: string) => void) => void;
  fetch: (url: string, init: RequestInit) => Promise<Response>;
}, resetId: string | null) {
  client.watchReset(resetId, (id, path, method) => {
    // Read the destructive response before navigating so a partial deletion is
    // never presented as success. All other new-marker responses reload now.
    if (path !== "/api/reset" || method !== "POST") reloadForReset(id);
  });
  window.addEventListener("storage", event => {
    if ((event.key === RESET_PENDING_KEY || event.key === RESET_MARKER_KEY) && event.newValue && /^[a-zA-Z0-9_-]{1,128}$/.test(event.newValue) && event.newValue !== resetId) reloadForReset(event.newValue);
  });
  window.addEventListener("focus", () => { void client.fetch("/healthz", { cache: "no-store" }).catch(() => {}); });
}
