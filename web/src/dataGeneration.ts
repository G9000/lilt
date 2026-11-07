/** Keep writes tied to the data that was loaded, even if another tab restores a backup. */
export function createDataClient(send: typeof fetch) {
  let generation: string | null = null;
  let discovery: Promise<void> | null = null;
  let resetId: string | null = null;
  let resetSeen = false;
  let resetHandler: ((id: string, url: string, method: string) => void) | null = null;
  const observe = (response: Response, url = "/healthz", method = "GET") => {
    const value = response.headers.get("X-Lilt-Generation");
    if (generation === null && value && /^[a-zA-Z0-9_-]{1,128}$/.test(value)) generation = value;
    const marker = response.headers.get("X-Lilt-Reset");
    if (marker && /^[a-zA-Z0-9_-]{1,128}$/.test(marker) && marker !== resetId) {
      resetId = marker;
      if (resetHandler) { resetSeen = true; resetHandler(marker, url, method); }
    }
  };
  const discover = () => discovery ??= send("/healthz").then(observe).catch(error => { discovery = null; throw error; });
  return {
    generation: () => generation,
    resetId: () => resetId,
    watchReset(id: string | null, handler: (id: string, url: string, method: string) => void) { resetId = id; resetHandler = handler; },
    async fetch(url: string, init: RequestInit = {}, originalGeneration?: string | null) {
      const mutating = !["GET", "HEAD", "OPTIONS"].includes((init.method ?? "GET").toUpperCase());
      if (mutating && originalGeneration === undefined && generation === null) await discover();
      if (mutating && resetSeen) throw Object.assign(new Error("Lilt data was reset. Reload before making changes."), { fatal: true });
      const headers = new Headers(init.headers);
      const expected = originalGeneration === undefined ? generation : originalGeneration;
      if (mutating && expected !== null) headers.set("X-Lilt-Generation", expected);
      const response = await send(url, { ...init, headers });
      observe(response, url, (init.method ?? "GET").toUpperCase());
      return response;
    },
  };
}

export const dataClient = createDataClient((...args) => fetch(...args));
