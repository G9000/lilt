//! Matched comparisons between two takes. Pitch measures are descriptive only, so the
//! strongest measured outcome here is "stable" or "difference noted", never progress.

use crate::app::App;
use crate::recordings::model::*;
use anyhow::Result;
use serde::Serialize;
use serde_json::Value;

/// Median differences below this are reported as stable (declared before testing).
pub const STABLE_MEDIAN_ST: f64 = 0.5;
pub const STABLE_SPAN_ST: f64 = 1.0;

#[derive(Debug, Serialize)]
pub struct MeasureDelta {
    pub name: String,
    pub a: Option<f64>,
    pub b: Option<f64>,
    pub delta: Option<f64>,
    pub unit: String,
    pub definition: String,
}

#[derive(Debug, Serialize)]
pub struct Comparison {
    pub take_a: String,
    pub take_b: String,
    /// not_comparable | insufficient_evidence | stable | difference_noted
    pub outcome: String,
    pub comparable_task: bool,
    pub reasons: Vec<String>,
    pub limitations: Vec<String>,
    pub measures: Vec<MeasureDelta>,
    pub segment_a: Option<[f64; 2]>,
    pub segment_b: Option<[f64; 2]>,
    pub method_status: String,
}

fn role_group(r: TakeRole) -> &'static str {
    match r {
        TakeRole::Reference => "reference",
        TakeRole::Spontaneous => "spontaneous",
        TakeRole::Free => "free",
        _ => "practice",
    }
}

pub fn measure(an: &Value, name: &str) -> Option<f64> {
    an["measures"][name]["value"].as_f64()
}

pub fn blocking_flags(an: &Value) -> Vec<String> {
    an["quality_flags"]
        .as_array()
        .map(|a| {
            a.iter()
                .filter(|f| f["blocks_voice_feedback"].as_bool().unwrap_or(false))
                .filter_map(|f| f["code"].as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default()
}

pub fn voiced_span(an: &Value) -> Option<[f64; 2]> {
    let segs = an["voiced_segments"].as_array()?;
    let first = segs.first()?.as_array()?;
    let last = segs.last()?.as_array()?;
    Some([first[0].as_f64()?, last[1].as_f64()?])
}

fn capture_key(t: &Take) -> Vec<(String, String)> {
    ["echoCancellation", "noiseSuppression", "autoGainControl", "sampleRate", "channelCount"]
        .iter()
        .map(|k| (k.to_string(), t.capture["settings"][*k].to_string()))
        .collect()
}

pub fn compare(app: &App, a_id: &str, b_id: &str) -> Result<Comparison> {
    let a = app.take(a_id)?;
    let b = app.take(b_id)?;
    let mut reasons = vec![];
    let mut limitations = vec![];
    let comparable_task = a.prompt_id == b.prompt_id && role_group(a.role) == role_group(b.role);
    if a.prompt_id != b.prompt_id {
        reasons.push(format!(
            "Different tasks (\u{201c}{}\u{201d} vs \u{201c}{}\u{201d}). Measurements from different material are not compared.",
            a.prompt_text, b.prompt_text
        ));
    } else if role_group(a.role) != role_group(b.role) {
        reasons.push("Different kinds of recording (reference, practice or spontaneous).".into());
    }
    if a.phase != b.phase && a.phase != Phase::None && b.phase != Phase::None {
        limitations.push("One take was recorded before practice and one after. An immediate change after an exercise does not show a lasting habit.".into());
    }
    if a.mime != b.mime {
        limitations.push(format!("Different recording formats ({} vs {}).", a.mime, b.mime));
    }
    let device_changed = a.device_label.is_some()
        && b.device_label.is_some()
        && a.device_label != b.device_label;
    if device_changed {
        reasons.push("Different microphones. Measurements may differ because of the device rather than your voice.".into());
    }
    if capture_key(&a) != capture_key(&b) {
        limitations.push("Browser capture settings differ between the takes.".into());
    }
    if a.original.as_ref().map(|o| &o.sha256) == b.original.as_ref().map(|o| &o.sha256) {
        limitations.push("These are byte-identical recordings.".into());
    }

    let an_a = app.take_analysis(&a);
    let an_b = app.take_analysis(&b);
    let mut measures = vec![];
    let mut outcome;
    let method_status = "Pitch measurements are descriptive only. They have not been validated against independent references on natural speech.".to_string();

    if !comparable_task || device_changed {
        outcome = "not_comparable".to_string();
    } else {
        outcome = "insufficient_evidence".to_string();
    }
    let (seg_a, seg_b) = (
        an_a.as_ref().and_then(voiced_span),
        an_b.as_ref().and_then(voiced_span),
    );
    match (&an_a, &an_b) {
        (Some(x), Some(y)) if x["status"] == "ok" && y["status"] == "ok" => {
            if x["method"]["params"] != y["method"]["params"]
                || x["method"]["pitch_algorithm"] != y["method"]["pitch_algorithm"]
            {
                reasons.push("The takes were analysed with different settings.".into());
                outcome = "not_comparable".into();
            }
            let (bx, by) = (blocking_flags(x), blocking_flags(y));
            if !bx.is_empty() || !by.is_empty() {
                reasons.push(format!(
                    "Recording quality issue ({}).",
                    bx.into_iter().chain(by).collect::<Vec<_>>().join(", ")
                ));
                if outcome != "not_comparable" {
                    outcome = "insufficient_evidence".into();
                }
            }
            let ma = measure(x, "f0_median_hz");
            let mb = measure(y, "f0_median_hz");
            let st = |p: f64, q: f64| 12.0 * (q / p).log2();
            let dmed = match (ma, mb) {
                (Some(p), Some(q)) => Some(st(p, q)),
                _ => None,
            };
            measures.push(MeasureDelta {
                name: "f0_median_hz".into(),
                a: ma,
                b: mb,
                delta: dmed,
                unit: "semitones (b relative to a)".into(),
                definition: "Median F0 over voiced frames; delta = 12*log2(b/a).".into(),
            });
            let sa = measure(x, "f0_p10_p90_span_st");
            let sb = measure(y, "f0_p10_p90_span_st");
            let dspan = match (sa, sb) {
                (Some(p), Some(q)) => Some(q - p),
                _ => None,
            };
            measures.push(MeasureDelta {
                name: "f0_p10_p90_span_st".into(),
                a: sa,
                b: sb,
                delta: dspan,
                unit: "semitones".into(),
                definition: "Spread between the 10th and 90th percentile F0.".into(),
            });
            let ca = x["measures"]["voiced_frame_coverage"]["value"].as_f64();
            let cb = y["measures"]["voiced_frame_coverage"]["value"].as_f64();
            measures.push(MeasureDelta {
                name: "voiced_frame_coverage".into(),
                a: ca,
                b: cb,
                delta: ca.zip(cb).map(|(p, q)| q - p),
                unit: "fraction of analysed frames".into(),
                definition: "Voiced frames / all analysed frames. A coverage change is not a voice change.".into(),
            });
            if let (Some(p), Some(q)) = (ca, cb) {
                if (p - q).abs() > 0.2 {
                    limitations.push("Voiced coverage differs a lot between the takes, so the summaries describe different amounts of material.".into());
                }
            }
            if outcome == "insufficient_evidence" && reasons.is_empty() {
                outcome = match (dmed, dspan) {
                    (Some(m), Some(s)) if m.abs() < STABLE_MEDIAN_ST && s.abs() < STABLE_SPAN_ST => "stable".into(),
                    (Some(_), _) => "difference_noted".into(),
                    _ => "insufficient_evidence".into(),
                };
                if outcome == "insufficient_evidence" {
                    reasons.push("Not enough voiced material for pitch summaries.".into());
                }
            }
        }
        _ => {
            reasons.push("Analysis is not available for both takes yet.".into());
            if outcome != "not_comparable" {
                outcome = "insufficient_evidence".into();
            }
        }
    }
    Ok(Comparison {
        take_a: a.id,
        take_b: b.id,
        outcome,
        comparable_task,
        reasons,
        limitations,
        measures,
        segment_a: seg_a,
        segment_b: seg_b,
        method_status,
    })
}
