//! Sessions and takes: creating them, the chunked upload, playback, and history.

use crate::app::Shared;
use crate::coach::routes::review_view;
use crate::http::{ApiError, R};
use crate::practice::exercises;
use crate::practice::model::Plan;
use crate::recordings::model::*;
use crate::{recordings, util};
use axum::{
    Json, Router,
    body::{Body, Bytes},
    extract::{Path, Query, Request, State},
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, post, put},
};
use serde::Deserialize;
use serde_json::{Value, json};
use tower::ServiceExt;

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/api/studio/session", post(studio_session))
        .route("/api/sessions", get(list_sessions).post(create_session))
        .route("/api/sessions/{id}", get(get_session).patch(patch_session).delete(delete_session))
        .route("/api/takes", post(create_take))
        .route("/api/takes/{id}", get(get_take).patch(patch_take).delete(delete_take))
        .route("/api/takes/{id}/chunks/{seq}", put(put_chunk))
        .route("/api/takes/{id}/finalize", post(finalize))
        .route("/api/takes/{id}/audio", get(take_audio))
        .route("/api/history", get(history))
}

async fn studio_session(State(app): State<Shared>) -> R<Json<Session>> {
    Ok(Json(recordings::studio_session(&app)?))
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

pub fn session_view(app: &Shared, sid: &str) -> anyhow::Result<Value> {
    let s = app.session(sid)?;
    let takes: Vec<Value> = app.takes_in(sid).iter().map(|t| take_view(app, t)).collect();
    let reviews: Vec<Value> = app.reviews_in(sid).iter().map(|r| review_view(app, r)).collect();
    let ex = s.exercise_id.as_ref().map(|id| exercises::json(app, id, s.exercise_version.unwrap_or(1)));
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
