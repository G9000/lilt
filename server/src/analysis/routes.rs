//! A take's measurements, re-measuring, comparing two takes, and the job list.

use crate::analysis::{self, compare};
use crate::app::Shared;
use crate::http::R;
use crate::recordings::routes::take_view;
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::{get, post},
};
use serde::Deserialize;
use serde_json::{Value, json};

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/api/takes/{id}/analysis", get(take_analysis))
        .route("/api/takes/{id}/reanalyze", post(reanalyze))
        .route("/api/takes/{id}/remeasure", post(remeasure))
        .route("/api/remeasure", post(remeasure_stale))
        .route("/api/compare", get(compare_takes))
        .route("/api/jobs", get(list_jobs))
}

async fn take_analysis(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Value>> {
    let t = app.take(&id)?;
    let an = app.take_analysis(&t).ok_or_else(|| anyhow::anyhow!("analysis not found"))?;
    Ok(Json(an))
}

async fn reanalyze(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Value>> {
    analysis::retry_failed(&app, &id)?;
    Ok(Json(take_view(&app, &app.take(&id)?)))
}

async fn remeasure(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Value>> {
    analysis::remeasure(&app, &id)?;
    Ok(Json(take_view(&app, &app.take(&id)?)))
}

/// Re-measure every take analysed with an older method; the earlier results are kept.
async fn remeasure_stale(State(app): State<Shared>) -> R<Json<Value>> {
    Ok(Json(json!({ "queued": analysis::remeasure_stale(&app)?, "method": analysis::ANALYSIS_METHOD })))
}

#[derive(Deserialize)]
struct CompareQuery {
    a: String,
    b: String,
}

async fn compare_takes(State(app): State<Shared>, Query(q): Query<CompareQuery>) -> R<Json<compare::Comparison>> {
    Ok(Json(compare::compare(&app, &q.a, &q.b)?))
}

async fn list_jobs(State(app): State<Shared>) -> Json<Value> {
    Json(json!({"jobs": analysis::jobs(&app)}))
}
