//! Photos over HTTP: the list, adding one (the image as the request body), deleting, restoring
//! Lilt's own, and each added photo's image.

use crate::app::Shared;
use crate::http::R;
use crate::photos::{self, Index, Photo};
use axum::{
    Json, Router,
    body::{Body, Bytes},
    extract::{DefaultBodyLimit, Path, Query, Request, State},
    http::{HeaderValue, header},
    response::Response,
    routing::{delete, get, post},
};
use serde::Deserialize;
use tower::ServiceExt;

pub fn router() -> Router<Shared> {
    Router::new()
        .route(
            "/api/photos",
            get(list)
                .post(add)
                .layer(DefaultBodyLimit::max(photos::MAX_BYTES + 1024)),
        )
        .route("/api/photos/restore", post(restore))
        .route("/api/photos/{id}", delete(remove))
        .route("/api/photos/{id}/image", get(image))
}

async fn list(State(app): State<Shared>) -> R<Json<Index>> {
    Ok(Json(photos::index(&app)?))
}

#[derive(Deserialize)]
struct AddQuery {
    name: Option<String>,
}

async fn add(State(app): State<Shared>, Query(q): Query<AddQuery>, body: Bytes) -> R<Json<Photo>> {
    Ok(Json(photos::add(
        &app,
        q.name.as_deref().unwrap_or(""),
        &body,
    )?))
}

async fn remove(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Index>> {
    Ok(Json(photos::remove(&app, &id)?))
}

async fn restore(State(app): State<Shared>) -> R<Json<Index>> {
    Ok(Json(photos::restore(&app)?))
}

async fn image(State(app): State<Shared>, Path(id): Path<String>, req: Request) -> R<Response> {
    let (path, mime) = photos::file(&app, &id)?;
    let mime: mime::Mime = mime.parse().unwrap_or(mime::APPLICATION_OCTET_STREAM);
    let res = tower_http::services::ServeFile::new_with_mime(path, &mime)
        .oneshot(req)
        .await
        .map_err(|e| anyhow::anyhow!(e.to_string()))?;
    let mut res = res.map(Body::new);
    // An added photo never changes (a new one gets a new id).
    res.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, max-age=31536000, immutable"),
    );
    Ok(res)
}
