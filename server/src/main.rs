mod api;
mod app;
mod cards;
mod coach;
mod compare;
mod exercises;
mod export;
mod jobs;
mod mcp;
mod model;
mod progress;
mod recordings;
mod store;
mod syllabus;
mod texts;
mod updates;
mod util;
mod validate;
#[cfg(test)]
mod tests;

use anyhow::Result;
use axum::{
    Router,
    extract::Request,
    http::{StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
};
use rmcp::transport::streamable_http_server::{
    StreamableHttpServerConfig, StreamableHttpService, session::local::LocalSessionManager,
};
use std::sync::Arc;
use tower_http::services::{ServeDir, ServeFile};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "lilt=info,tower_http=warn".into()))
        .with_writer(std::io::stderr)
        .init();
    let config = app::Config::from_env();
    let mode = std::env::args().nth(1).unwrap_or_else(|| "serve".into());
    let app = app::App::open(config.clone())?;
    match mode.as_str() {
        "mcp-stdio" => {
            use rmcp::ServiceExt;
            let svc = mcp::LiltMcp::new(app).serve(rmcp::transport::stdio()).await?;
            svc.waiting().await?;
            Ok(())
        }
        "serve" => serve(app, config).await,
        other => anyhow::bail!("unknown command {other}; use `serve` or `mcp-stdio`"),
    }
}

pub fn build_router(app: app::Shared, config: &app::Config) -> Router {
    let mcp_app = app.clone();
    let mcp_service: StreamableHttpService<mcp::LiltMcp, LocalSessionManager> = StreamableHttpService::new(
        move || Ok(mcp::LiltMcp::new(mcp_app.clone())),
        Default::default(),
        StreamableHttpServerConfig::default().with_json_response(true),
    );
    let token = Arc::new(config.mcp_token.clone());
    let mcp_router = Router::new()
        .nest_service("/mcp", mcp_service)
        .layer(middleware::from_fn(move |req: Request, next: Next| {
            let token = token.clone();
            async move { check_token(token.as_ref().as_deref(), req, next).await }
        }));
    let index = config.web_dir.join("index.html");
    let static_files = ServeDir::new(&config.web_dir).fallback(ServeFile::new(index));
    // Pictures used by the practice texts' Markdown (content/texts/images), as `images/<file>`,
    // and example recordings for the texts (content/texts/audio), as `audio/<file>`.
    let text_images = ServeDir::new(config.content_dir.join("texts/images"));
    let text_audio = ServeDir::new(config.content_dir.join("texts/audio"));
    api::router(app)
        .merge(mcp_router)
        .nest_service("/texts/images", text_images)
        .nest_service("/texts/audio", text_audio)
        .fallback_service(static_files)
}

async fn check_token(token: Option<&str>, req: Request, next: Next) -> Response {
    if let Some(t) = token {
        let ok = req
            .headers()
            .get(header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .map(|v| v == format!("Bearer {t}"))
            .unwrap_or(false);
        if !ok {
            return (StatusCode::UNAUTHORIZED, "missing or wrong bearer token").into_response();
        }
    }
    next.run(req).await
}

async fn serve(app: app::Shared, config: app::Config) -> Result<()> {
    let requeued = jobs::reconcile(&app)?;
    let interrupted = recordings::reconcile_interrupted(&app)?;
    tracing::info!("startup: {requeued} job(s) requeued, {interrupted} interrupted take(s) recovered");
    tokio::spawn(jobs::worker(app.clone()));
    let router = build_router(app.clone(), &config);
    let listener = tokio::net::TcpListener::bind(&config.bind).await?;
    tracing::info!("Lilt listening on http://{} (data: {})", config.bind, app.paths.root.display());
    axum::serve(listener, router)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await?;
    Ok(())
}
