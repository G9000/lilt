//! Settings → Connect your AI: how to connect each kind of app, the public address, and sign-ins.

use crate::ai::{agents, oauth};
use crate::app::Shared;
use crate::http::R;
use axum::{
    Json, Router,
    extract::{Path, State},
    http::{HeaderMap, header},
    routing::{delete, get, post, put},
};
use serde::Deserialize;
use serde_json::{Value, json};

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/api/connect", get(connect_info))
        .route("/api/connect/address", put(connect_address))
        .route("/api/connect/code", post(connect_code))
        .route("/api/connect/{id}", delete(connect_remove))
}

/// What Settings → Connect your AI shows: how to connect each kind of app from this computer, the
/// public address for cloud apps, the apps signed in through it, and recent activity.
async fn connect_info(State(app): State<Shared>, headers: HeaderMap) -> Json<Value> {
    let host = headers.get(header::HOST).and_then(|v| v.to_str().ok()).unwrap_or("127.0.0.1:7878");
    let in_docker = std::path::Path::new("/.dockerenv").exists();
    let stdio = if in_docker {
        json!({ "command": "docker", "args": ["exec", "-i", "lilt", "lilt", "mcp-stdio"] })
    } else {
        let exe = std::env::current_exe().map(|p| p.display().to_string()).unwrap_or_else(|_| "lilt".into());
        let abs = |p: &std::path::Path| std::fs::canonicalize(p).unwrap_or_else(|_| p.to_path_buf()).display().to_string();
        json!({ "command": exe, "args": ["mcp-stdio"], "env": { "LILT_DATA_DIR": abs(&app.paths.root), "LILT_CONTENT_DIR": abs(&app.config.content_dir) } })
    };
    let public = oauth::public_url(&app);
    Json(json!({
        "local_url": format!("http://{host}/mcp"),
        "stdio": stdio,
        "token_required": app.config.mcp_token.is_some(),
        "public_url": public,
        "public_mcp_url": public.as_ref().map(|u| format!("{u}/mcp")),
        "connections": oauth::connections(&app),
        "activity": agents::recent(&app),
    }))
}

#[derive(Deserialize)]
struct Address { url: String }

async fn connect_address(State(app): State<Shared>, Json(b): Json<Address>) -> R<Json<Value>> {
    Ok(Json(json!({ "public_url": oauth::set_public_url(&app, &b.url)? })))
}

async fn connect_code(State(app): State<Shared>) -> Json<Value> {
    Json(oauth::new_pairing_code(&app))
}

async fn connect_remove(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Value>> {
    oauth::disconnect(&app, &id)?;
    Ok(Json(json!({ "removed": id })))
}
