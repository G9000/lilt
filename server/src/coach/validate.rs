//! Validation for agent-authored reviews (MCP `voice_save_review`). Structure and
//! references are checked exactly; prose is screened for a listed set of prohibited
//! claims. This screen cannot prove arbitrary prose true.

use crate::app::App;
use crate::coach::model::*;
use crate::store;
use crate::util;
use anyhow::{Result, anyhow, bail};
use serde::Deserialize;

/// Model-perceived feedback stays off until audio delivery to a client is demonstrated
/// and perceptual judgements are evaluated (PRD §11, §14).
pub const MODEL_PERCEIVED_ENABLED: bool = false;

/// Always prohibited: diagnosis, anatomy claims, universal scores, clinical claims.
const ALWAYS_BANNED: &[&str] = &[
    "diagnos", "nodule", "dysphonia", "vocal injury", "vocal damage", "larynx position",
    "laryngeal position", "your larynx is", "muscle tension", "feminine percentage",
    "% feminine", "percent feminine", "femininity score", "passability score",
    "clinically validated", "clinically proven", "guaranteed", "you will pass",
];

/// Prohibited unless the author actually received audio (and model perception is enabled).
const HEARING_CLAIMS: &[&str] = &[
    "i hear", "i can hear", "i heard", "i listened", "sounds feminine", "sounds masculine",
    "sounds more feminine", "sounds less feminine", "sounds lighter", "sounds heavier",
    "sounds brighter", "sounds darker", "your resonance sounds", "your voice sounds",
    "audibly",
];

#[derive(Debug, Deserialize)]
pub struct AgentReviewInput {
    pub session_id: String,
    pub idempotency_key: String,
    pub author_name: String,
    pub model: Option<String>,
    #[serde(default)]
    pub received_audio: bool,
    pub active_pointer: Option<Pointer>,
    #[serde(default)]
    pub other_observations: Vec<Pointer>,
    pub abstention: Option<Abstention>,
    pub summary: Option<String>,
}

pub fn prose_violations(text: &str, received_audio: bool) -> Vec<String> {
    let lower = text.to_lowercase();
    let mut v: Vec<String> = ALWAYS_BANNED
        .iter()
        .filter(|p| lower.contains(*p))
        .map(|p| format!("prohibited claim \u{201c}{p}\u{201d}"))
        .collect();
    if !(received_audio && MODEL_PERCEIVED_ENABLED) {
        v.extend(
            HEARING_CLAIMS
                .iter()
                .filter(|p| lower.contains(*p))
                .map(|p| format!("hearing claim \u{201c}{p}\u{201d} without validated audio perception")),
        );
    }
    v
}

/// Numbers followed by a unit in prose, e.g. "182 Hz", "+1.5 st".
fn quoted_numbers(text: &str) -> Vec<f64> {
    let mut out = vec![];
    let chars: Vec<char> = text.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        if chars[i].is_ascii_digit() {
            let start = i;
            while i < chars.len() && (chars[i].is_ascii_digit() || chars[i] == '.') {
                i += 1;
            }
            let num: String = chars[start..i].iter().collect();
            let rest: String = chars[i..].iter().take(12).collect::<String>().trim_start().to_lowercase();
            let unit = ["hz", "st", "semitone", "dbfs", "db"].iter().any(|u| rest.starts_with(u));
            if unit {
                if let Ok(v) = num.trim_end_matches('.').parse::<f64>() {
                    let neg = start > 0 && matches!(chars[start - 1], '-' | '\u{2212}');
                    out.push(if neg { -v } else { v });
                }
            }
        } else {
            i += 1;
        }
    }
    out
}

/// A quoted value matches if it equals the stored value rounded to 0-4 decimals.
pub fn matches_stored(quoted: f64, stored: f64) -> bool {
    (0..=4).any(|d| {
        let f = 10f64.powi(d);
        ((stored * f).round() / f - quoted).abs() < 1e-9
    })
}

fn check_pointer(app: &App, p: &Pointer, received_audio: bool, errors: &mut Vec<String>) {
    let reg = app.registry.read().unwrap();
    let ctx = format!("pointer {}", p.id);
    if p.observation.trim().is_empty() {
        errors.push(format!("{ctx}: observation is empty"));
    }
    let mut allowed_numbers: Vec<f64> = vec![];
    if p.evidence.is_empty() && !matches!(p.kind, PointerKind::MoreEvidence) {
        errors.push(format!("{ctx}: every substantive pointer needs evidence"));
    }
    for e in &p.evidence {
        if app.session(&e.session_id).is_err() {
            errors.push(format!("{ctx}: unknown session {}", e.session_id));
            continue;
        }
        if matches!(e.class, EvidenceClass::ModelPerceived) && !(received_audio && MODEL_PERCEIVED_ENABLED) {
            errors.push(format!("{ctx}: model-perceived evidence is disabled until audio delivery and perceptual judgements are validated"));
        }
        if matches!(e.class, EvidenceClass::HumanPerceived) && e.description.trim().len() < 10 {
            errors.push(format!("{ctx}: human-perceived evidence must identify the reviewer and rubric"));
        }
        for (tid, seg) in [(&e.take_id, e.segment), (&e.comparison_take_id, e.comparison_segment)] {
            let Some(tid) = tid else {
                if seg.is_some() {
                    errors.push(format!("{ctx}: a segment needs a take"));
                }
                continue;
            };
            let Ok(t) = app.take(tid) else {
                errors.push(format!("{ctx}: take {tid} does not exist"));
                continue;
            };
            if let Some([a, b]) = seg {
                let dur = app.take_analysis(&t).and_then(|an| an["measures"]["duration_s"]["value"].as_f64());
                match dur {
                    Some(d) if a >= 0.0 && b > a && b <= d + 0.05 => {}
                    Some(d) => errors.push(format!("{ctx}: segment {a}-{b} s is outside take {tid} (duration {d:.2} s)")),
                    None => errors.push(format!("{ctx}: segment given for take {tid}, which has no analysed duration")),
                }
            }
            if let Some(answers) = &e.self_report {
                if matches!(e.class, EvidenceClass::SelfReported) && e.take_id.as_deref() == Some(tid.as_str()) {
                    let stored = t.self_report.as_ref().map(|r| &r.answers);
                    for (q, a) in answers {
                        if stored.and_then(|s| s.get(q)) != Some(a) {
                            errors.push(format!("{ctx}: self-report {q}={a} does not match what was recorded for take {tid}"));
                        }
                    }
                }
            }
        }
        if let Some(m) = &e.measure {
            let Some(run) = &e.analysis_run else {
                errors.push(format!("{ctx}: quoted measure {} needs an analysis_run", m.name));
                continue;
            };
            match app.analysis_by_run(run) {
                Ok((_, an)) => {
                    if e.take_id.as_deref() != an["take_id"].as_str() {
                        errors.push(format!("{ctx}: analysis {run} does not belong to take {:?}", e.take_id));
                    }
                    if m.name == "f0_median_delta_st" {
                        let other = e.comparison_take_id.as_ref().and_then(|c| app.take(c).ok()).and_then(|t| app.take_analysis(&t));
                        let a = an["measures"]["f0_median_hz"]["value"].as_f64();
                        let b = other.and_then(|o| o["measures"]["f0_median_hz"]["value"].as_f64());
                        match (a, b) {
                            (Some(a), Some(b)) if matches_stored(m.value, 12.0 * (b / a).log2()) => allowed_numbers.push(m.value),
                            _ => errors.push(format!("{ctx}: quoted f0_median_delta_st {} does not match the stored analyses", m.value)),
                        }
                    } else {
                        match an["measures"][&m.name]["value"].as_f64() {
                            Some(v) if matches_stored(m.value, v) => {
                                allowed_numbers.push(m.value);
                            }
                            Some(v) => errors.push(format!("{ctx}: quoted {} = {} does not match stored value {v}", m.name, m.value)),
                            None => errors.push(format!("{ctx}: measure {} is unavailable in analysis {run}", m.name)),
                        }
                    }
                }
                Err(_) => errors.push(format!("{ctx}: analysis run {run} does not exist")),
            }
        }
    }
    if let Some(n) = &p.next_action {
        match reg.eligible(&n.exercise_id, n.exercise_version) {
            Ok(ex) => {
                if let Some(c) = &n.cue_id {
                    match ex.cue(c) {
                        Some(cue) => {
                            if let Some(t) = &n.cue_text {
                                if t.trim() != cue.text.trim() {
                                    errors.push(format!("{ctx}: cue text must match the registry text for {c}"));
                                }
                            }
                        }
                        None => errors.push(format!("{ctx}: cue {c} is not in {} v{}", n.exercise_id, n.exercise_version)),
                    }
                }
            }
            Err(e) => errors.push(format!("{ctx}: {e}")),
        }
    }
    let prose = format!(
        "{}\n{}\n{}",
        p.observation,
        p.goal_connection,
        p.next_action.as_ref().map(|n| n.summary.clone()).unwrap_or_default()
    );
    for v in prose_violations(&prose, received_audio) {
        errors.push(format!("{ctx}: {v}"));
    }
    for q in quoted_numbers(&prose) {
        if !allowed_numbers.iter().any(|a| (a - q).abs() < 1e-9 || matches_stored(q, *a)) {
            errors.push(format!("{ctx}: the number {q} in the text is not backed by a quoted measure in this pointer's evidence"));
        }
    }
}

pub fn save_agent_review(app: &App, input: AgentReviewInput) -> Result<(Review, bool)> {
    store::check_id(&input.session_id)?;
    if input.idempotency_key.trim().is_empty() || input.idempotency_key.len() > 120 {
        bail!("idempotency_key is required (max 120 chars)");
    }
    let key = format!("agent-{}", input.idempotency_key);
    app.session(&input.session_id)?;
    let _g = app.write_lock.lock().unwrap();
    if let Some(r) = app.all_reviews().into_iter().find(|r| r.idempotency_key == key) {
        return Ok((r, false));
    }
    if input.active_pointer.is_none() && input.abstention.is_none() {
        bail!("a review needs either an active_pointer or an abstention with a reason and next action");
    }
    let mut errors = vec![];
    let pointers: Vec<&Pointer> = input.active_pointer.iter().chain(input.other_observations.iter()).collect();
    for p in &pointers {
        check_pointer(app, p, input.received_audio, &mut errors);
    }
    let mut extra = input.summary.clone().unwrap_or_default();
    if let Some(a) = &input.abstention {
        extra.push('\n');
        extra.push_str(&a.reason);
        extra.push('\n');
        extra.push_str(&a.next_action);
        if a.reason.trim().is_empty() || a.next_action.trim().is_empty() {
            errors.push("abstention needs a reason and a useful next action".into());
        }
    }
    for v in prose_violations(&extra, input.received_audio) {
        errors.push(format!("summary: {v}"));
    }
    if !quoted_numbers(&extra).is_empty() {
        errors.push("summary: put numbers in a pointer with a quoted measure, not in the summary".into());
    }
    if !errors.is_empty() {
        return Err(anyhow!("review rejected:\n- {}", errors.join("\n- ")));
    }
    let take_ids: Vec<String> = pointers
        .iter()
        .flat_map(|p| p.evidence.iter())
        .flat_map(|e| [e.take_id.clone(), e.comparison_take_id.clone()])
        .flatten()
        .collect();
    let review = Review {
        schema: "lilt.review/1".into(),
        id: util::new_id("r"),
        session_id: input.session_id.clone(),
        idempotency_key: key,
        author: ReviewAuthor {
            kind: "agent".into(),
            name: input.author_name,
            model: input.model,
            received_audio: input.received_audio,
        },
        created_utc: util::now_utc(),
        take_ids,
        active_pointer: input.active_pointer,
        other_observations: input.other_observations,
        abstention: input.abstention,
        summary: input.summary,
        proposed_plan: None,
        applied_plan_version: None,
    };
    let dir = app.paths.reviews_dir(&review.session_id);
    store::write_json(&dir.join(format!("{}.json", review.id)), &review)?;
    store::write_atomic(&dir.join(format!("{}.md", review.id)), crate::coach::render_markdown(&review).as_bytes())?;
    Ok((review, true))
}
