//! The learner's profile and their practice plan.

use crate::coach::model::EvidenceRef;
use serde::{Deserialize, Serialize};

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
    /// A second sticky note, beside the first. None: there isn't one; an empty string: added, blank.
    #[serde(default)]
    pub room_note_2: Option<String>,
    /// The warm-up text (an id in the Warm-ups chapter) that opens every day's cards, with the
    /// cool-down closing them. An empty string turns both off.
    #[serde(default = "default_warmup")]
    pub warmup_card: String,
    /// Show where each take sits on the average man/woman pitch scale. Off until the learner turns it
    /// on: fixed population bands can hurt, and your own range is what matters. A profile without the
    /// field reads as off; one that saved `true` keeps it.
    #[serde(default)]
    pub show_pitch_scale: bool,
    pub updated_utc: String,
}

fn default_new_cards() -> u32 {
    2
}

fn default_warmup() -> String {
    "hum".into()
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
            room_note_2: None,
            warmup_card: default_warmup(),
            show_pitch_scale: false,
            updated_utc: crate::util::now_utc(),
        }
    }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pitch_scale_is_opt_in_and_a_saved_choice_is_kept() {
        assert!(!Profile::default().show_pitch_scale);
        let mut saved = serde_json::to_value(Profile::default()).unwrap();
        // An older profile that never had the setting: off.
        saved.as_object_mut().unwrap().remove("show_pitch_scale");
        let missing: Profile = serde_json::from_value(saved.clone()).unwrap();
        assert!(!missing.show_pitch_scale);
        // Someone who saved it on keeps it on.
        saved["show_pitch_scale"] = true.into();
        let kept: Profile = serde_json::from_value(saved).unwrap();
        assert!(kept.show_pitch_scale);
    }
}
