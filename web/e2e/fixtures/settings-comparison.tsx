import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { api, Profile, Take, Comparison } from "../../src/api";
import { PracticeSettings, useProfileDraft } from "../../src/pages/Settings";
import { ComparePage } from "../../src/pages/Compare";

const root = createRoot(document.getElementById("root")!);
const profile = {
  goal: { summary: "My voice", descriptors: [] }, session_minutes: 5,
  comparison_window_days: 14, comfort_range_hz: null, reminder_time: null,
} as Profile;
const writes: { profile: Profile; resolve: () => void; reject: () => void }[] = [];
const comparisons = new Map<string, { resolve: () => void; reject: () => void }>();
const analyses = new Map<string, { resolve: () => void }>();
let stored = profile;
api.profile = async () => stored;
api.texts = async () => ({ levels: [] } as any);
api.saveProfile = (next) => new Promise((resolve, reject) => writes.push({
  profile: next,
  resolve: () => { stored = next; resolve(next); },
  reject: () => reject(new Error("Save failed")),
}));
api.take = async (id) => ({ id, prompt_text: id, created_utc: "2026-11-04T00:00:00Z", audio_url: "", role: "exercise" } as Take);
api.compare = (a, b) => new Promise((resolve, reject) => comparisons.set(a, {
  resolve: () => resolve({ outcome: "difference_noted", reasons: [`Comparison ${a} / ${b}`], limitations: [], measures: [], method_status: "descriptive" } as unknown as Comparison),
  reject: () => reject(new Error(`Comparison ${a} failed`)),
}));
api.analysis = (id) => new Promise((resolve) => analyses.set(id, {
  resolve: () => resolve({ measures: { f0_median_hz: { unavailable_reason: `${id} analysis` } } } as any),
}));

function Draft() {
  const draft = useProfileDraft();
  (window as any).draft = draft;
  return <p id="save-state">{draft.saved}</p>;
}

Object.assign(window, { regression: {
  writes, comparisons, analyses,
  stored: () => stored,
  render(view: "draft" | "settings" | "compare", a = "", b = "") {
    flushSync(() => root.render(view === "draft" ? <Draft /> : view === "settings" ? <PracticeSettings /> : <ComparePage a={a} b={b} />));
  },
  clear() { flushSync(() => root.render(null)); },
} });
