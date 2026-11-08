//! Sessions and takes: creating them, the chunked upload, playback, and history.

use crate::app::Shared;
use crate::coach::routes::review_view;
use crate::http::{ApiError, R};
use crate::practice::exercises;
use crate::practice::model::Plan;
use crate::recordings::model::*;
use crate::{courses, recordings, util};
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
        .route(
            "/api/sessions/{id}",
            get(get_session).patch(patch_session).delete(delete_session),
        )
        .route("/api/takes", post(create_take))
        .route(
            "/api/takes/{id}",
            get(get_take).patch(patch_take).delete(delete_take),
        )
        .route("/api/takes/{id}/chunks/{seq}", put(put_chunk))
        .route("/api/takes/{id}/finalize", post(finalize))
        .route("/api/takes/{id}/audio", get(take_audio))
        .route("/api/takes/{id}/clip", get(take_clip))
        .route("/api/history", get(history))
}

async fn studio_session(State(app): State<Shared>, Query(q): Query<ListQuery>) -> R<Json<Session>> {
    Ok(Json(match q.course.as_deref() {
        Some(course) => recordings::studio_session_for_course(&app, course)?,
        None => recordings::studio_session(&app)?,
    }))
}

#[derive(Deserialize)]
pub struct ListQuery {
    pub course: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub cursor: Option<usize>,
    pub limit: Option<usize>,
}

pub fn list_sessions_page(app: &Shared, q: &ListQuery) -> Value {
    let mut all: Vec<Session> = app
        .sessions()
        .into_iter()
        .filter(|s| s.course == q.course.as_deref().unwrap_or(courses::DEFAULT))
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
                "id": s.id, "course": s.course, "task": s.task, "kind": s.kind, "state": s.state, "local_date": s.local_date,
                "started_utc": s.started_utc, "exercise_id": s.exercise_id, "focus_area": s.focus_area,
                "take_count": takes.len(),
                "statuses": takes.iter().map(|t| t.status).collect::<Vec<_>>(),
                "comfort": s.comfort,
            })
        })
        .collect();
    let next = if start.saturating_add(limit) < all.len() {
        Some(start + limit)
    } else {
        None
    };
    json!({"sessions": page, "next_cursor": next, "total": all.len()})
}

async fn list_sessions(State(app): State<Shared>, Query(q): Query<ListQuery>) -> R<Json<Value>> {
    courses::get(&app, q.course.as_deref().unwrap_or(courses::DEFAULT))?;
    Ok(Json(list_sessions_page(&app, &q)))
}

async fn create_session(
    State(app): State<Shared>,
    Json(req): Json<recordings::NewSession>,
) -> R<Json<Session>> {
    Ok(Json(recordings::create_session(&app, req)?))
}

pub fn take_view(app: &Shared, t: &Take) -> Value {
    let an = (t.course == courses::DEFAULT)
        .then(|| app.take_analysis(t))
        .flatten();
    let summary = an.as_ref().map(|a| {
        json!({
            "run_id": a["run_id"], "status": a["status"], "use_status": a["use_status"],
            "duration_s": a["measures"]["duration_s"]["value"],
            "voiced_duration_s": a["measures"]["voiced_duration_s"]["value"],
            "f0_median_hz": a["measures"]["f0_median_hz"]["value"],
            "formant_f2_median_hz": a["measures"]["formant_f2_median_hz"]["value"],
            "formant_f3_median_hz": a["measures"]["formant_f3_median_hz"]["value"],
            "quality_flags": a["quality_flags"],
            "pitch_algorithm": a["method"]["pitch_algorithm"],
        })
    });
    let mut v = serde_json::to_value(t).unwrap();
    v["analysis_summary"] = summary.unwrap_or(Value::Null);
    v["audio_url"] = json!(format!("/api/takes/{}/audio", t.id));
    v
}

pub fn session_view(app: &Shared, sid: &str) -> anyhow::Result<Value> {
    let s = app.session(sid)?;
    let takes: Vec<Value> = app
        .takes_in(sid)
        .iter()
        .map(|t| take_view(app, t))
        .collect();
    let reviews: Vec<Value> = app
        .reviews_in(sid)
        .iter()
        .map(|r| review_view(app, r))
        .collect();
    let ex = s
        .exercise_id
        .as_ref()
        .map(|id| exercises::json(app, id, s.exercise_version.unwrap_or(1)));
    Ok(json!({"session": s, "takes": takes, "reviews": reviews, "exercise": ex}))
}

async fn get_session(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Value>> {
    Ok(Json(session_view(&app, &id)?))
}

async fn patch_session(
    State(app): State<Shared>,
    Path(id): Path<String>,
    Json(req): Json<recordings::SessionUpdate>,
) -> R<Json<Session>> {
    let s = recordings::update_session(&app, &id, req)?;
    // Card decks get no coach review, so a strain or pain report pauses the plan right here.
    let hurt = matches!(
        s.comfort.as_ref().map(|c| &c.comfort),
        Some(Comfort::Strain | Comfort::Pain)
    );
    if s.kind == SessionKind::Deck
        && hurt
        && let Some(cur) = app.current_plan().filter(|p| !p.paused)
    {
        let v = cur.version;
        app.write_plan(Plan { paused: true, author: "learner".into(), rationale: "Paused after you reported strain or pain at the end of your cards. Rest, and resume when speaking feels comfortable.".into(), ..cur }, Some(v))?;
    }
    Ok(Json(s))
}

#[derive(Deserialize)]
struct DeleteQuery {
    reviews: Option<String>,
}

async fn delete_session(
    State(app): State<Shared>,
    Path(id): Path<String>,
    Query(q): Query<DeleteQuery>,
) -> R<Json<Value>> {
    Ok(Json(recordings::delete_session(
        &app,
        &id,
        q.reviews.as_deref() == Some("delete"),
    )?))
}

async fn create_take(
    State(app): State<Shared>,
    Json(req): Json<recordings::NewTake>,
) -> R<Json<Value>> {
    let t = recordings::create_take(&app, req)?;
    Ok(Json(take_view(&app, &t)))
}

async fn get_take(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Value>> {
    let t = app.take(&id)?;
    Ok(Json(take_view(&app, &t)))
}

async fn patch_take(
    State(app): State<Shared>,
    Path(id): Path<String>,
    Json(req): Json<recordings::TakeUpdate>,
) -> R<Json<Value>> {
    let t = recordings::update_take(&app, &id, req)?;
    Ok(Json(take_view(&app, &t)))
}

async fn delete_take(
    State(app): State<Shared>,
    Path(id): Path<String>,
    Query(q): Query<DeleteQuery>,
) -> R<Json<Value>> {
    Ok(Json(recordings::delete_take(
        &app,
        &id,
        q.reviews.as_deref() == Some("delete"),
    )?))
}

async fn put_chunk(
    State(app): State<Shared>,
    Path((id, seq)): Path<(String, u32)>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let claimed = headers
        .get("x-content-sha256")
        .and_then(|v| v.to_str().ok());
    match recordings::put_chunk(&app, &id, seq, &body, claimed) {
        Ok(recordings::ChunkOutcome::Stored) => (
            StatusCode::CREATED,
            Json(json!({"stored": true, "seq": seq})),
        )
            .into_response(),
        Ok(recordings::ChunkOutcome::AlreadyStored) => (
            StatusCode::OK,
            Json(json!({"stored": true, "duplicate": true, "seq": seq})),
        )
            .into_response(),
        Err(e @ (recordings::UploadError::Conflict(_) | recordings::UploadError::Finalized(_))) => {
            (StatusCode::CONFLICT, Json(json!({"error": e.to_string()}))).into_response()
        }
        Err(recordings::UploadError::BadChecksum(s)) => (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({"error": format!("checksum mismatch for chunk {s}")})),
        )
            .into_response(),
        Err(recordings::UploadError::Other(e)) => ApiError::from(e).into_response(),
    }
}

async fn finalize(
    State(app): State<Shared>,
    Path(id): Path<String>,
    Json(req): Json<recordings::FinalizeReq>,
) -> R<Json<Value>> {
    let t = recordings::finalize(&app, &id, req)?;
    Ok(Json(take_view(&app, &t)))
}

/// Serves the original bytes (Range supported). Playback never touches the file.
async fn take_audio(
    State(app): State<Shared>,
    Path(id): Path<String>,
    req: Request,
) -> R<Response> {
    let t = app.take(&id)?;
    let orig = t
        .original
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("recording not saved yet; not found"))?;
    let path = app.paths.take_dir(&t.session_id, &t.id).join(&orig.file);
    let mime = t
        .mime
        .split(';')
        .next()
        .unwrap_or("application/octet-stream")
        .to_string();
    let mime: mime::Mime = mime.parse().unwrap_or(mime::APPLICATION_OCTET_STREAM);
    let svc = tower_http::services::ServeFile::new_with_mime(path, &mime);
    let res = svc
        .oneshot(req)
        .await
        .map_err(|e| anyhow::anyhow!(e.to_string()))?;
    let mut res = res.map(Body::new);
    res.headers_mut().insert(
        header::CACHE_CONTROL,
        "private, max-age=3600".parse().unwrap(),
    );
    Ok(res)
}

#[derive(Deserialize)]
struct ClipQuery {
    start: Option<f64>,
    end: Option<f64>,
}

/// The longest clip you can save in one go, in seconds: plenty for a voice check, and a bound on memory.
const CLIP_MAX_S: f64 = 300.0;

/// Part of a take (or all of it) as a WAV file to keep or share, saved like any download. Cut from the
/// decoded analysis copy, so it exists once the take has been measured; the original is never touched.
async fn take_clip(
    State(app): State<Shared>,
    Path(id): Path<String>,
    Query(q): Query<ClipQuery>,
) -> R<Response> {
    let t = app.take(&id)?;
    let wav = app
        .paths
        .take_dir(&t.session_id, &t.id)
        .join("analysis.wav");
    let bytes = tokio::fs::read(&wav).await.map_err(|_| {
        ApiError::from(anyhow::anyhow!(
            "This take is still being measured; you can save a clip once it's done."
        ))
    })?;
    let start = q.start.unwrap_or(0.0);
    let end = q.end.unwrap_or(f64::MAX);
    let (clip, s, e) = recordings::clip::wav_clip(&bytes, start, end, CLIP_MAX_S)?;
    // Named by the day it was recorded where you are, not in UTC.
    let day = chrono::DateTime::parse_from_rfc3339(&t.created_utc)
        .map(|at| util::local_at(at.with_timezone(&chrono::Utc), &app.profile().timezone).0)
        .unwrap_or_else(|_| t.created_utc.chars().take(10).collect());
    let name = clip_name(&day, &t.prompt_id, s, e);
    Ok(Response::builder()
        .header(header::CONTENT_TYPE, "audio/wav")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{name}\""),
        )
        .header(header::CACHE_CONTROL, "no-store")
        .body(Body::from(clip))
        .unwrap())
}

/// `lilt-2026-11-09-market-0m03s-0m15s.wav`: the take's day, its text and the part saved, in safe characters.
fn clip_name(day: &str, prompt_id: &str, s: f64, e: f64) -> String {
    let day: String = day
        .chars()
        .take(10)
        .filter(|c| c.is_ascii_digit() || *c == '-')
        .collect();
    let text: String = prompt_id
        .rsplit(['.', '/'])
        .next()
        .unwrap_or("take")
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() {
                c.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .take(40)
        .collect();
    let at = |x: f64| format!("{}m{:02}s", (x as u64) / 60, (x as u64) % 60);
    format!("lilt-{day}-{text}-{}-{}.wav", at(s), at(e))
}

#[derive(Deserialize)]
struct HistoryQuery {
    course: Option<String>,
    prompt_id: Option<String>,
    role: Option<String>,
    days: Option<i64>,
}

async fn history(State(app): State<Shared>, Query(q): Query<HistoryQuery>) -> R<Json<Value>> {
    let course = courses::get(&app, q.course.as_deref().unwrap_or(courses::DEFAULT))?;
    let profile = app.profile();
    // Up to a century back, so the date arithmetic below can't overflow.
    let days = q
        .days
        .unwrap_or(profile.comparison_window_days as i64)
        .clamp(0, 36500);
    let (today, _) = util::local_now(&profile.timezone);
    let from = chrono::NaiveDate::parse_from_str(&today, "%Y-%m-%d")
        .map(|d| (d - chrono::Duration::days(days)).to_string())
        .unwrap_or_default();
    let takes: Vec<Value> = app
        .all_takes()
        .iter()
        .filter(|t| t.course == course.id && t.original.is_some())
        .filter(|t| {
            q.prompt_id
                .as_ref()
                .map(|p| &t.prompt_id == p)
                .unwrap_or(true)
        })
        .filter(|t| {
            q.role
                .as_ref()
                .map(|r| serde_json::to_value(t.role).unwrap() == r.as_str())
                .unwrap_or(true)
        })
        .filter(|t| {
            app.session(&t.session_id)
                .map(|s| s.local_date >= from)
                .unwrap_or(false)
        })
        .map(|t| {
            let mut v = take_view(&app, t);
            v["local_date"] = json!(
                app.session(&t.session_id)
                    .map(|s| s.local_date)
                    .unwrap_or_default()
            );
            v
        })
        .collect();
    Ok(Json(
        json!({"from": from, "to": today, "window_days": days, "takes": takes,
        "aggregation": "One point per take. No averaging across different tasks; filter by prompt to compare like with like."}),
    ))
}
