//! HTTP API for the web UI: the error type, the cross-origin guard, and the app-wide routes.
//! Each feature serves its own routes from its `routes` module; MCP tools reuse the same functions.

use crate::app::Shared;
use crate::practice::model::Profile;
use crate::{ai, analysis, coach, courses, practice, recordings, store, util};
use axum::{
    Json, Router,
    body::Body,
    extract::{Request, State},
    http::{StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::get,
};
use serde_json::{Value, json};

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

pub type R<T> = Result<T, ApiError>;

pub fn router(app: Shared) -> Router {
    Router::new()
        .route("/healthz", get(health))
        .route("/api/profile", get(get_profile).put(put_profile))
        .route("/api/export", get(export))
        .merge(practice::routes::router())
        .merge(recordings::routes::router())
        .merge(analysis::routes::router())
        .merge(coach::routes::router())
        .merge(courses::routes::router())
        .merge(ai::routes::router())
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
        return Err(anyhow::anyhow!("external recording analysis is not implemented in this release; it stays off").into());
    }
    p.session_minutes = p.session_minutes.clamp(2, 30);
    if let Some(n) = &p.room_note {
        if n.chars().count() > 280 {
            return Err(anyhow::anyhow!("the note can hold up to 280 characters").into());
        }
    }
    p.schema = "lilt.profile/1".into();
    p.updated_utc = util::now_utc();
    store::write_json(&app.paths.profile(), &p)?;
    Ok(Json(p))
}

/// Zip of the whole data directory, streamed from a temp file.
async fn export(State(app): State<Shared>) -> R<Response> {
    let app2 = app.clone();
    let path = tokio::task::spawn_blocking(move || store::export::write_zip(&app2)).await.map_err(|e| anyhow::anyhow!(e.to_string()))??;
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
