// The version you're running and its notes, read from whats-new.md (the page Practice shows at
// #/studio/whats-new). Add the next release at the top of that file as `## <version> · <date>`.
import notes from "./whats-new.md?raw";

export const WHATS_NEW = notes;

/** The newest release: its version ("0.2") and date, from the first `## ` heading. */
export const CURRENT = (() => {
  const m = /^##\s+(\S+)\s*·\s*(.+)$/m.exec(notes);
  return { version: m?.[1] ?? "", date: m?.[2]?.trim() ?? "" };
})();
