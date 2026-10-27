//! HTTP API for the web UI. MCP tools reuse the same functions.

use crate::app::Shared;
use crate::model::*;
use crate::{cards, coach, compare, jobs, progress, recordings, store, util, validate};
use axum::{
    Json, Router,
    body::{Body, Bytes},
    extract::{Path, Query, Request, State},
    http::{HeaderMap, StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post, put},
};
use serde::Deserialize;
use serde_json::{Value, json};
use tower::ServiceExt;

pub struct ApiError(StatusCode, String);

impl<E: Into<anyhow::Error>> From<E> for ApiError {
    fn from(e: E) -> Self {
        let e: anyhow::Error = e.into();
        let msg = format!("{e:#}");
        let code = if msg.contains("not found") || msg.contains("does not exist") {
            StatusCode::NOT_FOUND
        } else if msg.contains("stale plan") || msg.contains("different content") {
            StatusCode::CONFLICT
        } else {
            StatusCode::BAD_REQUEST
        };
        ApiError(code, msg)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(json!({"error": self.1}))).into_response()
    }
}

type R<T> = Result<T, ApiError>;

pub fn router(app: Shared) -> Router {
    Router::new()
        .route("/healthz", get(health))
        .route("/api/today", get(today))
        .route("/api/profile", get(get_profile).put(put_profile))
        .route("/api/exercises", get(list_exercises))
        .route("/api/texts", get(texts))
        .route("/api/studio/session", post(studio_session))
        .route("/api/exercises/{id}", get(get_exercise))
        .route("/api/deck/today", get(deck_today))
        .route("/api/deck/session", post(deck_session))
        .route("/api/deck/review", post(deck_review))
        .route("/api/plan", get(get_plan))
        .route("/api/plan/history", get(plan_history))
        .route("/api/plan/resume", post(resume_plan))
        .route("/api/plan/choose", post(choose_plan))
        .route("/api/sessions", get(list_sessions).post(create_session))
        .route("/api/sessions/{id}", get(get_session).patch(patch_session).delete(delete_session))
        .route("/api/sessions/{id}/review", post(review_session))
        .route("/api/takes", post(create_take))
        .route("/api/takes/{id}", get(get_take).patch(patch_take).delete(delete_take))
        .route("/api/takes/{id}/chunks/{seq}", put(put_chunk))
        .route("/api/takes/{id}/finalize", post(finalize))
        .route("/api/takes/{id}/audio", get(take_audio))
        .route("/api/takes/{id}/analysis", get(take_analysis))
        .route("/api/takes/{id}/reanalyze", post(reanalyze))
        .route("/api/history", get(history))
        .route("/api/compare", get(compare_takes))
        .route("/api/progress", get(get_progress))
        .route("/api/reviews/{id}", get(get_review))
        .route("/api/reviews/{id}/respond", post(respond))
        .route("/api/jobs", get(list_jobs))
        .route("/api/export", get(export))
        .layer(middleware::from_fn(same_origin_only))
        .with_state(app)
}

/// Block cross-site requests to the local API (a web page elsewhere could otherwise
/// POST to localhost). Same-origin browser requests and non-browser clients pass.
async fn same_origin_only(req: Request, next: Next) -> Response {
    if let Some(origin) = req.headers().get(header::ORIGIN).and_then(|v| v.to_str().ok()) {
        let host = req.headers().get(header::HOST).and_then(|v| v.to_str().ok()).unwrap_or("");
        let origin_host = origin.split("://").nth(1).unwrap_or("");
        if origin_host != host {
            return (StatusCode::FORBIDDEN, Json(json!({"error": "cross-origin request refused"}))).into_response();
        }
    }
    next.run(req).await
}

async fn health(State(app): State<Shared>) -> Json<Value> {
    let writable = store::write_atomic(&app.paths.tmp().join("health"), b"ok").is_ok();
    Json(json!({"ok": writable, "data_writable": writable, "version": env!("CARGO_PKG_VERSION")}))
}

fn exercise_json(app: &Shared, id: &str, v: u32) -> Value {
    app.registry.read().unwrap().get(id, v).map(|e| e.raw.clone()).unwrap_or(Value::Null)
}

async fn today(State(app): State<Shared>) -> R<Json<Value>> {
    let profile = app.profile();
    let plan = app.ensure_plan()?;
    let (date, local_ts) = util::local_now(&profile.timezone);
    let ex = exercise_json(&app, &plan.exercise_id, plan.exercise_version);
    let cue = plan.cue_id.as_ref().and_then(|c| {
        ex["cues"].as_array()?.iter().find(|x| x["id"] == c.as_str()).cloned()
    });
    let ladder_step = plan.ladder_step.and_then(|i| ex["ladder"].get(i).cloned());
    let sessions = app.sessions();
    let unfinished = sessions
        .iter()
        .rev()
        .find(|s| s.kind.is_guided() && s.state == SessionState::InProgress && s.local_date == date)
        .cloned();
    let latest_review = app.all_reviews().into_iter().last().map(|r| review_view(&app, &r));
    // Today's guided sessions (not Studio), so the home screen can show its state.
    let today_sessions: Vec<Value> = sessions
        .iter()
        .filter(|s| s.local_date == date && s.kind.is_guided())
        .map(|s| {
            let takes = app.takes_in(&s.id);
            json!({
                "id": s.id, "kind": s.kind, "state": s.state, "completed_utc": s.completed_utc,
                "take_count": takes.iter().filter(|t| t.original.is_some()).count(),
                "roles": takes.iter().filter(|t| t.original.is_some()).map(|t| json!({"role": t.role, "phase": t.phase, "self_report": t.self_report.is_some()})).collect::<Vec<_>>(),
                "comfort": s.comfort.is_some(),
            })
        })
        .collect();
    let participation = progress::participation(&app, &date);
    let reminder_due = profile.reminder_time.as_ref().map(|t| {
        let now_hm = &local_ts[11..16];
        now_hm >= t.as_str() && !participation["practised_today"].as_bool().unwrap_or(false)
    });
    let pending = jobs::jobs(&app).iter().filter(|j| j.status != "done").count();
    Ok(Json(json!({
        "local_date": date, "local_time": local_ts, "timezone": profile.timezone,
        "goal": profile.goal, "plan": plan, "exercise": ex, "cue": cue, "ladder_step": ladder_step,
        "session_minutes": profile.session_minutes,
        "unfinished_session": unfinished, "latest_review": latest_review, "today_sessions": today_sessions,
        "participation": participation,
        "reminder": {"time": profile.reminder_time, "due": reminder_due},
        "pending_jobs": pending,
        "external_processing": profile.external_processing,
        "prompts": app.prompts,
    })))
}

async fn get_profile(State(app): State<Shared>) -> Json<Profile> {
    Json(app.profile())
}

async fn put_profile(State(app): State<Shared>, Json(mut p): Json<Profile>) -> R<Json<Profile>> {
    if p.timezone.parse::<chrono_tz::Tz>().is_err() {
        return Err(anyhow::anyhow!("unknown timezone").into());
    }
    if let Some(t) = &p.reminder_time {
        if chrono::NaiveTime::parse_from_str(t, "%H:%M").is_err() {
            return Err(anyhow::anyhow!("reminder time must be HH:MM").into());
        }
    }
    if let Some([lo, hi]) = p.comfort_range_hz {
        if !(60.0..=700.0).contains(&lo) || !(60.0..=700.0).contains(&hi) || lo >= hi {
            return Err(anyhow::anyhow!("comfortable range must be two values between 60 and 700 Hz, low before high").into());
        }
    }
    if p.external_processing {
        return Err(anyhow::anyhow!("external processing is not implemented in this release; it stays off").into());
    }
    p.session_minutes = p.session_minutes.clamp(2, 30);
    p.schema = "lilt.profile/1".into();
    p.updated_utc = util::now_utc();
    store::write_json(&app.paths.profile(), &p)?;
    Ok(Json(p))
}

async fn texts(State(app): State<Shared>) -> Json<Value> {
    Json(app.texts.clone())
}

async fn studio_session(State(app): State<Shared>) -> R<Json<Session>> {
    Ok(Json(recordings::studio_session(&app)?))
}

async fn list_exercises(State(app): State<Shared>) -> Json<Value> {
    let reg = app.registry.read().unwrap();
    let list: Vec<Value> = reg.all_latest().iter().map(|e| e.raw.clone()).collect();
    let caps: Vec<Value> = progress::AREAS.iter().map(|a| json!({"area": a, "capability": progress::capability(a)})).collect();
    Json(json!({"exercises": list, "capability_matrix": caps}))
}

async fn get_exercise(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Value>> {
    let reg = app.registry.read().unwrap();
    let versions = reg.by_id.get(&id).ok_or_else(|| anyhow::anyhow!("exercise not found"))?;
    Ok(Json(json!({"versions": versions.values().map(|e| e.raw.clone()).collect::<Vec<_>>()})))
}

async fn get_plan(State(app): State<Shared>) -> R<Json<Plan>> {
    Ok(Json(app.ensure_plan()?))
}

async fn plan_history(State(app): State<Shared>) -> Json<Vec<Plan>> {
    Json(app.plan_history())
}

async fn deck_today(State(app): State<Shared>) -> R<Json<Value>> {
    let mut v = cards::today_queue(&app)?;
    // Practice days this week, for the calendar on the room's wall.
    v["participation"] = progress::participation(&app, v["local_date"].as_str().unwrap_or_default());
    Ok(Json(v))
}

async fn deck_session(State(app): State<Shared>) -> R<Json<Session>> {
    Ok(Json(recordings::deck_session(&app)?))
}

async fn deck_review(State(app): State<Shared>, Json(req): Json<cards::RateReq>) -> R<Json<Value>> {
    let ouch = req.rating == "ouch";
    let take = req.take_id.clone();
    let mut out = cards::rate(&app, req)?;
    if ouch {
        // Record the comfort report on the session the card was practised in.
        if let Some(sid) = take.and_then(|t| app.take(&t).ok()).map(|t| t.session_id) {
            let comfort = recordings::ComfortInput { comfort: Comfort::Strain, effort: None, hoarseness: false, likes_sound: None, note: Some("Rated a card as hurting or strained.".into()) };
            recordings::update_session(&app, &sid, recordings::SessionUpdate { comfort: Some(comfort), notes: None, complete: None })?;
        }
    }
    out["deck"] = cards::today_queue(&app)?;
    Ok(Json(out))
}

async fn resume_plan(State(app): State<Shared>) -> R<Json<Plan>> {
    cards::resume_suspended(&app)?;
    let cur = app.ensure_plan()?;
    if !cur.paused {
        return Ok(Json(cur));
    }
    let v = cur.version;
    let plan = Plan { paused: false, author: "learner".into(), rationale: "You resumed after a pause. Go gently and stop if anything hurts.".into(), ..cur };
    Ok(Json(app.write_plan(plan, Some(v))?))
}

#[derive(Deserialize)]
struct ChooseReq {
    exercise_id: String,
}

async fn choose_plan(State(app): State<Shared>, Json(req): Json<ChooseReq>) -> R<Json<Plan>> {
    let cur = app.ensure_plan()?;
    let ex = {
        let reg = app.registry.read().unwrap();
        let ex = reg.latest(&req.exercise_id).ok_or_else(|| anyhow::anyhow!("exercise not found"))?.clone();
        reg.eligible(&ex.id, ex.version)?;
        ex
    };
    let plan = Plan {
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
        evidence_refs: vec![],
        paused: false,
    };
    Ok(Json(app.write_plan(plan, Some(cur.version))?))
}

#[derive(Deserialize)]
pub struct ListQuery {
    pub from: Option<String>,
    pub to: Option<String>,
    pub cursor: Option<usize>,
    pub limit: Option<usize>,
}

pub fn list_sessions_page(app: &Shared, q: &ListQuery) -> Value {
    let mut all: Vec<Session> = app
        .sessions()
        .into_iter()
        .filter(|s| q.from.as_ref().map(|f| s.local_date >= *f).unwrap_or(true))
        .filter(|s| q.to.as_ref().map(|t| s.local_date <= *t).unwrap_or(true))
        .collect();
    all.reverse();
    let start = q.cursor.unwrap_or(0);
    let limit = q.limit.unwrap_or(20).clamp(1, 100);
    let page: Vec<Value> = all
        .iter()
        .skip(start)
        .take(limit)
        .map(|s| {
            let takes = app.takes_in(&s.id);
            json!({
                "id": s.id, "kind": s.kind, "state": s.state, "local_date": s.local_date,
                "started_utc": s.started_utc, "exercise_id": s.exercise_id, "focus_area": s.focus_area,
                "take_count": takes.len(),
                "statuses": takes.iter().map(|t| t.status).collect::<Vec<_>>(),
                "comfort": s.comfort,
            })
        })
        .collect();
    let next = if start + limit < all.len() { Some(start + limit) } else { None };
    json!({"sessions": page, "next_cursor": next, "total": all.len()})
}

async fn list_sessions(State(app): State<Shared>, Query(q): Query<ListQuery>) -> Json<Value> {
    Json(list_sessions_page(&app, &q))
}

async fn create_session(State(app): State<Shared>, Json(req): Json<recordings::NewSession>) -> R<Json<Session>> {
    Ok(Json(recordings::create_session(&app, req)?))
}

pub fn take_view(app: &Shared, t: &Take) -> Value {
    let an = app.take_analysis(t);
    let summary = an.as_ref().map(|a| json!({
        "run_id": a["run_id"], "status": a["status"], "use_status": a["use_status"],
        "duration_s": a["measures"]["duration_s"]["value"],
        "voiced_duration_s": a["measures"]["voiced_duration_s"]["value"],
        "f0_median_hz": a["measures"]["f0_median_hz"]["value"],
        "quality_flags": a["quality_flags"],
        "pitch_algorithm": a["method"]["pitch_algorithm"],
    }));
    let mut v = serde_json::to_value(t).unwrap();
    v["analysis_summary"] = summary.unwrap_or(Value::Null);
    v["audio_url"] = json!(format!("/api/takes/{}/audio", t.id));
    v
}

pub fn review_view(app: &Shared, r: &Review) -> Value {
    let mut deleted: Vec<String> = r
        .active_pointer
        .iter()
        .chain(r.other_observations.iter())
        .flat_map(|p| p.evidence.iter())
        .flat_map(|e| [e.take_id.clone(), e.comparison_take_id.clone()])
        .flatten()
        .chain(r.take_ids.iter().cloned())
        .filter(|t| app.session_of_take(t).is_none())
        .collect();
    deleted.sort();
    deleted.dedup();
    let mut v = serde_json::to_value(r).unwrap();
    v["responses"] = serde_json::to_value(app.review_responses(r)).unwrap();
    v["evidence_deleted"] = json!(deleted);
    v
}

pub fn session_view(app: &Shared, sid: &str) -> anyhow::Result<Value> {
    let s = app.session(sid)?;
    let takes: Vec<Value> = app.takes_in(sid).iter().map(|t| take_view(app, t)).collect();
    let reviews: Vec<Value> = app.reviews_in(sid).iter().map(|r| review_view(app, r)).collect();
    let ex = s.exercise_id.as_ref().map(|id| exercise_json(app, id, s.exercise_version.unwrap_or(1)));
    Ok(json!({"session": s, "takes": takes, "reviews": reviews, "exercise": ex}))
}

async fn get_session(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Value>> {
    Ok(Json(session_view(&app, &id)?))
}

async fn patch_session(State(app): State<Shared>, Path(id): Path<String>, Json(req): Json<recordings::SessionUpdate>) -> R<Json<Session>> {
    let s = recordings::update_session(&app, &id, req)?;
    // Card decks get no coach review, so a strain or pain report pauses the plan right here.
    let hurt = matches!(s.comfort.as_ref().map(|c| &c.comfort), Some(Comfort::Strain | Comfort::Pain));
    if s.kind == SessionKind::Deck && hurt {
        if let Some(cur) = app.current_plan().filter(|p| !p.paused) {
            let v = cur.version;
            app.write_plan(Plan { paused: true, author: "learner".into(), rationale: "Paused after you reported strain or pain at the end of your cards. Rest, and resume when speaking feels comfortable.".into(), ..cur }, Some(v))?;
        }
    }
    Ok(Json(s))
}

#[derive(Deserialize)]
struct DeleteQuery {
    reviews: Option<String>,
}

async fn delete_session(State(app): State<Shared>, Path(id): Path<String>, Query(q): Query<DeleteQuery>) -> R<Json<Value>> {
    Ok(Json(recordings::delete_session(&app, &id, q.reviews.as_deref() == Some("delete"))?))
}

async fn review_session(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Value>> {
    let r = coach::review_session(&app, &id)?;
    Ok(Json(review_view(&app, &r)))
}

async fn create_take(State(app): State<Shared>, Json(req): Json<recordings::NewTake>) -> R<Json<Value>> {
    let t = recordings::create_take(&app, req)?;
    Ok(Json(take_view(&app, &t)))
}

async fn get_take(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Value>> {
    let t = app.take(&id)?;
    Ok(Json(take_view(&app, &t)))
}

async fn patch_take(State(app): State<Shared>, Path(id): Path<String>, Json(req): Json<recordings::TakeUpdate>) -> R<Json<Value>> {
    let t = recordings::update_take(&app, &id, req)?;
    Ok(Json(take_view(&app, &t)))
}

async fn delete_take(State(app): State<Shared>, Path(id): Path<String>, Query(q): Query<DeleteQuery>) -> R<Json<Value>> {
    Ok(Json(recordings::delete_take(&app, &id, q.reviews.as_deref() == Some("delete"))?))
}

async fn put_chunk(State(app): State<Shared>, Path((id, seq)): Path<(String, u32)>, headers: HeaderMap, body: Bytes) -> Response {
    let claimed = headers.get("x-content-sha256").and_then(|v| v.to_str().ok());
    match recordings::put_chunk(&app, &id, seq, &body, claimed) {
        Ok(recordings::ChunkOutcome::Stored) => (StatusCode::CREATED, Json(json!({"stored": true, "seq": seq}))).into_response(),
        Ok(recordings::ChunkOutcome::AlreadyStored) => (StatusCode::OK, Json(json!({"stored": true, "duplicate": true, "seq": seq}))).into_response(),
        Err(recordings::UploadError::Conflict(s)) => (StatusCode::CONFLICT, Json(json!({"error": format!("chunk {s} already stored with different content")}))).into_response(),
        Err(recordings::UploadError::BadChecksum(s)) => (StatusCode::UNPROCESSABLE_ENTITY, Json(json!({"error": format!("checksum mismatch for chunk {s}")}))).into_response(),
        Err(recordings::UploadError::Other(e)) => ApiError::from(e).into_response(),
    }
}

async fn finalize(State(app): State<Shared>, Path(id): Path<String>, Json(req): Json<recordings::FinalizeReq>) -> R<Json<Value>> {
    let t = recordings::finalize(&app, &id, req)?;
    Ok(Json(take_view(&app, &t)))
}

/// Serves the original bytes (Range supported). Playback never touches the file.
async fn take_audio(State(app): State<Shared>, Path(id): Path<String>, req: Request) -> R<Response> {
    let t = app.take(&id)?;
    let orig = t.original.as_ref().ok_or_else(|| anyhow::anyhow!("recording not saved yet; not found"))?;
    let path = app.paths.take_dir(&t.session_id, &t.id).join(&orig.file);
    let mime = t.mime.split(';').next().unwrap_or("application/octet-stream").to_string();
    let mime: mime::Mime = mime.parse().unwrap_or(mime::APPLICATION_OCTET_STREAM);
    let svc = tower_http::services::ServeFile::new_with_mime(path, &mime);
    let res = svc.oneshot(req).await.map_err(|e| anyhow::anyhow!(e.to_string()))?;
    let mut res = res.map(Body::new);
    res.headers_mut().insert(header::CACHE_CONTROL, "private, max-age=3600".parse().unwrap());
    Ok(res)
}

async fn take_analysis(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Value>> {
    let t = app.take(&id)?;
    let an = app.take_analysis(&t).ok_or_else(|| anyhow::anyhow!("analysis not found"))?;
    Ok(Json(an))
}

async fn reanalyze(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Value>> {
    jobs::retry_failed(&app, &id)?;
    Ok(Json(take_view(&app, &app.take(&id)?)))
}

#[derive(Deserialize)]
struct HistoryQuery {
    prompt_id: Option<String>,
    role: Option<String>,
    days: Option<i64>,
}

async fn history(State(app): State<Shared>, Query(q): Query<HistoryQuery>) -> Json<Value> {
    let profile = app.profile();
    let days = q.days.unwrap_or(profile.comparison_window_days as i64);
    let (today, _) = util::local_now(&profile.timezone);
    let from = chrono::NaiveDate::parse_from_str(&today, "%Y-%m-%d").map(|d| (d - chrono::Duration::days(days)).to_string()).unwrap_or_default();
    let takes: Vec<Value> = app
        .all_takes()
        .iter()
        .filter(|t| t.original.is_some())
        .filter(|t| q.prompt_id.as_ref().map(|p| &t.prompt_id == p).unwrap_or(true))
        .filter(|t| q.role.as_ref().map(|r| serde_json::to_value(t.role).unwrap() == r.as_str()).unwrap_or(true))
        .filter(|t| app.session(&t.session_id).map(|s| s.local_date >= from).unwrap_or(false))
        .map(|t| {
            let mut v = take_view(&app, t);
            v["local_date"] = json!(app.session(&t.session_id).map(|s| s.local_date).unwrap_or_default());
            v
        })
        .collect();
    Json(json!({"from": from, "to": today, "window_days": days, "takes": takes,
        "aggregation": "One point per take. No averaging across different tasks; filter by prompt to compare like with like."}))
}

#[derive(Deserialize)]
struct CompareQuery {
    a: String,
    b: String,
}

async fn compare_takes(State(app): State<Shared>, Query(q): Query<CompareQuery>) -> R<Json<compare::Comparison>> {
    Ok(Json(compare::compare(&app, &q.a, &q.b)?))
}

async fn get_progress(State(app): State<Shared>) -> Json<Value> {
    let profile = app.profile();
    let (today, _) = util::local_now(&profile.timezone);
    Json(json!({
        "skills": progress::skill_cards(&app),
        "participation": progress::participation(&app, &today),
        "goal": profile.goal,
        "missing_evaluation_assets": [
            "Natural-speech recordings with independently checked pitch contours (pitch measures stay descriptive only)",
            "Independent listener labels for lightness, resonance and perceived femininity (automatic judgements disabled)",
            "Clinician review of the exercise set",
        ],
    }))
}

async fn get_review(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Value>> {
    let r = app.review(&id)?;
    Ok(Json(review_view(&app, &r)))
}

#[derive(Deserialize)]
struct RespondReq {
    pointer_id: Option<String>,
    response: String,
    note: Option<String>,
    chosen_exercise_id: Option<String>,
}

async fn respond(State(app): State<Shared>, Path(id): Path<String>, Json(req): Json<RespondReq>) -> R<Json<Value>> {
    let plan = coach::respond(&app, &id, ReviewResponse {
        review_id: id.clone(),
        pointer_id: req.pointer_id,
        response: req.response,
        note: req.note.filter(|n| !n.trim().is_empty()),
        chosen_exercise_id: req.chosen_exercise_id,
        created_utc: String::new(),
    })?;
    let r = app.review(&id)?;
    Ok(Json(json!({"review": review_view(&app, &r), "plan": plan})))
}

async fn list_jobs(State(app): State<Shared>) -> Json<Value> {
    Json(json!({"jobs": jobs::jobs(&app)}))
}

/// Zip of the whole data directory, streamed from a temp file.
async fn export(State(app): State<Shared>) -> R<Response> {
    let app2 = app.clone();
    let path = tokio::task::spawn_blocking(move || crate::export::write_zip(&app2)).await.map_err(|e| anyhow::anyhow!(e.to_string()))??;
    let file = tokio::fs::File::open(&path).await?;
    let _ = std::fs::remove_file(&path); // unlinked; the open handle keeps streaming
    let stream = tokio_util::io::ReaderStream::new(file);
    let (date, _) = util::local_now(&app.profile().timezone);
    Ok(Response::builder()
        .header(header::CONTENT_TYPE, "application/zip")
        .header(header::CONTENT_DISPOSITION, format!("attachment; filename=\"lilt-export-{date}.zip\""))
        .body(Body::from_stream(stream))
        .unwrap())
}

pub fn agent_review(app: &Shared, input: validate::AgentReviewInput) -> anyhow::Result<(Review, bool)> {
    validate::save_agent_review(app, input)
}
