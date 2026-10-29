// Typed client for the Lilt server API.

export type Signal = "target_met" | "target_not_met" | "unsure" | "info" | "comfort_stop";

export interface Cue { id: string; text: string; use_when: string }
export interface QOption { id: string; label: string; signal: Signal }
export interface CheckQuestion { id: string; text: string; options: QOption[] }
export interface LadderStep { id: string; text: string; recordable: boolean; spontaneous: boolean }
export interface Variant { id: string; label: string }

export interface Exercise {
  id: string;
  version: number;
  title: string;
  areas: string[];
  primary_area: string;
  stage: string;
  purpose: string;
  instructions: string[];
  primary_cue: { id: string; text: string };
  cues: Cue[];
  practice_task: { prompt_id: string; prompt_text: string; duration_hint_s: number; variants: Variant[] };
  check_questions: CheckQuestion[];
  ladder?: LadderStep[];
  dose_guidance: { text: string; from_source: boolean } | null;
  progression_rule?: { text: string; source_basis: string };
  expected_observations: string[];
  common_misunderstandings: string[];
  stop_conditions: string[];
  adaptations: string[];
  limitations: string[];
  source: { url: string; organization: string; title: string; section: string; issued: string | null; date_checked: string };
  license_note: string;
  review: { status: string; reviewer: string; clinician_reviewed: boolean; notes: string };
  examples: { kind: string; label: string; url: string }[];
  next: string[];
}

export interface Plan {
  version: number;
  created_utc: string;
  author: string;
  exercise_id: string;
  exercise_version: number;
  focus_area: string;
  cue_id: string | null;
  ladder_step: number | null;
  rationale: string;
  evidence_refs: { review_id: string; pointer_id: string | null }[];
  paused: boolean;
}

export type TakeRole = "reference" | "exercise" | "follow_up" | "spontaneous" | "retry" | "free";
export type TakeStatus = "recording" | "saving" | "saved" | "analysis_pending" | "analysis_failed" | "review_ready";

export interface QualityFlag { code: string; message: string; blocks_voice_feedback: boolean; segments?: [number, number][] }

export interface Take {
  id: string;
  session_id: string;
  role: TakeRole;
  phase: "pre" | "post" | "none";
  prompt_id: string;
  prompt_text: string;
  exercise_id: string | null;
  exercise_version: number | null;
  cue_id: string | null;
  retry_of: string | null;
  triggered_by_review: string | null;
  mime: string;
  device_label: string | null;
  status: TakeStatus;
  completeness: "complete" | "missing_tail" | "interrupted" | null;
  original: { file: string; bytes: number; sha256: string; chunk_count: number } | null;
  created_utc: string;
  favourite: boolean;
  note: string | null;
  self_report: { answers: Record<string, string>; reported_utc: string } | null;
  analysis_run: string | null;
  analysis_error: string | null;
  read_along?: { starts: (number | null)[]; text: string | null; method: string } | null;
  card?: { card_id: string; rating: string; rated_utc: string } | null;
  analysis_summary: {
    run_id: string;
    status: string;
    duration_s: number | null;
    voiced_duration_s: number | null;
    f0_median_hz: number | null;
    /** Resonance: F2 and F3 medians (absent on takes measured before lilt-analysis/3). */
    formant_f2_median_hz?: number | null;
    formant_f3_median_hz?: number | null;
    quality_flags: QualityFlag[];
    pitch_algorithm: string;
  } | null;
  audio_url: string;
  local_date?: string;
}

export interface Session {
  id: string;
  kind: "full" | "check_in" | "studio" | "deck";
  state: "in_progress" | "completed";
  plan_version: number | null;
  exercise_id: string | null;
  exercise_version: number | null;
  focus_area: string | null;
  ladder_step: number | null;
  local_date: string;
  started_utc: string;
  completed_utc: string | null;
  comfort: { comfort: string; effort: number | null; hoarseness: boolean; likes_sound: string | null; note: string | null } | null;
}

export interface Evidence {
  class: "measured" | "self_reported" | "human_perceived" | "model_perceived" | "inferred";
  session_id: string;
  take_id: string | null;
  segment: [number, number] | null;
  analysis_run: string | null;
  measure: { name: string; value: number; unit: string | null } | null;
  self_report: Record<string, string> | null;
  comparison_take_id: string | null;
  comparison_segment: [number, number] | null;
  description: string;
}

export interface Pointer {
  id: string;
  kind: "pause" | "capture" | "practice_focus" | "progress" | "stable" | "more_evidence" | "descriptive";
  area: string;
  observation: string;
  evidence: Evidence[];
  goal_connection: string;
  confidence_basis: { data_quality: string; comparability: string; method_status: string; uncertainty: string };
  next_action: { exercise_id: string; exercise_version: number; cue_id: string | null; cue_text: string | null; summary: string } | null;
  recheck: { prompt_id: string; prompt_text: string; compare_with_take: string | null; ask: string } | null;
}

export interface Review {
  id: string;
  session_id: string;
  author: { kind: string; name: string; model: string | null; received_audio: boolean };
  created_utc: string;
  take_ids: string[];
  active_pointer: Pointer | null;
  other_observations: Pointer[];
  abstention: { reason: string; next_action: string } | null;
  summary: string | null;
  proposed_plan: { exercise_id: string; exercise_version: number; focus_area: string; cue_id: string | null; ladder_step: number | null; rationale: string } | null;
  applied_plan_version: number | null;
  responses: { response: string; note: string | null; created_utc: string; pointer_id: string | null }[];
  evidence_deleted: string[];
}

export interface Prompts {
  reference: { prompt_id: string; text: string; source_note: string };
  spontaneous: { prompt_id: string; questions: string[]; source_note: string };
}

export interface Today {
  local_date: string;
  local_time: string;
  timezone: string;
  goal: { summary: string; descriptors: string[] };
  plan: Plan;
  exercise: Exercise;
  cue: Cue | null;
  ladder_step: LadderStep | null;
  session_minutes: number;
  unfinished_session: Session | null;
  today_sessions: { id: string; kind: Session["kind"]; state: Session["state"]; completed_utc: string | null; take_count: number; comfort: boolean;
    roles: { role: TakeRole; phase: string; self_report: boolean }[] }[];
  latest_review: Review | null;
  participation: { days_this_week: number; last_practice_date: string | null; partial_sessions: number; practised_today: boolean };
  reminder: { time: string | null; due: boolean | null };
  pending_jobs: number;
  external_processing: boolean;
  prompts: Prompts;
}

export interface SkillCard {
  area: string;
  state: "not_assessed" | "recording_issue" | "more_evidence" | "stable" | "practice_focus" | "progress";
  reason: string;
  next_action: string;
  evidence: { session_id: string; take_id: string; self_report_signal: string; effort: number | null }[];
  capability: { guided_practice: string; acoustic_measurement: string; listening_feedback: string; validation_status: string };
  learner_disagreement: string | null;
}

export interface Comparison {
  take_a: string;
  take_b: string;
  outcome: "not_comparable" | "insufficient_evidence" | "stable" | "difference_noted";
  comparable_task: boolean;
  reasons: string[];
  limitations: string[];
  measures: { name: string; a: number | null; b: number | null; delta: number | null; unit: string; definition: string }[];
  segment_a: [number, number] | null;
  segment_b: [number, number] | null;
  method_status: string;
}

export interface Profile {
  schema: string;
  goal: { summary: string; descriptors: string[]; preferred_take_ids: string[] };
  language: string;
  timezone: string;
  reminder_time: string | null;
  appearance: string;
  session_minutes: number;
  comparison_window_days: number;
  external_processing: boolean;
  comfort_range_hz: [number, number] | null;
  new_cards_per_day?: number;
  room_note?: string | null;
  updated_utc: string;
}

/** `example` is an optional recording of someone saying the text, as `audio/<file>`. */
export interface TextItem { id: string; text: string; hint: string; example?: string }
export interface TextLevel {
  id: string; level: number; title: string; subtitle: string; kind: string;
  /** The chapter's intro: Markdown paragraphs separated by blank lines. */
  basis: string;
  source_url: string | null; written_by: string; items: TextItem[];
  /** The text to record every visit, so takes of it show change over time. */
  check_in?: string | null;
  area?: string | null;
  /** false: the chapter's texts aren't Today cards (Start here). */
  today?: boolean;
  /** A YouTube video for the chapter; nothing loads from YouTube until it's played. */
  video?: { id: string; title: string; by: string; image?: string | null } | null;
}
/** `home` is the Practice home page as Markdown (content/courses/voice/index.md); `home_cover` its banner. */
export interface Texts { note: string; levels: TextLevel[]; home?: string; home_cover?: string; pitch_reference?: PitchReference; edition?: Edition }
/** Whether these are the learner's own version of the syllabus (changed by an AI agent over MCP) and how many changes it has. */
export interface Edition { mine: boolean; changes: number; updates?: number }
/** One piece of the syllabus as a person reads it: a chapter text (words and hint) or Markdown. */
export interface Piece { markdown: string; text?: string; hint?: string }
/** One change to Lilt's original since the learner's version was made: "take" comes in, "choose" needs a choice, "already" matches. */
export interface SyllabusChange {
  id: string; file: string; title: string; part: string; kind: "added" | "removed" | "changed"; handling: "take" | "choose" | "already";
  yours: Piece | null; original: Piece | null; before: Piece | null;
}
/** Settings → Connect your AI: how to connect from this computer, the public address for cloud apps, signed-in apps and recent activity. */
export interface ConnectInfo {
  local_url: string; stdio: { command: string; args: string[]; env?: Record<string, string> }; token_required: boolean;
  public_url: string | null; public_mcp_url: string | null;
  connections: { id: string; client_name: string; connected: string; last_used: string }[];
  activity: { client: string; last_tool: string; last_used: string }[];
}
/** A course: a folder of Markdown in content/courses, and whether you use your own copy of it. */
export interface Course {
  id: string; title: string; kind: string; version: string; source: string | null; summary: string;
  locked_sections: string[]; using: "mine" | "original"; changes: number; updates_waiting: number; shown_in_app: boolean;
}
/** A course's files, and how your copy of each differs from the original. */
export interface CourseFiles {
  course: string; title: string; using: "mine" | "original"; changes_saved: number;
  files: { file: string; status: "same" | "changed" | "added"; chapter_id?: string; title?: string; texts?: number }[];
  removed_from_original: string[];
}
export interface CourseChange { change: number; time: string; action: "write" | "delete" | "update" | "reset"; file: string | null; note: string }
const cq = (course?: string) => (course ? `?course=${encodeURIComponent(course)}` : "");

export interface SyllabusUpdates { using: "mine" | "original"; available: boolean; to_choose?: number; changes: SyllabusChange[] }
/** Typical speaking pitch, from content/courses/voice/_pitch.md: averages and standard deviations in Hz, the overlap band, and the source. */
export interface PitchReference { men_mean: number; men_sd: number; women_mean: number; women_sd: number; overlap_low: number; overlap_high: number; source: string }

export type Rating = "again" | "hard" | "good" | "easy";
export interface DeckCard {
  id: string; stage: number; deck: string; deck_title: string; kind: "reference" | "exercise" | "text";
  front: string; hint: string; area: string; level_id: string; text_kind: string;
  exercise_id: string | null; exercise_version: number | null; prompt_id: string; source: string;
}
export interface DeckItem {
  card: DeckCard;
  kind: "daily" | "new" | "review" | "again";
  done_today: boolean;
  rating_today: Rating | "ouch" | null;
  preview: Record<Rating, string>;
  state: { reps: number; interval_days: number; due: string | null; lapses: number; suspended: boolean };
}
export interface Deck {
  local_date: string; paused: boolean; message?: string; items: DeckItem[]; all_done?: boolean;
  counts: { new: number; review: number; again: number };
  open_stage: number; stages?: number; cap: number; next_due?: string | null; learned?: number; total_cards?: number;
  participation?: { days_this_week: number; dates_this_week: string[]; practised_today: boolean };
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? res.statusText);
  return data as T;
}

export const api = {
  /** Remix a course (or one chapter) with your connected ChatGPT, into your mixtape. */
  remix: (request: string, chapter?: string, course?: string, history: { role: "user" | "assistant"; content: string }[] = []) =>
    call<{ course: string; reply: string; note: string }>("POST", "/api/mixtape/remix", { request, chapter, course, history }),
  /** A blank chapter at the end of your mixtape, for your AI to fill. */
  addChapter: (course?: string) => call<{ course: string; chapter: string; file: string }>("POST", "/api/mixtape/chapter", { course }),
  chatgptStatus: () => call<{ connected: boolean; pending: boolean }>("GET", "/api/chatgpt/status"),
  chatgptLogin: () => call<{ url: string }>("POST", "/api/chatgpt/login", {}),
  chatgptDisconnect: () => call<{ connected: boolean; revoked: boolean }>("POST", "/api/chatgpt/disconnect", {}),
  coachChat: (messages: { role: "user" | "assistant"; content: string }[]) => call<{ reply: string }>("POST", "/api/coach/chat", { messages }),
  today: () => call<Today>("GET", "/api/today"),
  /** A course's texts (the Practice course when none is named). */
  texts: (course?: string) => call<Texts>("GET", `/api/texts${course ? `?course=${encodeURIComponent(course)}` : ""}`),
  studioSession: () => call<Session>("POST", "/api/studio/session"),
  profile: () => call<Profile>("GET", "/api/profile"),
  saveProfile: (p: Profile) => call<Profile>("PUT", "/api/profile", p),
  exercises: () => call<{ exercises: Exercise[]; capability_matrix: { area: string; capability: SkillCard["capability"] }[] }>("GET", "/api/exercises"),
  deck: () => call<Deck>("GET", "/api/deck/today"),
  deckSession: () => call<Session>("POST", "/api/deck/session"),
  rateCard: (card_id: string, take_id: string | null, rating: Rating | "ouch") =>
    call<{ card_id: string; next?: string; paused?: boolean; duplicate?: boolean; deck: Deck }>("POST", "/api/deck/review", { card_id, take_id, rating }),
  resumePlan: () => call<Plan>("POST", "/api/plan/resume"),
  choosePlan: (exercise_id: string) => call<Plan>("POST", "/api/plan/choose", { exercise_id }),
  planHistory: () => call<Plan[]>("GET", "/api/plan/history"),
  createSession: (kind: "full" | "check_in") => call<Session>("POST", "/api/sessions", { kind }),
  sessions: (cursor = 0) => call<{ sessions: (Session & { take_count: number })[]; next_cursor: number | null; total: number }>("GET", `/api/sessions?cursor=${cursor}&limit=20`),
  session: (id: string) => call<{ session: Session; takes: Take[]; reviews: Review[]; exercise: Exercise | null }>("GET", `/api/sessions/${id}`),
  patchSession: (id: string, body: unknown) => call<Session>("PATCH", `/api/sessions/${id}`, body),
  deleteSession: (id: string, deleteReviews: boolean) => call<unknown>("DELETE", `/api/sessions/${id}?reviews=${deleteReviews ? "delete" : "mark"}`),
  reviewSession: (id: string) => call<Review>("POST", `/api/sessions/${id}/review`),
  createTake: (body: unknown) => call<Take>("POST", "/api/takes", body),
  take: (id: string) => call<Take>("GET", `/api/takes/${id}`),
  patchTake: (id: string, body: unknown) => call<Take>("PATCH", `/api/takes/${id}`, body),
  deleteTake: (id: string, deleteReviews: boolean) => call<unknown>("DELETE", `/api/takes/${id}?reviews=${deleteReviews ? "delete" : "mark"}`),
  finalize: (id: string, chunk_count: number, interrupted = false) => call<Take>("POST", `/api/takes/${id}/finalize`, { chunk_count, interrupted }),
  analysis: (id: string) => call<any>("GET", `/api/takes/${id}/analysis`),
  reanalyze: (id: string) => call<Take>("POST", `/api/takes/${id}/reanalyze`),
  /** Measure takes analysed with an older method again; earlier results are kept. */
  remeasureStale: () => call<{ queued: number; method: string }>("POST", "/api/remeasure"),
  /** What a course's original changed since your own copy was made (voice when no course is named). */
  syllabusUpdates: (course?: string) => call<SyllabusUpdates>("GET", `/api/syllabus/updates${cq(course)}`),
  applySyllabusUpdates: (choices: Record<string, "yours" | "original">, course?: string) =>
    call<{ updates_taken: number; kept_yours: number; change: number }>("POST", `/api/syllabus/updates${cq(course)}`, { choices }),
  courses: () => call<{ courses: Course[] }>("GET", "/api/courses"),
  courseFiles: (course: string) => call<CourseFiles>("GET", `/api/syllabus${cq(course)}`),
  courseHistory: (course: string) => call<{ course: string; using: "mine" | "original"; changes: CourseChange[] }>("GET", `/api/syllabus/history${cq(course)}`),
  undoSyllabus: (course?: string) => call<{ undone: number; using: "mine" | "original" }>("POST", `/api/syllabus/undo${cq(course)}`),
  resetCourse: (course: string, note: string) => call<{ reset: boolean; change: number }>("POST", `/api/syllabus/reset${cq(course)}`, { note }),
  connectInfo: () => call<ConnectInfo>("GET", "/api/connect"),
  setPublicAddress: (url: string) => call<{ public_url: string | null }>("PUT", "/api/connect/address", { url }),
  pairingCode: () => call<{ code: string; expires_in: number }>("POST", "/api/connect/code"),
  disconnectApp: (id: string) => call<{ removed: string }>("DELETE", `/api/connect/${id}`),
  history: (params: { prompt_id?: string; days?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.prompt_id) q.set("prompt_id", params.prompt_id);
    if (params.days) q.set("days", String(params.days));
    return call<{ from: string; to: string; window_days: number; takes: Take[]; aggregation: string }>("GET", `/api/history?${q}`);
  },
  compare: (a: string, b: string) => call<Comparison>("GET", `/api/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`),
  progress: () => call<{ skills: SkillCard[]; participation: Today["participation"]; goal: Today["goal"]; missing_evaluation_assets: string[] }>("GET", "/api/progress"),
  review: (id: string) => call<Review>("GET", `/api/reviews/${id}`),
  respond: (id: string, body: { pointer_id?: string | null; response: string; note?: string; chosen_exercise_id?: string }) =>
    call<{ review: Review; plan: Plan | null }>("POST", `/api/reviews/${id}/respond`, body),
};

export const AREA_LABEL: Record<string, string> = {
  listening: "Listening & goals",
  lightness: "Lightness",
  resonance: "Resonance",
  pitch: "Pitch",
  intonation: "Intonation & expression",
  carryover: "Conversation & carryover",
  recording: "Recording",
};

export const STATE_LABEL: Record<SkillCard["state"], string> = {
  not_assessed: "Not assessed",
  recording_issue: "Recording issue",
  more_evidence: "More evidence needed",
  stable: "Stable in this task",
  practice_focus: "Practice focus",
  progress: "Supported progress",
};

export const STATUS_LABEL: Record<TakeStatus, string> = {
  recording: "Recording",
  saving: "Saving…",
  saved: "Saved",
  analysis_pending: "Saved · analysing",
  analysis_failed: "Saved · analysis failed",
  review_ready: "Saved · analysed",
};
