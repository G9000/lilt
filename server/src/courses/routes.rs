//! Courses, their texts, your own copy of a syllabus (updates, history, undo, reset), and the mixtape.

use crate::app::Shared;
use crate::courses::{self, remix, syllabus, updates};
use crate::http::R;
use axum::{
    Json, Router,
    extract::{Query, State},
    routing::{get, post},
};
use serde::Deserialize;
use serde_json::Value;

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/api/texts", get(texts))
        .route("/api/courses", get(list_courses))
        .route("/api/syllabus/updates", get(syllabus_updates).post(apply_syllabus_updates))
        .route("/api/syllabus/history", get(syllabus_history))
        .route("/api/syllabus/undo", post(syllabus_undo))
        .route("/api/syllabus/reset", post(syllabus_reset))
        .route("/api/syllabus", get(syllabus_files))
        .route("/api/mixtape/remix", post(remix::remix))
        .route("/api/mixtape/chapter", post(remix::add_chapter))
}

/// `?course=<id>`, the app's course when left out.
#[derive(Deserialize, Default)]
struct CourseQuery {
    course: Option<String>,
}

/// A course's texts (`?course=<id>`), the app's course when left out.
async fn texts(State(app): State<Shared>, Query(q): Query<CourseQuery>) -> R<Json<Value>> {
    let c = courses::pick(&app, q.course.as_deref())?;
    Ok(Json(syllabus::course_texts(&app, &c)?))
}

/// Every course: what it is, and whether you're using your own copy.
async fn list_courses(State(app): State<Shared>) -> Json<Value> {
    Json(courses::list(&app))
}

/// What Lilt's original changed since your own version was made, and how each change would be handled.
async fn syllabus_updates(State(app): State<Shared>, Query(q): Query<CourseQuery>) -> R<Json<Value>> {
    let c = courses::pick(&app, q.course.as_deref())?;
    Ok(Json(updates::list(&app, &c)))
}

#[derive(Deserialize)]
struct ApplyUpdates {
    #[serde(default)]
    choices: std::collections::BTreeMap<String, String>,
    #[serde(default)]
    note: String,
}

async fn apply_syllabus_updates(State(app): State<Shared>, Query(q): Query<CourseQuery>, Json(b): Json<ApplyUpdates>) -> R<Json<Value>> {
    let c = courses::pick(&app, q.course.as_deref())?;
    Ok(Json(updates::apply(&app, &c, &b.choices, &b.note)?))
}

async fn syllabus_history(State(app): State<Shared>, Query(q): Query<CourseQuery>) -> R<Json<Value>> {
    let c = courses::pick(&app, q.course.as_deref())?;
    Ok(Json(syllabus::history(&app, &c)))
}

async fn syllabus_undo(State(app): State<Shared>, Query(q): Query<CourseQuery>) -> R<Json<Value>> {
    let c = courses::pick(&app, q.course.as_deref())?;
    Ok(Json(syllabus::undo(&app, &c)?))
}

#[derive(Deserialize)]
struct ResetBody {
    note: String,
}

/// Go back to a course's original; kept in its history, so it can be undone.
async fn syllabus_reset(State(app): State<Shared>, Query(q): Query<CourseQuery>, Json(b): Json<ResetBody>) -> R<Json<Value>> {
    let c = courses::pick(&app, q.course.as_deref())?;
    Ok(Json(syllabus::reset(&app, &c, &b.note)?))
}

/// A course's files (chapters with their titles and counts) and how your copy differs from the original.
async fn syllabus_files(State(app): State<Shared>, Query(q): Query<CourseQuery>) -> R<Json<Value>> {
    let c = courses::pick(&app, q.course.as_deref())?;
    Ok(Json(syllabus::list(&app, &c)))
}
