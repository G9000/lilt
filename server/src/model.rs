//! Record types persisted under the data root. App-supplied facts (sessions, takes,
//! analyses) are kept separate from interpretation (reviews, plans).

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

pub const GOAL_SUMMARY: &str = "A more feminine speaking voice that sounds natural, feels comfortable, and works in everyday conversation.";

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Profile {
    pub schema: String,
    pub goal: Goal,
    pub language: String,
    pub timezone: String,
    pub reminder_time: Option<String>,
    pub appearance: String,
    pub session_minutes: u32,
    pub comparison_window_days: u32,
    /// Reserved for external recording analysis; the optional text coach has separate consent.
    pub external_processing: bool,
    /// Optional comfortable practice range the learner chose, [low, high] Hz. Shown as a
    /// band in pitch views; never a gendered target and never used for coaching.
    #[serde(default)]
    pub comfort_range_hz: Option<[f64; 2]>,
    /// New voice cards introduced per day.
    #[serde(default = "default_new_cards")]
    pub new_cards_per_day: u32,
    /// The sticky note on the room's wall. None until first edited (the room shows the goal).
    #[serde(default)]
    pub room_note: Option<String>,
    pub updated_utc: String,
}

fn default_new_cards() -> u32 {
    2
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Goal {
    pub summary: String,
    pub descriptors: Vec<String>,
    #[serde(default)]
    pub preferred_take_ids: Vec<String>,
}

impl Default for Profile {
    fn default() -> Self {
        Profile {
            schema: "lilt.profile/1".into(),
            goal: Goal {
                summary: GOAL_SUMMARY.into(),
                descriptors: vec![
                    "lighter sound".into(),
                    "forward (mouth and face) resonance".into(),
                    "natural and comfortable in everyday conversation".into(),
                ],
                preferred_take_ids: vec![],
            },
            language: "en".into(),
            timezone: "Asia/Kuala_Lumpur".into(),
            reminder_time: None,
            appearance: "pink".into(),
            session_minutes: 8,
            comparison_window_days: 7,
            external_processing: false,
            comfort_range_hz: None,
            new_cards_per_day: 2,
            room_note: None,
            updated_utc: crate::util::now_utc(),
        }
    }
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SessionKind {
    Full,
    CheckIn,
    /// Free practice in the Studio; no exercise, no automatic review.
    Studio,
    /// Today's voice deck (spaced-repetition cards).
    Deck,
}

impl SessionKind {
    /// Guided sessions follow the plan's exercise and get rules-based reviews.
    pub fn is_guided(self) -> bool {
        matches!(self, SessionKind::Full | SessionKind::CheckIn)
    }
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SessionState {
    InProgress,
    Completed,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Session {
    pub schema: String,
    pub id: String,
    pub kind: SessionKind,
    pub state: SessionState,
    pub plan_version: Option<u32>,
    pub exercise_id: Option<String>,
    pub exercise_version: Option<u32>,
    pub focus_area: Option<String>,
    pub ladder_step: Option<usize>,
    pub local_date: String,
    pub timezone: String,
    pub started_utc: String,
    pub started_local: String,
    pub completed_utc: Option<String>,
    pub comfort: Option<ComfortReport>,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Comfort {
    Comfortable,
    SomeEffort,
    Strain,
    Pain,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ComfortReport {
    pub comfort: Comfort,
    /// 1 = very easy, 5 = very effortful.
    pub effort: Option<u8>,
    #[serde(default)]
    pub hoarseness: bool,
    pub likes_sound: Option<String>,
    pub note: Option<String>,
    pub reported_utc: String,
}

impl ComfortReport {
    pub fn requires_pause(&self) -> bool {
        self.hoarseness || matches!(self.comfort, Comfort::Pain | Comfort::Strain)
    }
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TakeRole {
    Reference,
    Exercise,
    FollowUp,
    Spontaneous,
    Retry,
    /// Studio recording of a practice text.
    Free,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Phase {
    Pre,
    Post,
    None,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TakeStatus {
    Recording,
    Saving,
    Saved,
    AnalysisPending,
    AnalysisFailed,
    ReviewReady,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Completeness {
    Complete,
    MissingTail,
    Interrupted,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OriginalFile {
    pub file: String,
    pub bytes: u64,
    pub sha256: String,
    pub chunk_count: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TakeSelfReport {
    pub answers: BTreeMap<String, String>,
    pub reported_utc: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Take {
    pub schema: String,
    pub id: String,
    pub session_id: String,
    pub role: TakeRole,
    pub phase: Phase,
    /// Task identity used for matching comparisons.
    pub prompt_id: String,
    pub prompt_text: String,
    pub exercise_id: Option<String>,
    pub exercise_version: Option<u32>,
    pub cue_id: Option<String>,
    pub retry_of: Option<String>,
    pub triggered_by_review: Option<String>,
    pub triggered_by_pointer: Option<String>,
    pub mime: String,
    pub ext: String,
    /// Browser-reported capture facts (track settings, sample rate, channel count).
    pub capture: Value,
    pub device_label: Option<String>,
    pub status: TakeStatus,
    pub completeness: Option<Completeness>,
    pub original: Option<OriginalFile>,
    pub created_utc: String,
    pub finalized_utc: Option<String>,
    #[serde(default)]
    pub favourite: bool,
    #[serde(default)]
    pub note: Option<String>,
    #[serde(default)]
    pub self_report: Option<TakeSelfReport>,
    pub analysis_run: Option<String>,
    pub analysis_error: Option<String>,
    /// Approximate word start times from the browser read-along (display only).
    #[serde(default)]
    pub read_along: Option<Value>,
    /// Card this take was recorded for, and the learner's rating of it.
    #[serde(default)]
    pub card: Option<Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Plan {
    pub schema: String,
    pub version: u32,
    pub created_utc: String,
    pub author: String,
    pub exercise_id: String,
    pub exercise_version: u32,
    pub focus_area: String,
    pub cue_id: Option<String>,
    pub ladder_step: Option<usize>,
    pub rationale: String,
    #[serde(default)]
    pub evidence_refs: Vec<EvidenceRef>,
    #[serde(default)]
    pub paused: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct EvidenceRef {
    pub review_id: String,
    pub pointer_id: Option<String>,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EvidenceClass {
    Measured,
    SelfReported,
    HumanPerceived,
    ModelPerceived,
    Inferred,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QuotedMeasure {
    pub name: String,
    pub value: f64,
    pub unit: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Evidence {
    pub class: EvidenceClass,
    pub session_id: String,
    pub take_id: Option<String>,
    /// Seconds within the original take. None means whole-recording or non-audio evidence.
    pub segment: Option<[f64; 2]>,
    pub analysis_run: Option<String>,
    pub measure: Option<QuotedMeasure>,
    pub self_report: Option<BTreeMap<String, String>>,
    pub comparison_take_id: Option<String>,
    pub comparison_segment: Option<[f64; 2]>,
    pub description: String,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PointerKind {
    Pause,
    Capture,
    PracticeFocus,
    Progress,
    Stable,
    MoreEvidence,
    Descriptive,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ConfidenceBasis {
    pub data_quality: String,
    pub comparability: String,
    pub method_status: String,
    pub uncertainty: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NextAction {
    pub exercise_id: String,
    pub exercise_version: u32,
    pub cue_id: Option<String>,
    pub cue_text: Option<String>,
    pub summary: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Recheck {
    pub prompt_id: String,
    pub prompt_text: String,
    pub compare_with_take: Option<String>,
    pub ask: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Pointer {
    pub id: String,
    pub kind: PointerKind,
    pub area: String,
    pub observation: String,
    pub evidence: Vec<Evidence>,
    pub goal_connection: String,
    pub confidence_basis: ConfidenceBasis,
    pub next_action: Option<NextAction>,
    pub recheck: Option<Recheck>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReviewAuthor {
    /// "rules" or "agent".
    pub kind: String,
    pub name: String,
    pub model: Option<String>,
    /// Whether the author actually received audio it could perceive.
    pub received_audio: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Abstention {
    pub reason: String,
    pub next_action: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Review {
    pub schema: String,
    pub id: String,
    pub session_id: String,
    pub idempotency_key: String,
    pub author: ReviewAuthor,
    pub created_utc: String,
    pub take_ids: Vec<String>,
    pub active_pointer: Option<Pointer>,
    #[serde(default)]
    pub other_observations: Vec<Pointer>,
    pub abstention: Option<Abstention>,
    #[serde(default)]
    pub summary: Option<String>,
    /// A plan change that needs the learner's acceptance (new context or exercise).
    #[serde(default)]
    pub proposed_plan: Option<ProposedPlan>,
    /// Plan version this review applied automatically (cue change, step back, pause).
    #[serde(default)]
    pub applied_plan_version: Option<u32>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProposedPlan {
    pub exercise_id: String,
    pub exercise_version: u32,
    pub focus_area: String,
    pub cue_id: Option<String>,
    pub ladder_step: Option<usize>,
    pub rationale: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReviewResponse {
    pub review_id: String,
    pub pointer_id: Option<String>,
    /// "disagree" ("Does not match what I hear or feel"), "keep_focus", "choose_other", "accept".
    pub response: String,
    pub note: Option<String>,
    pub chosen_exercise_id: Option<String>,
    pub created_utc: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Job {
    pub schema: String,
    pub id: String,
    pub kind: String,
    pub session_id: String,
    pub take_id: String,
    pub status: String,
    pub attempts: u32,
    pub run_id: String,
    pub created_utc: String,
    pub updated_utc: String,
    pub error: Option<String>,
}
