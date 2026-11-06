/** Keep writes tied to the data that was loaded, even if another tab restores a backup. */
export function createDataClient(send: typeof fetch) {
  let generation: string | null = null;
  let discovery: Promise<void> | null = null;
  const observe = (response: Response) => {
    const value = response.headers.get("X-Lilt-Generation");
    if (generation === null && value && /^[a-zA-Z0-9_-]{1,128}$/.test(value)) generation = value;
  };
  const discover = () => discovery ??= send("/healthz").then(observe).catch(error => { discovery = null; throw error; });
  return {
    generation: () => generation,
    async fetch(url: string, init: RequestInit = {}, originalGeneration?: string | null) {
      const mutating = !["GET", "HEAD", "OPTIONS"].includes((init.method ?? "GET").toUpperCase());
      if (mutating && originalGeneration === undefined && generation === null) await discover();
      const headers = new Headers(init.headers);
      const expected = originalGeneration === undefined ? generation : originalGeneration;
      if (mutating && expected !== null) headers.set("X-Lilt-Generation", expected);
      const response = await send(url, { ...init, headers });
      observe(response);
      return response;
    },
  };
}

export const dataClient = createDataClient((...args) => fetch(...args));
