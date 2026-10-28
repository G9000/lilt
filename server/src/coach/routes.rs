//! Coach reviews: asking for one, reading it, and the learner's response.

use crate::app::Shared;
use crate::coach::model::{Review, ReviewResponse};
use crate::coach;
use crate::http::R;
use axum::{
    Json, Router,
    extract::{Path, State},
    routing::{get, post},
};
use serde::Deserialize;
use serde_json::{Value, json};

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/api/sessions/{id}/review", post(review_session))
        .route("/api/reviews/{id}", get(get_review))
        .route("/api/reviews/{id}/respond", post(respond))
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

async fn review_session(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Value>> {
    let r = coach::review_session(&app, &id)?;
    Ok(Json(review_view(&app, &r)))
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
