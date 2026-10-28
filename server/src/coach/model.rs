//! Reviews as stored under the data root: interpretation, kept apart from the recorded facts,
//! with every observation tied to its evidence.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

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
