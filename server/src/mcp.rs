//! MCP server: a small typed tool set over IDs only (no paths, no shell). Uses the
//! same record access and validation as the HTTP API.

use crate::api::{self, ListQuery};
use crate::app::Shared;
use crate::model::*;
use crate::{compare, progress, syllabus, util, validate};
use base64::Engine;
use rmcp::{
    ErrorData as McpError, RoleServer, ServerHandler,
    model::{
        CallToolRequestParams, CallToolResponse, CallToolResult, ContentBlock, Implementation,
        ListToolsResult, PaginatedRequestParams, ServerCapabilities, ServerConfig, Tool,
        ToolAnnotations,
    },
    service::RequestContext,
};
use serde_json::{Value, json};
use std::sync::Arc;

const INSTRUCTIONS: &str = "Lilt is Julio's local voice feminization practice app. Her goal is a more feminine speaking voice that sounds natural, feels comfortable and works in everyday conversation, with interest in a lighter sound and forward resonance. Use these tools to read her practice evidence and to save grounded reviews.

Rules the server enforces:
- Every observation needs evidence: session/take IDs, analysis run IDs for any quoted measure, and the learner's recorded self-report answers. Quoted numbers must match stored analyses.
- Next actions must use an eligible exercise ID and version, and a cue ID from that exercise.
- Pitch measurements are descriptive only. They have not been validated on natural speech, so don't use them to justify corrective feedback or progress.
- You cannot hear her voice through these tools unless you actually received and perceived audio. Model-perceived feedback is disabled in this release. Never claim to hear resonance, lightness or femininity.
- No diagnosis, no anatomy or larynx claims, no femininity percentages, no clinical claims. Comfort reports (strain, pain, hoarseness) outrank everything.
- If evidence is insufficient, save an abstention with a reason and a useful next action.

Lilt holds courses (courses_list); voice practice is the one the app shows today. A course's chapters and home page can be rewritten for this learner with the syllabus_* tools, naming the course (voice when left out). Changes go to the learner's own copy only; the course's original is never changed. Read syllabus_list first, follow its chapter format, write one file at a time with a short note, and keep text ids when rewording. Practice texts stay gentle: nothing that pushes through strain, pain or hoarseness.";

pub struct LiltMcp {
    app: Shared,
}

impl LiltMcp {
    pub fn new(app: Shared) -> Self {
        LiltMcp { app }
    }
}

fn schema(v: Value) -> Arc<serde_json::Map<String, Value>> {
    Arc::new(v.as_object().cloned().unwrap_or_default())
}

fn tool(name: &'static str, desc: &'static str, s: Value, read_only: bool) -> Tool {
    Tool::new(name, desc, schema(s)).with_annotations(ToolAnnotations::new().read_only(read_only))
}

pub fn tools() -> Vec<Tool> {
    let evidence = json!({"type": "object", "required": ["class", "session_id", "description"], "properties": {
        "class": {"enum": ["measured", "self_reported", "human_perceived", "model_perceived", "inferred"]},
        "session_id": {"type": "string"}, "take_id": {"type": ["string", "null"]},
        "segment": {"type": ["array", "null"], "items": {"type": "number"}, "minItems": 2, "maxItems": 2},
        "analysis_run": {"type": ["string", "null"]},
        "measure": {"type": ["object", "null"], "properties": {"name": {"type": "string"}, "value": {"type": "number"}, "unit": {"type": ["string", "null"]}}},
        "self_report": {"type": ["object", "null"], "additionalProperties": {"type": "string"}},
        "comparison_take_id": {"type": ["string", "null"]},
        "comparison_segment": {"type": ["array", "null"], "items": {"type": "number"}},
        "description": {"type": "string"}}});
    let pointer = json!({"type": "object", "required": ["id", "kind", "area", "observation", "evidence", "goal_connection", "confidence_basis"], "properties": {
        "id": {"type": "string"},
        "kind": {"enum": ["pause", "capture", "practice_focus", "progress", "stable", "more_evidence", "descriptive"]},
        "area": {"enum": ["listening", "lightness", "resonance", "pitch", "intonation", "carryover", "recording"]},
        "observation": {"type": "string"}, "evidence": {"type": "array", "items": evidence},
        "goal_connection": {"type": "string"},
        "confidence_basis": {"type": "object", "required": ["data_quality", "comparability", "method_status", "uncertainty"], "properties": {
            "data_quality": {"type": "string"}, "comparability": {"type": "string"}, "method_status": {"type": "string"}, "uncertainty": {"type": "string"}}},
        "next_action": {"type": ["object", "null"], "required": ["exercise_id", "exercise_version", "summary"], "properties": {
            "exercise_id": {"type": "string"}, "exercise_version": {"type": "integer"}, "cue_id": {"type": ["string", "null"]},
            "cue_text": {"type": ["string", "null"]}, "summary": {"type": "string"}}},
        "recheck": {"type": ["object", "null"], "required": ["prompt_id", "prompt_text", "ask"], "properties": {
            "prompt_id": {"type": "string"}, "prompt_text": {"type": "string"}, "compare_with_take": {"type": ["string", "null"]}, "ask": {"type": "string"}}}}});
    let file_arg = json!({"type": "string", "description": "index.md, _about.md, _pitch.md, or a chapter like 03-automatic.md"});
    let tools = vec![
        tool("voice_get_today_plan", "Today's plan: goal, eligible exercise and cue, rationale, evidence references, plan version, participation this week.", json!({"type": "object", "properties": {"local_date": {"type": "string", "description": "Optional YYYY-MM-DD; informational."}}}), true),
        tool("voice_list_exercises", "The versioned exercise registry with sources, review status and cue IDs, plus the per-area capability matrix.", json!({"type": "object", "properties": {}}), true),
        tool("voice_list_sessions", "Sessions by local date range, newest first, paginated.", json!({"type": "object", "properties": {"from": {"type": "string"}, "to": {"type": "string"}, "cursor": {"type": "integer"}, "limit": {"type": "integer", "maximum": 100}}}), true),
        tool("voice_get_session", "One session: task details, takes (status, tags, self-reports, analysis summaries), comfort report, reviews and learner responses (including disagreement).", json!({"type": "object", "required": ["session_id"], "properties": {"session_id": {"type": "string"}}}), true),
        tool("voice_get_analysis", "Full analysis run: measurements with definitions, quality flags, method and parameters, source hash, F0 contour. Descriptive only.", json!({"type": "object", "required": ["run_id"], "properties": {"run_id": {"type": "string"}, "include_contour": {"type": "boolean"}}}), true),
        tool("voice_compare_sessions", "Compare two takes. Verifies task, device, settings and analysis compatibility; returns justified descriptive differences or a not-comparable or insufficient-evidence outcome.", json!({"type": "object", "required": ["take_a", "take_b"], "properties": {"take_a": {"type": "string"}, "take_b": {"type": "string"}}}), true),
        tool("voice_get_progress", "Per-skill assessment states with reasons, capability limits, participation, takes in a date range (optionally filtered by prompt), and missing evaluation assets.", json!({"type": "object", "properties": {"from": {"type": "string"}, "to": {"type": "string"}, "prompt_id": {"type": "string"}}}), true),
        tool("voice_get_deck", "Today's voice card deck (spaced repetition): queued cards with kind (daily/new/review/again), whether each is done today, the learner's own rating, scheduling state, and the full review log if include_log. Ratings are self-reports, never acoustic scores.", json!({"type": "object", "properties": {"include_log": {"type": "boolean"}}}), true),
        tool("voice_get_audio_clip", "Returns a WAV clip (from the derived analysis copy) of a take as MCP audio content, max 30 s. Whether your model can perceive it depends on your client; model-perceived feedback stays disabled until that is demonstrated.", json!({"type": "object", "required": ["take_id"], "properties": {"take_id": {"type": "string"}, "start_s": {"type": "number"}, "end_s": {"type": "number"}}}), true),
        tool("voice_save_review", "Save a structured, grounded review. The server validates evidence IDs, quoted measures, exercise and cue IDs, and screens prose for prohibited claims. Idempotent per idempotency_key.", json!({"type": "object", "required": ["session_id", "idempotency_key", "author_name"], "properties": {
            "session_id": {"type": "string"}, "idempotency_key": {"type": "string"}, "author_name": {"type": "string"}, "model": {"type": "string"},
            "received_audio": {"type": "boolean", "description": "true only if your model actually received and perceived audio content"},
            "active_pointer": {"anyOf": [pointer.clone(), {"type": "null"}]}, "other_observations": {"type": "array", "items": pointer},
            "abstention": {"type": ["object", "null"], "properties": {"reason": {"type": "string"}, "next_action": {"type": "string"}}},
            "summary": {"type": "string"}}}), false),
        tool("voice_set_next_plan", "Set the next practice plan to an eligible exercise (and optional cue / ladder step), with a rationale. Rejected if expected_plan_version is stale.", json!({"type": "object", "required": ["exercise_id", "exercise_version", "rationale", "expected_plan_version"], "properties": {
            "exercise_id": {"type": "string"}, "exercise_version": {"type": "integer"}, "cue_id": {"type": "string"}, "ladder_step": {"type": "integer"},
            "rationale": {"type": "string"}, "expected_plan_version": {"type": "integer"}, "evidence_review_ids": {"type": "array", "items": {"type": "string"}}}}), false),
        tool("courses_list", "The courses in Lilt (voice practice is the one the app shows today): what each is for, its kind of practice, the sections an AI may never change, and whether the learner uses their own copy, with how many changes and updates waiting. The syllabus_* tools work on one course: pass its id as `course` (voice when left out).", json!({"type": "object", "properties": {}}), true),
        tool("syllabus_list", "The learner's syllabus: every Markdown file (home page, about, pitch reference, chapters in order) with how it differs from Lilt's original, the chapter format, and the editing rules. Start here before changing anything.", json!({"type": "object", "properties": {}}), true),
        tool("syllabus_read", "One syllabus file as Markdown, from the learner's version (default) or Lilt's original.", json!({"type": "object", "required": ["file"], "properties": {"file": file_arg, "from": {"enum": ["mine", "original"]}}}), true),
        tool("syllabus_compare", "What differs between the learner's version and Lilt's original: files added, removed or changed, and for chapters which texts were added, removed or reworded. Pass file for one file.", json!({"type": "object", "properties": {"file": file_arg}}), true),
        tool("syllabus_write", "Create or replace one syllabus file in the learner's own version (Lilt's original is never changed). The whole syllabus is checked first; a file Lilt can't read, or a change to the home page's \"Be gentle with your voice\" section, is refused and nothing is saved. Keep text ids (## id) when rewording so progress stays with the text. Every change can be undone.", json!({"type": "object", "required": ["file", "markdown", "note"], "properties": {"file": file_arg, "markdown": {"type": "string"}, "note": {"type": "string", "description": "A few words on what changed and why, shown in the history."}}}), false),
        tool("syllabus_delete", "Remove one chapter file from the learner's version. Can be undone.", json!({"type": "object", "required": ["file", "note"], "properties": {"file": file_arg, "note": {"type": "string"}}}), false),
        tool("syllabus_history", "The changes made to the learner's version, newest first, with their notes.", json!({"type": "object", "properties": {}}), true),
        tool("syllabus_undo", "Undo the latest change to the learner's version (undoing the first change goes back to Lilt's original).", json!({"type": "object", "properties": {}}), false),
        tool("syllabus_updates", "What Lilt's original syllabus changed since the learner's version was made (or last updated), piece by piece (a chapter's details, each text, each home page section), with how each would be handled: \"take\" (they hadn't changed it, so the update comes in), \"choose\" (both changed it; show them both and ask which to keep), \"already\" (same change). Includes their version, the original's new one and the one before.", json!({"type": "object", "properties": {}}), true),
        tool("syllabus_apply_updates", "Bring the original's updates into the learner's version. Every \"choose\" change needs a choice: {\"<id>\": \"yours\" | \"original\"}; ask the learner rather than deciding for them. Checked like any change, kept in the history, and can be undone.", json!({"type": "object", "properties": {"choices": {"type": "object", "additionalProperties": {"enum": ["yours", "original"]}}, "note": {"type": "string"}}}), false),
        tool("syllabus_reset", "Go back to Lilt's original syllabus. Kept in the history, so it can be undone.", json!({"type": "object", "required": ["note"], "properties": {"note": {"type": "string"}}}), false),
    ];
    // Every syllabus tool works on one course, the app's own when none is named.
    tools.into_iter().map(|mut t| {
        if t.name.starts_with("syllabus_") {
            let mut schema = (*t.input_schema).clone();
            if let Some(props) = schema.entry("properties").or_insert(json!({})).as_object_mut() {
                props.insert("course".into(), json!({"type": "string", "description": "The course id from courses_list; voice when left out."}));
            }
            t.input_schema = Arc::new(schema);
        }
        t
    }).collect()
}

fn arg_str(a: &serde_json::Map<String, Value>, k: &str) -> Option<String> {
    a.get(k).and_then(|v| v.as_str()).map(String::from)
}

fn req_str(a: &serde_json::Map<String, Value>, k: &str) -> anyhow::Result<String> {
    arg_str(a, k).ok_or_else(|| anyhow::anyhow!("missing argument {k}"))
}

/// Slice the 16-bit PCM analysis WAV.
fn wav_clip(bytes: &[u8], start_s: f64, end_s: f64) -> anyhow::Result<(Vec<u8>, f64, f64)> {
    anyhow::ensure!(bytes.len() > 44 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WAVE", "not a WAV file");
    let mut pos = 12;
    let (mut channels, mut rate, mut bits) = (0u16, 0u32, 0u16);
    let mut data: Option<(usize, usize)> = None;
    while pos + 8 <= bytes.len() {
        let id = &bytes[pos..pos + 4];
        let size = u32::from_le_bytes(bytes[pos + 4..pos + 8].try_into()?) as usize;
        let body = pos + 8;
        if id == b"fmt " {
            channels = u16::from_le_bytes(bytes[body + 2..body + 4].try_into()?);
            rate = u32::from_le_bytes(bytes[body + 4..body + 8].try_into()?);
            bits = u16::from_le_bytes(bytes[body + 14..body + 16].try_into()?);
        } else if id == b"data" {
            data = Some((body, size.min(bytes.len() - body)));
            break;
        }
        pos = body + size + (size & 1);
    }
    let (off, len) = data.ok_or_else(|| anyhow::anyhow!("WAV has no data chunk"))?;
    anyhow::ensure!(bits == 16 && channels >= 1 && rate > 0, "unsupported WAV format");
    let frame = (channels as usize) * 2;
    let total = len / frame;
    let dur = total as f64 / rate as f64;
    let s = start_s.clamp(0.0, dur);
    let e = end_s.clamp(s, dur).min(s + 30.0);
    let (a, b) = ((s * rate as f64) as usize, (e * rate as f64) as usize);
    let pcm = &bytes[off + a * frame..off + b * frame];
    let mut out = Vec::with_capacity(44 + pcm.len());
    out.extend_from_slice(b"RIFF");
    out.extend_from_slice(&(36 + pcm.len() as u32).to_le_bytes());
    out.extend_from_slice(b"WAVEfmt ");
    out.extend_from_slice(&16u32.to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes());
    out.extend_from_slice(&channels.to_le_bytes());
    out.extend_from_slice(&rate.to_le_bytes());
    out.extend_from_slice(&(rate * frame as u32).to_le_bytes());
    out.extend_from_slice(&(frame as u16).to_le_bytes());
    out.extend_from_slice(&16u16.to_le_bytes());
    out.extend_from_slice(b"data");
    out.extend_from_slice(&(pcm.len() as u32).to_le_bytes());
    out.extend_from_slice(pcm);
    Ok((out, s, e))
}

pub fn call(app: &Shared, name: &str, a: &serde_json::Map<String, Value>) -> anyhow::Result<CallToolResult> {
    let ok = |v: Value| Ok(CallToolResult::structured(v));
    match name {
        "voice_get_today_plan" => {
            let profile = app.profile();
            let plan = app.ensure_plan()?;
            let reg = app.registry.read().unwrap();
            let ex = reg.get(&plan.exercise_id, plan.exercise_version).map(|e| e.raw.clone());
            let (today, _) = util::local_now(&profile.timezone);
            ok(json!({"local_date": today, "timezone": profile.timezone, "goal": profile.goal, "plan": plan,
                "exercise": ex, "participation": progress::participation(app, &today)}))
        }
        "voice_list_exercises" => {
            let reg = app.registry.read().unwrap();
            let list: Vec<Value> = reg.all_latest().iter().map(|e| e.raw.clone()).collect();
            let caps: Vec<Value> = progress::AREAS.iter().map(|x| json!({"area": x, "capability": progress::capability(x)})).collect();
            ok(json!({"exercises": list, "capability_matrix": caps}))
        }
        "voice_list_sessions" => ok(api::list_sessions_page(app, &ListQuery {
            from: arg_str(a, "from"),
            to: arg_str(a, "to"),
            cursor: a.get("cursor").and_then(|v| v.as_u64()).map(|v| v as usize),
            limit: a.get("limit").and_then(|v| v.as_u64()).map(|v| v as usize),
        })),
        "voice_get_session" => ok(api::session_view(app, &req_str(a, "session_id")?)?),
        "voice_get_analysis" => {
            let (_, mut an) = app.analysis_by_run(&req_str(a, "run_id")?)?;
            if !a.get("include_contour").and_then(|v| v.as_bool()).unwrap_or(false) {
                if let Some(o) = an.as_object_mut() {
                    o.insert("contour".into(), json!("omitted; pass include_contour=true"));
                }
            }
            ok(an)
        }
        "voice_compare_sessions" => ok(serde_json::to_value(compare::compare(app, &req_str(a, "take_a")?, &req_str(a, "take_b")?)?)?),
        "voice_get_deck" => {
            let mut v = crate::cards::today_queue(app)?;
            if a.get("include_log").and_then(|x| x.as_bool()).unwrap_or(false) {
                v["review_log"] = serde_json::to_value(crate::cards::reviews(app))?;
            }
            ok(v)
        }
        "voice_get_progress" => {
            let profile = app.profile();
            let (today, _) = util::local_now(&profile.timezone);
            let from = arg_str(a, "from");
            let to = arg_str(a, "to");
            let prompt = arg_str(a, "prompt_id");
            let takes: Vec<Value> = app.all_takes().iter()
                .filter(|t| t.original.is_some())
                .filter(|t| prompt.as_ref().map(|p| &t.prompt_id == p).unwrap_or(true))
                .filter(|t| {
                    let d = app.session(&t.session_id).map(|s| s.local_date).unwrap_or_default();
                    from.as_ref().map(|f| d >= *f).unwrap_or(true) && to.as_ref().map(|x| d <= *x).unwrap_or(true)
                })
                .map(|t| api::take_view(app, t)).collect();
            ok(json!({"skills": progress::skill_cards(app), "participation": progress::participation(app, &today),
                "takes": takes, "aggregation": "One entry per take; nothing is averaged across different tasks.",
                "missing_evaluation_assets": ["Natural-speech recordings with independently checked pitch contours", "Independent listener labels for lightness and resonance", "Clinician review of exercises"]}))
        }
        "voice_get_audio_clip" => {
            let t = app.take(&req_str(a, "take_id")?)?;
            let wav = app.paths.take_dir(&t.session_id, &t.id).join("analysis.wav");
            let bytes = std::fs::read(&wav).map_err(|_| anyhow::anyhow!("no decoded audio available for this take yet (analysis pending or failed)"))?;
            let start = a.get("start_s").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let end = a.get("end_s").and_then(|v| v.as_f64()).unwrap_or(start + 30.0);
            let (clip, s, e) = wav_clip(&bytes, start, end)?;
            let b64 = base64::engine::general_purpose::STANDARD.encode(&clip);
            let note = json!({"take_id": t.id, "start_s": s, "end_s": e, "mime": "audio/wav",
                "source": "derived analysis copy (16-bit PCM mono decoded from the original)",
                "original_sha256": t.original.as_ref().map(|o| o.sha256.clone()),
                "perception_status": "Audio content is attached. Model-perceived feedback stays disabled in Lilt until delivery to your client and perceptual judgements are validated. Do not claim to hear the voice."});
            Ok(CallToolResult::success(vec![ContentBlock::text(note.to_string()), ContentBlock::audio(b64, "audio/wav")]))
        }
        "voice_save_review" => {
            let input: validate::AgentReviewInput = serde_json::from_value(Value::Object(a.clone()))
                .map_err(|e| anyhow::anyhow!("invalid review structure: {e}"))?;
            let (r, created) = api::agent_review(app, input)?;
            ok(json!({"review_id": r.id, "created": created, "duplicate": !created}))
        }
        "voice_set_next_plan" => {
            let ex_id = req_str(a, "exercise_id")?;
            let ver = a.get("exercise_version").and_then(|v| v.as_u64()).ok_or_else(|| anyhow::anyhow!("missing exercise_version"))? as u32;
            let expected = a.get("expected_plan_version").and_then(|v| v.as_u64()).ok_or_else(|| anyhow::anyhow!("missing expected_plan_version"))? as u32;
            let rationale = req_str(a, "rationale")?;
            anyhow::ensure!(rationale.trim().len() >= 10, "rationale is required");
            for v in validate::prose_violations(&rationale, false) {
                anyhow::bail!("rationale rejected: {v}");
            }
            let ex = {
                let reg = app.registry.read().unwrap();
                reg.eligible(&ex_id, ver)?.clone()
            };
            let cue = arg_str(a, "cue_id");
            if let Some(c) = &cue {
                anyhow::ensure!(ex.cue(c).is_some(), "cue {c} is not in {ex_id} v{ver}");
            }
            let ladder = a.get("ladder_step").and_then(|v| v.as_u64()).map(|v| v as usize);
            if let Some(l) = ladder {
                anyhow::ensure!(l < ex.ladder.len(), "ladder_step out of range for {ex_id}");
            }
            let mut refs = vec![];
            for rid in a.get("evidence_review_ids").and_then(|v| v.as_array()).cloned().unwrap_or_default() {
                let rid = rid.as_str().unwrap_or_default().to_string();
                app.review(&rid).map_err(|_| anyhow::anyhow!("review {rid} does not exist"))?;
                refs.push(EvidenceRef { review_id: rid, pointer_id: None });
            }
            if let Some(cur) = app.current_plan() {
                anyhow::ensure!(!cur.paused || ex.id != cur.exercise_id, "the current plan is paused after a comfort report; only the learner can resume it");
            }
            let plan = app.write_plan(Plan {
                schema: "lilt.plan/1".into(), version: 0, created_utc: String::new(), author: "agent".into(),
                exercise_id: ex.id.clone(), exercise_version: ex.version, focus_area: ex.primary_area.clone(),
                cue_id: cue.or(Some(ex.primary_cue.id.clone())),
                ladder_step: ladder.or(if ex.ladder.is_empty() { None } else { Some(0) }),
                rationale, evidence_refs: refs, paused: false,
            }, Some(expected))?;
            ok(serde_json::to_value(plan)?)
        }
        "courses_list" => ok(crate::courses::list(app)),
        n if n.starts_with("syllabus_") => {
            let c = crate::courses::pick(app, arg_str(a, "course").as_deref())?;
            match n {
                "syllabus_list" => ok(syllabus::list(app, &c)),
                "syllabus_read" => ok(syllabus::read(app, &c, &req_str(a, "file")?, &arg_str(a, "from").unwrap_or_default())?),
                "syllabus_compare" => ok(syllabus::compare(app, &c, arg_str(a, "file").as_deref())?),
                "syllabus_write" => ok(syllabus::write(app, &c, &req_str(a, "file")?, &req_str(a, "markdown")?, &req_str(a, "note")?)?),
                "syllabus_delete" => ok(syllabus::delete(app, &c, &req_str(a, "file")?, &req_str(a, "note")?)?),
                "syllabus_history" => ok(syllabus::history(app, &c)),
                "syllabus_undo" => ok(syllabus::undo(app, &c)?),
                "syllabus_updates" => ok(crate::updates::list(app, &c)),
                "syllabus_apply_updates" => {
                    let choices: std::collections::BTreeMap<String, String> = a.get("choices").cloned().map(serde_json::from_value).transpose()
                        .map_err(|e| anyhow::anyhow!("choices must map update ids to \"yours\" or \"original\": {e}"))?.unwrap_or_default();
                    ok(crate::updates::apply(app, &c, &choices, &arg_str(a, "note").unwrap_or_default())?)
                }
                "syllabus_reset" => ok(syllabus::reset(app, &c, &req_str(a, "note")?)?),
                _ => Err(anyhow::anyhow!("unknown tool {name}")),
            }
        }
        _ => Err(anyhow::anyhow!("unknown tool {name}")),
    }
}

impl ServerHandler for LiltMcp {
    fn get_info(&self) -> ServerConfig {
        let mut info = Implementation::from_build_env();
        info.name = "lilt".into();
        info.title = Some("Lilt voice practice".into());
        info.version = env!("CARGO_PKG_VERSION").into();
        ServerConfig::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(info)
            .with_instructions(INSTRUCTIONS)
    }

    async fn list_tools(&self, _r: Option<PaginatedRequestParams>, _c: RequestContext<RoleServer>) -> Result<ListToolsResult, McpError> {
        Ok(ListToolsResult::with_all_items(tools()))
    }

    fn get_tool(&self, name: &str) -> Option<Tool> {
        tools().into_iter().find(|t| t.name == name)
    }

    async fn call_tool(&self, req: CallToolRequestParams, c: RequestContext<RoleServer>) -> Result<CallToolResponse, McpError> {
        let args = req.arguments.unwrap_or_default();
        let app = self.app.clone();
        let name = req.name.to_string();
        let client = c.peer.peer_info().map(|i| i.client_info.title.clone().unwrap_or_else(|| i.client_info.name.clone())).unwrap_or_default();
        crate::agents::record(&app, &client, &name);
        let res = tokio::task::spawn_blocking(move || call(&app, &name, &args))
            .await
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;
        Ok(match res {
            Ok(r) => r.into(),
            Err(e) => CallToolResult::error(vec![ContentBlock::text(format!("{e:#}"))]).into(),
        })
    }
}
