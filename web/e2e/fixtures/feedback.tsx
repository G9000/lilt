import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { api, Take } from "../../src/api";
import { TakeInsight, TakeResult, ResonanceNote, PitchScale } from "../../src/components/DeckPitch";

const root = createRoot(document.getElementById("root")!);
const take = (id: string) => ({ id, status: "review_ready", prompt_id: id,
  created_utc: "2026-11-03T00:00:00Z", audio_url: "",
  analysis_summary: { f0_median_hz: 200, formant_f2_median_hz: 1800 },
} as Take);
const pending = new Promise<never>(() => {});
api.analysis = async (id) => id === "first" ? {
  measures: { f0_median_hz: { value: 200 }, f0_p10_p90_span_st: { value: 2 } },
  contour: { f0_hz: Array(150).fill(200), time_step: 0.01 }, quality_flags: [],
} : pending;
api.take = async (id) => id === "first" ? take(id) : pending;
api.history = async (params) => params.prompt_id === "first" ? { takes: [] } as any : pending;
api.profile = async () => ({ show_pitch_scale: true } as any);
api.texts = async () => ({ pitch_reference: { men_mean: 115, men_sd: 21, women_mean: 199, women_sd: 28, overlap_low: 145, overlap_high: 165, source: "Fixture" } } as any);

Object.assign(window, { feedbackTest: {
  render(id: string) {
    flushSync(() => root.render(<>
      <div id="insight"><TakeInsight take={take(id)} band={null} /></div>
      <div id="result"><TakeResult take={take(id)} band={null} /></div>
      <div id="resonance"><ResonanceNote take={take(id)} /></div>
      <div id="scale"><PitchScale median={200} /></div>
    </>));
  },
} });
