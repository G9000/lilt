//! Per-skill assessment states (PRD §9). Missing data, skipped days, new tasks and
//! recording faults never turn into a low score or a regression claim.

use crate::app::App;
use crate::coach;
use crate::compare;
use crate::model::*;
use serde::Serialize;
use serde_json::{Value, json};

pub const AREAS: [&str; 6] = ["listening", "lightness", "resonance", "pitch", "intonation", "carryover"];

#[derive(Debug, Serialize)]
pub struct SkillCard {
    pub area: String,
    /// not_assessed | recording_issue | more_evidence | stable | practice_focus | progress
    pub state: String,
    pub reason: String,
    pub next_action: String,
    pub evidence: Vec<Value>,
    pub capability: Value,
    pub learner_disagreement: Option<String>,
}

/// What Lilt can do per area: practice, measurement, listening feedback, validation.
pub fn capability(area: &str) -> Value {
    let (practice, measure, listening, validation) = match area {
        "listening" => ("A/B playback, favourites and notes", "None. Preferences are your choice, not a score.", "Your own listening", "Not applicable"),
        "lightness" => ("Smile to brighten; forward hum (NHS Fife, source-checked)", "None. No validated lightness measure exists in Lilt.", "Your own A/B judgement", "No perceptual validation; automatic judgements are disabled"),
        "resonance" => ("Forward hum (NHS Fife, source-checked)", "None. Formant measures are not implemented or validated.", "Your report of where you feel the vibration", "No perceptual validation; automatic judgements are disabled"),
        "pitch" => ("Gentle pitch and counting (NHS Fife, source-checked)", "F0 median, percentiles, spread (Praat autocorrelation)", "Your report", "Tested on synthetic test audio only. Descriptive only; not validated on natural speech"),
        "intonation" => ("Real-life phrases (NHS Fife, source-checked)", "Pitch spread in semitones (descriptive only)", "Your report", "Descriptive only; no judgement of correct intonation"),
        "carryover" => ("Carryover ladder (NHS Fife, source-checked) and short unscripted answers", "Descriptive pitch only", "Your report", "Reading tasks cannot show how your voice works in conversation"),
        _ => ("", "", "", ""),
    };
    json!({"guided_practice": practice, "acoustic_measurement": measure, "listening_feedback": listening, "validation_status": validation})
}

pub fn skill_cards(app: &App) -> Vec<SkillCard> {
    let takes = app.all_takes();
    let reviews = app.all_reviews();
    let reg = app.registry.read().unwrap().clone();
    let mut out = vec![];
    for area in AREAS {
        let disagreement = reviews
            .iter()
            .filter(|r| r.active_pointer.as_ref().map(|p| p.area == area).unwrap_or(false))
            .flat_map(|r| app.review_responses(r))
            .filter(|x| x.response == "disagree")
            .last()
            .map(|x| x.note.unwrap_or_else(|| "You marked a pointer as not matching what you hear or feel.".into()));

        if area == "listening" {
            let favs = takes.iter().filter(|t| t.favourite).count();
            let notes = takes.iter().filter(|t| t.note.is_some()).count();
            out.push(SkillCard {
                area: area.into(),
                state: "not_assessed".into(),
                reason: format!("Listening preferences are yours and are not scored. Saved so far: {favs} favourite take(s) and {notes} note(s)."),
                next_action: "Mark takes you like as favourites and note what you were trying.".into(),
                evidence: vec![],
                capability: capability(area),
                learner_disagreement: None,
            });
            continue;
        }

        let in_area: Vec<&Take> = takes
            .iter()
            .filter(|t| t.original.is_some())
            .filter(|t| {
                t.exercise_id.as_ref().and_then(|id| reg.get(id, t.exercise_version.unwrap_or(1)))
                    .map(|ex| ex.areas.iter().any(|a| a == area))
                    .unwrap_or(false)
                    || (area == "carryover" && t.role == TakeRole::Spontaneous)
            })
            .collect();
        let card = |state: &str, reason: String, next: &str, evidence: Vec<Value>| SkillCard {
            area: area.into(),
            state: state.into(),
            reason,
            next_action: next.into(),
            evidence,
            capability: capability(area),
            learner_disagreement: disagreement.clone(),
        };
        if in_area.is_empty() {
            out.push(card("not_assessed", "No suitable task has been attempted in this area yet.".into(), "Try the introductory activity for this area.", vec![]));
            continue;
        }
        let latest = in_area.last().unwrap();
        let latest_blocked = app
            .take_analysis(latest)
            .map(|an| !compare::blocking_flags(&an).is_empty())
            .unwrap_or(false);
        if latest_blocked && latest.self_report.is_none() {
            out.push(card(
                "recording_issue",
                "The latest recording in this area has a capture problem (for example, very low signal), so it can't support an assessment. This says nothing about your voice.".into(),
                "Check the microphone level, then record again.",
                vec![json!({"take_id": latest.id, "session_id": latest.session_id})],
            ));
            continue;
        }
        // Per session: latest self-reported signal for an exercise covering this area.
        let mut per_session: Vec<(String, String, String, Option<u8>)> = vec![]; // (session, signal, take, effort)
        for t in &in_area {
            let Some(ex) = t.exercise_id.as_ref().and_then(|id| reg.get(id, t.exercise_version.unwrap_or(1))) else { continue };
            let Some((sig, _, _)) = coach::take_signal(ex, t) else { continue };
            let effort = app.session(&t.session_id).ok().and_then(|s| s.comfort.and_then(|c| c.effort));
            if let Some(last) = per_session.last_mut().filter(|x| x.0 == t.session_id) {
                *last = (t.session_id.clone(), sig, t.id.clone(), effort);
            } else {
                per_session.push((t.session_id.clone(), sig, t.id.clone(), effort));
            }
        }
        let ev = |xs: &[(String, String, String, Option<u8>)]| -> Vec<Value> {
            xs.iter().map(|(s, sig, t, e)| json!({"session_id": s, "take_id": t, "self_report_signal": sig, "effort": e})).collect()
        };
        if area == "carryover" && in_area.iter().all(|t| t.role != TakeRole::Spontaneous) && per_session.is_empty() {
            out.push(card("more_evidence", "Only scripted recordings so far. Reading does not show how your voice works in conversation.".into(), "Record a short unscripted answer.", vec![]));
            continue;
        }
        let Some(last) = per_session.last() else {
            out.push(card("more_evidence", "There are recordings in this area, but no self-check answers yet.".into(), "Listen back and answer the self-check after practising.", vec![]));
            continue;
        };
        let met: Vec<_> = per_session.iter().rev().take_while(|x| x.1 == "target_met").cloned().collect::<Vec<_>>().into_iter().rev().collect();
        let (state, reason, next) = match last.1.as_str() {
            "comfort_stop" => ("practice_focus", "Your last attempt here was paused because of a comfort report. Comfort comes first.".to_string(), "Rest. Resume gently when your voice feels comfortable."),
            "target_not_met" => ("practice_focus", "In your last attempt at this activity, you reported not reaching its target yet. This is about one task, not a general weakness.".to_string(), "Use the suggested cue, then retry the same task."),
            "unsure" => ("more_evidence", "Your last self-check was unsure, so there's no clear result yet.".to_string(), "Compare takes A/B and record one more attempt."),
            _ => {
                let efforts: Vec<Option<u8>> = met.iter().map(|x| x.3).collect();
                let easier = met.len() >= coach::PROGRESS_SESSIONS && efforts.iter().all(|e| e.is_some()) && efforts.last().unwrap() < efforts.first().unwrap();
                if easier {
                    ("progress", format!("{} sessions in a row reaching the target, with effort falling from {} to {}.", met.len(), efforts.first().unwrap().unwrap(), efforts.last().unwrap().unwrap()), "Keep practising, or try a next context if it feels comfortable.")
                } else if met.len() >= coach::STABLE_SESSIONS {
                    ("stable", format!("{} sessions in a row reaching the target in the same task.", met.len()), "Continue, or choose a next context.")
                } else {
                    ("more_evidence", "One session reached the target. Another session will show whether it repeats.".to_string(), "Repeat the activity in your next session.")
                }
            }
        };
        let (state, reason) = if disagreement.is_some() && state != "practice_focus" {
            (state, format!("{reason} You have also marked a pointer here as not matching what you hear or feel; that is kept with the evidence."))
        } else {
            (state, reason)
        };
        out.push(card(state, reason, next, ev(&per_session[per_session.len().saturating_sub(4)..])));
    }
    out
}

/// Days practised in the current local week (Mon-Sun), and the last practice date.
pub fn participation(app: &App, today: &str) -> Value {
    use chrono::{Datelike, NaiveDate};
    let sessions = app.sessions();
    let Ok(d) = NaiveDate::parse_from_str(today, "%Y-%m-%d") else { return json!({}) };
    let monday = d - chrono::Duration::days(d.weekday().num_days_from_monday() as i64);
    let mut days: Vec<String> = sessions
        .iter()
        .filter(|s| !app.takes_in(&s.id).iter().all(|t| t.original.is_none()))
        .map(|s| s.local_date.clone())
        .filter(|ld| NaiveDate::parse_from_str(ld, "%Y-%m-%d").map(|x| x >= monday && x <= d).unwrap_or(false))
        .collect();
    days.sort();
    days.dedup();
    let last = sessions.iter().rev().find(|s| !app.takes_in(&s.id).is_empty()).map(|s| s.local_date.clone());
    let partial = sessions.iter().filter(|s| s.kind.is_guided() && s.state == SessionState::InProgress && !app.takes_in(&s.id).is_empty()).count();
    json!({"days_this_week": days.len(), "dates_this_week": days, "last_practice_date": last, "partial_sessions": partial, "practised_today": days.iter().any(|x| x == today)})
}
