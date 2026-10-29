/** One take at a time in this page, and across same-origin tabs where Web Locks is available. */
const BUSY = "Lilt is already recording. Stop the take in the other tab or window, then try again.";
let claimed = false;

/** Acquire before creating a take; release when MediaRecorder stops (including its audio tail). */
export async function acquireRecordingLock(): Promise<() => void> {
  if (claimed) throw new Error(BUSY);
  claimed = true; // Also protects double starts while the browser request is pending.
  let endHold = () => {};
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    claimed = false;
    endHold();
  };
  try {
    const locks = globalThis.navigator?.locks;
    if (locks) {
      await new Promise<void>((resolve, reject) => {
        void locks.request("lilt-recording", { mode: "exclusive", ifAvailable: true }, async (lock) => {
          if (!lock) { reject(new Error(BUSY)); return; }
          await new Promise<void>((done) => { endHold = done; resolve(); });
        }).catch(reject);
      });
    }
    return release;
  } catch (error) {
    release();
    throw error;
  }
}
