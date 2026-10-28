//! Deterministic coaching rules (PRD §10 decision order):
//! comfort → capture quality → comparability → goal relevance → one eligible cue → retry.
//! Evidence is capture-quality measurement and the learner's own reports. Pitch
//! measurements are descriptive only and never select a cue or change the plan.

pub mod validate;

use crate::app::App;
use crate::analysis::compare;
use crate::practice::exercises::Exercise;
use crate::model::*;
use crate::store;
use crate::util;
use anyhow::{Result, anyhow};
use serde_json::Value;
use std::collections::BTreeMap;

pub const RULES_AUTHOR: &str = "lilt-rules/1";
/// Consecutive "target met" sessions before a stable result or next context is offered.
pub const STABLE_SESSIONS: usize = 2;
/// Consecutive "target met" sessions with falling effort before reporting easier production.
pub const PROGRESS_SESSIONS: usize = 3;

pub fn goal_connection(area: &str) -> &'static str {
    match area {
        "resonance" => "You chose a lighter, more feminine voice with forward resonance. Where you feel the vibration is how this source-checked activity tracks resonance.",
        "lightness" => "Your goal includes a lighter sound. In this activity, your own listening judgement is the evidence. Lighter does not mean quieter.",
        "pitch" => "Pitch is one part of your goal, alongside resonance and lightness. Lilt does not treat a higher number as automatically better.",
        "intonation" => "You want a voice that sounds natural and like you. Rise and fall that fits the meaning helps with that. No particular melody is required.",
        "carryover" => "Your goal is a voice that works in everyday conversation. That means carrying what you practise into longer, less scripted speech.",
        _ => "This relates to your chosen voice goal.",
    }
}

fn self_report_basis() -> ConfidenceBasis {
    ConfidenceBasis {
        data_quality: "Your own report about this attempt.".into(),
        comparability: "One attempt in one task. This is not a general pattern.".into(),
        method_status: "Self-report on an NHS Fife activity checked against its source. No clinician has reviewed it.".into(),
        uncertainty: "Lilt cannot hear or measure resonance or lightness. It relies on what you noticed.".into(),
    }
}

/// Signal from a take's self-report: the first non-"info" signal across the exercise's questions,
/// with comfort_stop taking precedence.
pub fn take_signal(ex: &Exercise, t: &Take) -> Option<(String, String, String)> {
    let sr = t.self_report.as_ref()?;
    let mut best: Option<(String, String, String)> = None;
    for q in &ex.check_questions {
        if let Some(ans) = sr.answers.get(&q.id) {
            if let Some(sig) = ex.signal(&q.id, ans) {
                if sig == "comfort_stop" {
                    return Some((sig.into(), q.id.clone(), ans.clone()));
                }
                if sig != "info" && (best.is_none() || sig == "target_not_met") {
                    best = Some((sig.into(), q.id.clone(), ans.clone()));
                }
            }
        }
    }
    best
}

fn answer_label(ex: &Exercise, q: &str, a: &str) -> String {
    ex.check_questions
        .iter()
        .find(|x| x.id == q)
        .and_then(|x| x.options.iter().find(|o| o.id == a))
        .map(|o| o.label.to_lowercase())
        .unwrap_or_else(|| a.to_string())
}

fn question_text(ex: &Exercise, q: &str) -> String {
    ex.check_questions
        .iter()
        .find(|x| x.id == q)
        .map(|x| x.text.clone())
        .unwrap_or_default()
}

fn practice_takes(takes: &[Take]) -> Vec<&Take> {
    takes
        .iter()
        .filter(|t| matches!(t.role, TakeRole::Exercise | TakeRole::Retry | TakeRole::FollowUp))
        .filter(|t| t.original.is_some())
        .collect()
}

fn pid(n: usize) -> String {
    format!("p{n}")
}

fn self_evidence(t: &Take, q: &str, a: &str, desc: String) -> Evidence {
    let mut m = BTreeMap::new();
    m.insert(q.to_string(), a.to_string());
    Evidence {
        class: EvidenceClass::SelfReported,
        session_id: t.session_id.clone(),
        take_id: Some(t.id.clone()),
        segment: None,
        analysis_run: None,
        measure: None,
        self_report: Some(m),
        comparison_take_id: t.retry_of.clone(),
        comparison_segment: None,
        description: desc,
    }
}

/// History of (session, signal) for an exercise, oldest first, one entry per session
/// (that session's latest self-reported take).
fn exercise_history(app: &App, ex_id: &str, ladder_step: Option<usize>) -> Vec<(Session, String)> {
    let reg = app.registry.read().unwrap();
    let mut out = vec![];
    for s in app.sessions() {
        if s.exercise_id.as_deref() != Some(ex_id) || s.ladder_step != ladder_step {
            continue;
        }
        let takes = app.takes_in(&s.id);
        let latest = takes
            .iter()
            .filter(|t| t.exercise_id.as_deref() == Some(ex_id) && t.self_report.is_some())
            .last();
        if let Some(t) = latest {
            if let Some(ex) = reg.get(ex_id, t.exercise_version.unwrap_or(1)) {
                if let Some((sig, _, _)) = take_signal(ex, t) {
                    out.push((s.clone(), sig));
                }
            }
        }
    }
    out
}

fn trailing_met(hist: &[(Session, String)]) -> Vec<&Session> {
    let mut v: Vec<&Session> = hist
        .iter()
        .rev()
        .take_while(|(_, s)| s == "target_met")
        .map(|(s, _)| s)
        .collect();
    v.reverse();
    v
}

fn idempotency_key(s: &Session, takes: &[Take]) -> String {
    let mut parts = vec![s.id.clone(), RULES_AUTHOR.to_string()];
    if let Some(c) = &s.comfort {
        parts.push(c.reported_utc.clone());
    }
    for t in takes {
        parts.push(format!(
            "{}|{}|{}",
            t.id,
            t.analysis_run.clone().unwrap_or_default(),
            t.self_report.as_ref().map(|r| r.reported_utc.clone()).unwrap_or_default()
        ));
    }
    format!("rules-{}", &store::sha256_hex(parts.join("\n").as_bytes())[..20])
}

/// Build (or return the existing) rules-based review for a session.
pub fn review_session(app: &App, sid: &str) -> Result<Review> {
    let s = app.session(sid)?;
    let takes = app.takes_in(sid);
    let key = idempotency_key(&s, &takes);
    if let Some(r) = app.reviews_in(sid).into_iter().find(|r| r.idempotency_key == key) {
        return Ok(r);
    }
    let ex = {
        let reg = app.registry.read().unwrap();
        s.exercise_id
            .as_ref()
            .and_then(|id| reg.get(id, s.exercise_version.unwrap_or(1)).cloned())
    };
    let mut review = Review {
        schema: "lilt.review/1".into(),
        id: util::new_id("r"),
        session_id: s.id.clone(),
        idempotency_key: key,
        author: ReviewAuthor {
            kind: "rules".into(),
            name: RULES_AUTHOR.into(),
            model: None,
            received_audio: false,
        },
        created_utc: util::now_utc(),
        take_ids: takes.iter().map(|t| t.id.clone()).collect(),
        active_pointer: None,
        other_observations: vec![],
        abstention: None,
        summary: None,
        proposed_plan: None,
        applied_plan_version: None,
    };
    let mut n = 0usize;
    let mut next_id = || {
        n += 1;
        pid(n)
    };
    let practice = practice_takes(&takes);
    let mut plan_change: Option<(ProposedPlan, bool)> = None; // (plan, auto_apply)

    // 1. Comfort first.
    let comfort_stop = ex.as_ref().and_then(|ex| {
        practice
            .iter()
            .rev()
            .find_map(|t| take_signal(ex, t).filter(|(sig, _, _)| sig == "comfort_stop").map(|x| (*t, x)))
    });
    let pause_from_comfort = s.comfort.as_ref().filter(|c| c.requires_pause());
    if pause_from_comfort.is_some() || comfort_stop.is_some() {
        let ex = ex.as_ref();
        let mut evidence = vec![];
        if let Some(c) = pause_from_comfort {
            let mut m = BTreeMap::new();
            m.insert("comfort".into(), format!("{:?}", c.comfort).to_lowercase());
            if c.hoarseness {
                m.insert("hoarseness".into(), "yes".into());
            }
            evidence.push(Evidence {
                class: EvidenceClass::SelfReported,
                session_id: s.id.clone(),
                take_id: None,
                segment: None,
                analysis_run: None,
                measure: None,
                self_report: Some(m),
                comparison_take_id: None,
                comparison_segment: None,
                description: "Your comfort check at the end of the session.".into(),
            });
        }
        if let (Some((t, (_, q, a))), Some(ex)) = (comfort_stop, ex) {
            evidence.push(self_evidence(t, &q, &a, format!("You answered \u{201c}{}\u{201d}.", answer_label(ex, &q, &a))));
        }
        let (ex_id, ex_v, area) = ex
            .map(|e| (e.id.clone(), e.version, e.primary_area.clone()))
            .unwrap_or_default();
        review.active_pointer = Some(Pointer {
            id: next_id(),
            kind: PointerKind::Pause,
            area: area.clone(),
            observation: "You reported strain, pain or hoarseness, so this activity is paused.".into(),
            evidence,
            goal_connection: "A comfortable, healthy voice comes before any practice target. Your comfort report outranks any measurement.".into(),
            confidence_basis: ConfidenceBasis {
                data_quality: "Your own comfort report.".into(),
                comparability: "Not needed: a comfort report is enough to pause.".into(),
                method_status: "NHS Fife says to stop an activity that causes pain, discomfort or hoarseness, and to try again when your voice feels better.".into(),
                uncertainty: "Lilt cannot assess vocal health. If the problem persists or keeps coming back, seek advice from a voice professional.".into(),
            },
            next_action: if ex_id.is_empty() { None } else { Some(NextAction {
                exercise_id: ex_id.clone(),
                exercise_version: ex_v,
                cue_id: None,
                cue_text: None,
                summary: "Rest your voice and look after it. When it feels better, you can resume this activity, more slowly. Lilt will not make it harder.".into(),
            })},
            recheck: Some(Recheck {
                prompt_id: "comfort".into(),
                prompt_text: "How does your voice feel today?".into(),
                compare_with_take: None,
                ask: "Before practising again, check that speaking feels comfortable and that the hoarseness has gone.".into(),
            }),
        });
        if !ex_id.is_empty() {
            plan_change = Some((
                ProposedPlan {
                    exercise_id: ex_id,
                    exercise_version: ex_v,
                    focus_area: area,
                    cue_id: None,
                    ladder_step: s.ladder_step,
                    rationale: "Paused after your comfort report. Resume when your voice feels comfortable.".into(),
                },
                true,
            ));
        }
    }

    // 2. Recording quality.
    for t in &practice {
        let Some(an) = app.take_analysis(t) else {
            if t.status == TakeStatus::AnalysisFailed {
                review.other_observations.push(Pointer {
                    id: next_id(),
                    kind: PointerKind::Descriptive,
                    area: "recording".into(),
                    observation: "Analysis failed for this take. Your recording is saved and can still be played.".into(),
                    evidence: vec![],
                    goal_connection: "Recording problems do not count as anything about your voice.".into(),
                    confidence_basis: self_report_basis(),
                    next_action: None,
                    recheck: None,
                });
            }
            continue;
        };
        let blocks = compare::blocking_flags(&an);
        let flags: Vec<&Value> = an["quality_flags"].as_array().map(|a| a.iter().collect()).unwrap_or_default();
        for f in flags {
            let code = f["code"].as_str().unwrap_or("");
            let segment = f["segments"][0].as_array().and_then(|s| Some([s.first()?.as_f64()?, s.get(1)?.as_f64()?]));
            let (obs, action) = match code {
                "clipping" => ("Parts of this recording are clipped: the input was too loud for the microphone. This is about the recording, not your voice.", "Move a little further from the microphone, or lower the input level, then record again."),
                "low_signal" => ("This recording has very little signal. The microphone may be muted, too far away, or the wrong input.", "Check the microphone level meter before recording, then try again."),
                "insufficient_voiced" => ("There was too little voiced sound to measure.", "Record the full task. It needs a few seconds of voice."),
                "suspected_tracking_errors" => ("The pitch tracker may have made errors (sudden jumps) in this take, so its pitch summary is unreliable.", "Nothing to change in your practice. Measurements for this take are shown with a warning."),
                "decode_truncated" => ("The end of this recording is missing. The saved part plays normally.", "If you want the whole task, record it again."),
                _ => continue,
            };
            let measure = if code == "clipping" {
                compare::measure(&an, "clipped_sample_fraction").map(|v| QuotedMeasure { name: "clipped_sample_fraction".into(), value: v, unit: None })
            } else if code == "low_signal" {
                compare::measure(&an, "rms_dbfs").map(|v| QuotedMeasure { name: "rms_dbfs".into(), value: v, unit: Some("dBFS".into()) })
            } else { None };
            let p = Pointer {
                id: next_id(),
                kind: PointerKind::Capture,
                area: "recording".into(),
                observation: obs.into(),
                evidence: vec![Evidence {
                    class: EvidenceClass::Measured,
                    session_id: t.session_id.clone(),
                    take_id: Some(t.id.clone()),
                    segment,
                    analysis_run: t.analysis_run.clone(),
                    measure,
                    self_report: None,
                    comparison_take_id: None,
                    comparison_segment: None,
                    description: f["message"].as_str().unwrap_or(code).to_string(),
                }],
                goal_connection: "Usable recordings make listening back and comparing meaningful. Recording problems say nothing about your voice.".into(),
                confidence_basis: ConfidenceBasis {
                    data_quality: format!("Quality flag \u{201c}{code}\u{201d} from local analysis."),
                    comparability: "Not applicable.".into(),
                    method_status: "Capture-quality checks on fixed test audio (see VALIDATION.md).".into(),
                    uncertainty: "Uncalibrated digital level, not physical loudness.".into(),
                },
                next_action: ex.as_ref().map(|e| NextAction {
                    exercise_id: e.id.clone(),
                    exercise_version: e.version,
                    cue_id: None,
                    cue_text: None,
                    summary: action.into(),
                }),
                recheck: Some(Recheck {
                    prompt_id: t.prompt_id.clone(),
                    prompt_text: t.prompt_text.clone(),
                    compare_with_take: Some(t.id.clone()),
                    ask: "Check that the level meter moves while you speak.".into(),
                }),
            };
            let blocking_without_report = blocks.iter().any(|b| b == code) && t.self_report.is_none();
            if review.active_pointer.is_none() && blocking_without_report {
                review.active_pointer = Some(p);
            } else {
                review.other_observations.push(p);
            }
        }
    }

    // 3. Comparability: retry vs original, and the reference pre/post pair.
    let mut pairs: Vec<(String, String, &str)> = vec![];
    for t in &practice {
        if let Some(orig) = &t.retry_of {
            pairs.push((orig.clone(), t.id.clone(), "Original and retry"));
        }
    }
    let refs: Vec<&Take> = takes.iter().filter(|t| t.role == TakeRole::Reference && t.original.is_some()).collect();
    if refs.len() >= 2 {
        pairs.push((refs[0].id.clone(), refs[refs.len() - 1].id.clone(), "Reference phrase before and after practice"));
    }
    for (a, b, label) in pairs {
        let Ok(c) = compare::compare(app, &a, &b) else { continue };
        let observation = match c.outcome.as_str() {
            "stable" => format!("{label}: pitch summaries are similar (median within {} semitone).", compare::STABLE_MEDIAN_ST),
            "difference_noted" => {
                let d = c.measures.first().and_then(|m| m.delta).unwrap_or(0.0);
                format!("{label}: the median pitch of the second take differs by {d:+.1} semitones. This is a description, not a judgement. Pitch alone is not progress.")
            }
            "not_comparable" => format!("{label}: not comparable. {}", c.reasons.join(" ")),
            _ => format!("{label}: not enough evidence to compare yet. {}", c.reasons.join(" ")),
        };
        let delta_measure = c.measures.first().and_then(|m| m.delta).map(|v| QuotedMeasure {
            name: "f0_median_delta_st".into(),
            value: (v * 10.0).round() / 10.0,
            unit: Some("st".into()),
        });
        review.other_observations.push(Pointer {
            id: next_id(),
            kind: PointerKind::Descriptive,
            area: "pitch".into(),
            observation,
            evidence: vec![Evidence {
                class: EvidenceClass::Measured,
                session_id: s.id.clone(),
                take_id: Some(a.clone()),
                segment: c.segment_a,
                analysis_run: app.take(&a).ok().and_then(|t| t.analysis_run),
                measure: if c.outcome == "difference_noted" || c.outcome == "stable" { delta_measure } else { None },
                self_report: None,
                comparison_take_id: Some(b.clone()),
                comparison_segment: c.segment_b,
                description: "Voiced span of each take (first to last voiced segment).".into(),
            }],
            goal_connection: goal_connection("pitch").into(),
            confidence_basis: ConfidenceBasis {
                data_quality: c.reasons.join(" ").chars().take(300).collect::<String>().trim().to_string(),
                comparability: c.limitations.join(" "),
                method_status: c.method_status.clone(),
                uncertainty: "Descriptive only. It never changes your plan.".into(),
            },
            next_action: None,
            recheck: None,
        });
    }

    // 4-5. Self-reported evidence, goal relevance, one eligible cue.
    if review.active_pointer.is_none() {
        if let Some(ex) = &ex {
            let reported = practice.iter().rev().find(|t| t.exercise_id.as_deref() == Some(&ex.id) && t.self_report.is_some());
            match reported.and_then(|t| take_signal(ex, t).map(|sig| (*t, sig))) {
                Some((t, (sig, q, a))) => {
                    let (pointer, change) = pointer_for_signal(app, &s, ex, t, &sig, &q, &a, &takes, next_id());
                    review.active_pointer = Some(pointer);
                    plan_change = change;
                }
                None if !practice.is_empty() => {
                    review.abstention = Some(Abstention {
                        reason: "You haven't answered this exercise's self-check yet. Lilt's pitch measurements are descriptive only, so there's no supported pointer.".into(),
                        next_action: "Listen back to your take, then answer the self-check question.".into(),
                    });
                }
                None => {
                    review.abstention = Some(Abstention {
                        reason: if s.kind == SessionKind::CheckIn {
                            "Check-in saved. A single reference recording can be described, but it does not support a corrective pointer.".into()
                        } else {
                            "No practice take has been saved in this session yet.".into()
                        },
                        next_action: "Start today's exercise when you have a few minutes.".into(),
                    });
                }
            }
        }
    }

    // Carryover limit: reading-only history cannot establish conversational use.
    let any_spontaneous = app.all_takes().iter().any(|t| t.role == TakeRole::Spontaneous && t.original.is_some());
    if !any_spontaneous {
        review.other_observations.push(Pointer {
            id: next_id(),
            kind: PointerKind::MoreEvidence,
            area: "carryover".into(),
            observation: "Your recordings so far are scripted, so carryover into unscripted speech hasn't been assessed.".into(),
            evidence: vec![],
            goal_connection: goal_connection("carryover").into(),
            confidence_basis: ConfidenceBasis {
                data_quality: "No unscripted recordings yet.".into(),
                comparability: "Not applicable.".into(),
                method_status: "Reading or scripted tasks do not show how your voice works in conversation.".into(),
                uncertainty: "Unknown until you record a short unscripted answer.".into(),
            },
            next_action: None,
            recheck: Some(Recheck {
                prompt_id: "spont.short-answer".into(),
                prompt_text: "Answer a short question in your own words.".into(),
                compare_with_take: None,
                ask: "Did your practised voice stay with you while you were thinking about what to say?".into(),
            }),
        });
    }

    // Earlier disagreement is carried forward into the next assessment.
    if let Some(p) = review.active_pointer.as_mut() {
        let prior: Vec<ReviewResponse> = app
            .all_reviews()
            .iter()
            .filter(|r| r.active_pointer.as_ref().map(|x| x.area == p.area).unwrap_or(false))
            .flat_map(|r| app.review_responses(r))
            .filter(|x| x.response == "disagree")
            .collect();
        if let Some(last) = prior.last() {
            p.confidence_basis.uncertainty = format!(
                "{} Earlier you marked a pointer in this area as not matching what you hear or feel{}.",
                p.confidence_basis.uncertainty,
                last.note.as_ref().map(|n| format!(" (\u{201c}{n}\u{201d})")).unwrap_or_default()
            );
        }
    }

    // Apply automatic (non-escalating) plan changes; propose the rest.
    if let Some((pp, auto)) = plan_change {
        if auto {
            let current = app.current_plan();
            let mut evidence_refs = vec![EvidenceRef {
                review_id: review.id.clone(),
                pointer_id: review.active_pointer.as_ref().map(|p| p.id.clone()),
            }];
            evidence_refs.dedup();
            let paused = review.active_pointer.as_ref().map(|p| p.kind == PointerKind::Pause).unwrap_or(false);
            let unchanged = current.as_ref().map(|c| {
                c.exercise_id == pp.exercise_id && c.cue_id == pp.cue_id && c.ladder_step == pp.ladder_step && c.paused == paused
            }).unwrap_or(false);
            if !unchanged {
                let plan = app.write_plan(
                    Plan {
                        schema: "lilt.plan/1".into(),
                        version: 0,
                        created_utc: String::new(),
                        author: RULES_AUTHOR.into(),
                        exercise_id: pp.exercise_id,
                        exercise_version: pp.exercise_version,
                        focus_area: pp.focus_area,
                        cue_id: pp.cue_id,
                        ladder_step: pp.ladder_step,
                        rationale: pp.rationale,
                        evidence_refs,
                        paused,
                    },
                    current.map(|c| c.version),
                )?;
                review.applied_plan_version = Some(plan.version);
            }
        } else {
            review.proposed_plan = Some(pp);
        }
    }

    review.summary = Some(summary_line(&review));
    store::write_json(&app.paths.reviews_dir(sid).join(format!("{}.json", review.id)), &review)?;
    store::write_atomic(
        &app.paths.reviews_dir(sid).join(format!("{}.md", review.id)),
        render_markdown(&review).as_bytes(),
    )?;
    Ok(review)
}

#[allow(clippy::too_many_arguments)]
fn pointer_for_signal(
    app: &App,
    s: &Session,
    ex: &Exercise,
    t: &Take,
    sig: &str,
    q: &str,
    a: &str,
    takes: &[Take],
    id: String,
) -> (Pointer, Option<(ProposedPlan, bool)>) {
    let label = answer_label(ex, q, a);
    let qtext = question_text(ex, q);
    let task = if let (Some(step), true) = (s.ladder_step, !ex.ladder.is_empty()) {
        ex.ladder.get(step).map(|l| l.text.clone()).unwrap_or_else(|| ex.practice_task.prompt_text.clone())
    } else {
        ex.practice_task.prompt_text.clone()
    };
    let evidence = vec![self_evidence(t, q, a, format!("You answered \u{201c}{qtext}\u{201d} with \u{201c}{label}\u{201d}. This applies to the whole take."))];
    let recheck = Recheck {
        prompt_id: t.prompt_id.clone(),
        prompt_text: t.prompt_text.clone(),
        compare_with_take: Some(t.id.clone()),
        ask: qtext.clone(),
    };
    let area = ex.primary_area.clone();
    let used_cues: Vec<String> = takes.iter().filter_map(|x| x.cue_id.clone()).collect();
    let current_plan = app.current_plan();

    match sig {
        "target_not_met" => {
            // Answer-specific cues first (e.g. intonation "too_flat"), then generic ones.
            let mut candidates = ex.cues_for(a);
            candidates.extend(ex.cues_for("target_not_met"));
            let cue = candidates
                .iter()
                .find(|c| !used_cues.contains(&c.id) && current_plan.as_ref().and_then(|p| p.cue_id.as_ref()) != Some(&c.id))
                .or(candidates.first())
                .copied();
            // Pitch "cartoon-like": the source links this to resonance staying low.
            let cartoony = ex.id == "nhsfife.gentle-pitch-count" && a == "cartoony";
            let ladder_back = !ex.ladder.is_empty() && s.ladder_step.unwrap_or(0) > 0;
            let observation = if cartoony {
                format!("In this attempt at \u{201c}{task}\u{201d}, you said it sounded cartoon-like. The source links this to pitch going up while resonance stays low.")
            } else {
                format!("In this attempt at \u{201c}{task}\u{201d}, you answered \u{201c}{label}\u{201d}.")
            };
            let next_action = NextAction {
                exercise_id: ex.id.clone(),
                exercise_version: ex.version,
                cue_id: cue.map(|c| c.id.clone()),
                cue_text: cue.map(|c| c.text.clone()),
                summary: match cue {
                    Some(c) => format!("Try this cue: {}", c.text),
                    None => "Repeat the activity slowly.".into(),
                },
            };
            let change = Some((
                ProposedPlan {
                    exercise_id: ex.id.clone(),
                    exercise_version: ex.version,
                    focus_area: area.clone(),
                    cue_id: next_action.cue_id.clone(),
                    ladder_step: if ladder_back { s.ladder_step.map(|x| x - 1) } else { s.ladder_step },
                    rationale: if ladder_back {
                        "You reported the current step was too hard, so the plan steps back one rung, as the source recommends.".into()
                    } else {
                        format!("Same activity with a different cue from the source, after you answered \u{201c}{label}\u{201d}.")
                    },
                },
                true,
            ));
            (
                Pointer {
                    id,
                    kind: PointerKind::PracticeFocus,
                    area: area.clone(),
                    observation,
                    evidence,
                    goal_connection: goal_connection(&area).into(),
                    confidence_basis: self_report_basis(),
                    next_action: Some(next_action),
                    recheck: Some(recheck),
                },
                change,
            )
        }
        "unsure" => {
            let cue = ex.cues_for("unsure").first().copied().or_else(|| ex.cue(&ex.primary_cue.id));
            (
                Pointer {
                    id,
                    kind: PointerKind::MoreEvidence,
                    area: area.clone(),
                    observation: format!("You answered \u{201c}{label}\u{201d}, so there isn't a clear result for this attempt yet."),
                    evidence,
                    goal_connection: goal_connection(&area).into(),
                    confidence_basis: self_report_basis(),
                    next_action: Some(NextAction {
                        exercise_id: ex.id.clone(),
                        exercise_version: ex.version,
                        cue_id: cue.map(|c| c.id.clone()),
                        cue_text: cue.map(|c| c.text.clone()),
                        summary: "Listen to the takes again, then record one more attempt with the cue in mind.".into(),
                    }),
                    recheck: Some(recheck),
                },
                None,
            )
        }
        _ => {
            // target_met
            let hist = exercise_history(app, &ex.id, s.ladder_step);
            let met = trailing_met(&hist);
            let efforts: Vec<Option<u8>> = met.iter().map(|x| x.comfort.as_ref().and_then(|c| c.effort)).collect();
            let easier = met.len() >= PROGRESS_SESSIONS
                && efforts.iter().all(|e| e.is_some())
                && efforts.last().unwrap().unwrap() < efforts.first().unwrap().unwrap();
            let mut change = None;
            let (kind, observation, summary) = if !ex.ladder.is_empty() && met.len() >= STABLE_SESSIONS {
                let step = s.ladder_step.unwrap_or(0);
                if step + 1 < ex.ladder.len() {
                    change = Some((
                        ProposedPlan {
                            exercise_id: ex.id.clone(),
                            exercise_version: ex.version,
                            focus_area: area.clone(),
                            cue_id: Some(ex.primary_cue.id.clone()),
                            ladder_step: Some(step + 1),
                            rationale: format!(
                                "{} sessions in a row comfortable and consistent at \u{201c}{}\u{201d}.",
                                met.len(),
                                ex.ladder[step].text
                            ),
                        },
                        false,
                    ));
                }
                (
                    PointerKind::Progress,
                    format!("For {} sessions in a row, you reported keeping your practised voice comfortably and consistently at \u{201c}{task}\u{201d}.", met.len()),
                    if change.is_some() { "You can move to the next step if you want, or stay here." } else { "You're on the last step. Keep practising at a pace that feels comfortable." },
                )
            } else if easier {
                (
                    PointerKind::Progress,
                    format!("For {} sessions in a row, you reached this activity's target, and your effort rating went down from {} to {}.", met.len(), efforts.first().unwrap().unwrap(), efforts.last().unwrap().unwrap()),
                    "It is getting easier in this task. Keep practising, or try a next context if you like.",
                )
            } else if met.len() >= STABLE_SESSIONS {
                (
                    PointerKind::Stable,
                    format!("For {} sessions in a row, you reported reaching this activity's target (\u{201c}{label}\u{201d}).", met.len()),
                    "Stable in this task. Keep going, or try a next context if you like.",
                )
            } else {
                (
                    PointerKind::MoreEvidence,
                    format!("This time you answered \u{201c}{label}\u{201d}. Another session will show whether it repeats."),
                    "Repeat this activity in your next session.",
                )
            };
            if change.is_none() && matches!(kind, PointerKind::Stable | PointerKind::Progress) && ex.ladder.is_empty() {
                let reg = app.registry.read().unwrap();
                if let Some(next) = ex.next.iter().find_map(|id| reg.latest(id)) {
                    change = Some((
                        ProposedPlan {
                            exercise_id: next.id.clone(),
                            exercise_version: next.version,
                            focus_area: next.primary_area.clone(),
                            cue_id: Some(next.primary_cue.id.clone()),
                            ladder_step: if next.ladder.is_empty() { None } else { Some(0) },
                            rationale: format!("Next context after a stable result in \u{201c}{}\u{201d}. Optional, and only if it feels comfortable.", ex.title),
                        },
                        false,
                    ));
                }
            }
            let mut ev = evidence;
            for x in met.iter().take(met.len().saturating_sub(1)) {
                ev.push(Evidence {
                    class: EvidenceClass::SelfReported,
                    session_id: x.id.clone(),
                    take_id: None,
                    segment: None,
                    analysis_run: None,
                    measure: None,
                    self_report: None,
                    comparison_take_id: None,
                    comparison_segment: None,
                    description: format!("Earlier session on {} with the same answer.", x.local_date),
                });
            }
            (
                Pointer {
                    id,
                    kind,
                    area: area.clone(),
                    observation,
                    evidence: ev,
                    goal_connection: goal_connection(&area).into(),
                    confidence_basis: ConfidenceBasis {
                        comparability: format!("{} session(s) on the same activity and task.", met.len().max(1)),
                        ..self_report_basis()
                    },
                    next_action: Some(NextAction {
                        exercise_id: ex.id.clone(),
                        exercise_version: ex.version,
                        cue_id: Some(ex.primary_cue.id.clone()),
                        cue_text: Some(ex.primary_cue.text.clone()),
                        summary: summary.into(),
                    }),
                    recheck: Some(recheck),
                },
                change,
            )
        }
    }
}

fn summary_line(r: &Review) -> String {
    if let Some(p) = &r.active_pointer {
        let next = p.next_action.as_ref().map(|n| format!(" Next: {}", n.summary)).unwrap_or_default();
        format!("{}{}", p.observation, next)
    } else if let Some(a) = &r.abstention {
        format!("{} {}", a.reason, a.next_action)
    } else {
        "Nothing to report.".into()
    }
}

pub fn render_markdown(r: &Review) -> String {
    let mut md = format!(
        "# Review {}\n\nSession `{}` · author {} ({}) · {}\n\n",
        r.id, r.session_id, r.author.name, r.author.kind, r.created_utc
    );
    let write_pointer = |md: &mut String, p: &Pointer, title: &str| {
        md.push_str(&format!("## {title}: {} ({:?})\n\n{}\n\n", p.area, p.kind, p.observation));
        md.push_str(&format!("- Goal connection: {}\n", p.goal_connection));
        for e in &p.evidence {
            md.push_str(&format!(
                "- Evidence ({:?}): {}{}{}\n",
                e.class,
                e.description,
                e.take_id.as_ref().map(|t| format!(" [take {t}]")).unwrap_or_default(),
                e.segment.map(|s| format!(" [{:.2}–{:.2} s]", s[0], s[1])).unwrap_or_default()
            ));
        }
        md.push_str(&format!(
            "- Confidence basis: {} {} {} {}\n",
            p.confidence_basis.data_quality,
            p.confidence_basis.comparability,
            p.confidence_basis.method_status,
            p.confidence_basis.uncertainty
        ));
        if let Some(n) = &p.next_action {
            md.push_str(&format!("- Next: {} ({} v{}{})\n", n.summary, n.exercise_id, n.exercise_version, n.cue_id.as_ref().map(|c| format!(", cue {c}")).unwrap_or_default()));
        }
        if let Some(rc) = &p.recheck {
            md.push_str(&format!("- Recheck: \u{201c}{}\u{201d}, then {}\n", rc.prompt_text, rc.ask));
        }
        md.push('\n');
    };
    if let Some(p) = &r.active_pointer {
        write_pointer(&mut md, p, "Practice priority");
    }
    if let Some(a) = &r.abstention {
        md.push_str(&format!("## No pointer\n\n{}\n\nNext: {}\n\n", a.reason, a.next_action));
    }
    for p in &r.other_observations {
        write_pointer(&mut md, p, "Other observation");
    }
    md
}

/// Record a learner response. The review itself is never rewritten.
pub fn respond(app: &App, rid: &str, mut resp: ReviewResponse) -> Result<Option<Plan>> {
    let r = app.review(rid)?;
    if !["disagree", "keep_focus", "choose_other", "accept"].contains(&resp.response.as_str()) {
        return Err(anyhow!("unknown response"));
    }
    resp.review_id = r.id.clone();
    resp.created_utc = util::now_utc();
    let mut new_plan = None;
    let current = app.current_plan();
    match resp.response.as_str() {
        "accept" => {
            let pp = r.proposed_plan.clone().ok_or_else(|| anyhow!("this review has no proposed change"))?;
            app.registry.read().unwrap().eligible(&pp.exercise_id, pp.exercise_version)?;
            new_plan = Some(app.write_plan(
                Plan {
                    schema: "lilt.plan/1".into(),
                    version: 0,
                    created_utc: String::new(),
                    author: "learner".into(),
                    exercise_id: pp.exercise_id,
                    exercise_version: pp.exercise_version,
                    focus_area: pp.focus_area,
                    cue_id: pp.cue_id,
                    ladder_step: pp.ladder_step,
                    rationale: format!("You accepted: {}", pp.rationale),
                    evidence_refs: vec![EvidenceRef { review_id: r.id.clone(), pointer_id: r.active_pointer.as_ref().map(|p| p.id.clone()) }],
                    paused: false,
                },
                current.map(|c| c.version),
            )?);
        }
        "choose_other" => {
            let id = resp.chosen_exercise_id.clone().ok_or_else(|| anyhow!("choose an exercise"))?;
            let ex = {
                let reg = app.registry.read().unwrap();
                let ex = reg.latest(&id).ok_or_else(|| anyhow!("unknown exercise"))?.clone();
                reg.eligible(&ex.id, ex.version)?;
                ex
            };
            new_plan = Some(app.write_plan(
                Plan {
                    schema: "lilt.plan/1".into(),
                    version: 0,
                    created_utc: String::new(),
                    author: "learner".into(),
                    exercise_id: ex.id.clone(),
                    exercise_version: ex.version,
                    focus_area: ex.primary_area.clone(),
                    cue_id: Some(ex.primary_cue.id.clone()),
                    ladder_step: if ex.ladder.is_empty() { None } else { Some(0) },
                    rationale: "You chose this activity.".into(),
                    evidence_refs: vec![EvidenceRef { review_id: r.id.clone(), pointer_id: None }],
                    paused: false,
                },
                current.map(|c| c.version),
            )?);
        }
        _ => {}
    }
    store::append_line(
        &app.paths.reviews_dir(&r.session_id).join(format!("{}.responses.jsonl", r.id)),
        &serde_json::to_string(&resp)?,
    )?;
    Ok(new_plan)
}
