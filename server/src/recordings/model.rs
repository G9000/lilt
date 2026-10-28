//! Sessions and takes as stored under the data root: facts the app recorded, never interpretation.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

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
