/**
 * Who is listening to the microphone right now (recording a take, or showing live pitch).
 * The lo-fi radio steps aside while anyone is, so music never reaches a recording or a pitch reading.
 */
const users = new Set<number>();
let next = 0;

export const micInUse = () => users.size > 0;

/** Claim the microphone; call the returned function to release it (safe to call twice). */
export function claimMic(): () => void {
  const id = ++next;
  users.add(id);
  emit();
  return () => { if (users.delete(id)) emit(); };
}

function emit() {
  window.dispatchEvent(new CustomEvent("lilt:mic", { detail: users.size > 0 }));
}
