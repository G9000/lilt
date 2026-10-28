mod api;
mod app;
mod cards;
mod coach;
mod chatgpt;
mod compare;
mod courses;
mod exercises;
mod export;
mod jobs;
mod mcp;
mod oauth;
mod remix;
mod agents;
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
use axum::{Router, middleware};
use rmcp::transport::streamable_http_server::{
    StreamableHttpServerConfig, StreamableHttpService, session::local::LocalSessionManager,
};
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
        // Host names are checked by `oauth::gate` instead: local ones, or the saved public address
        // with a signed-in app.
        StreamableHttpServerConfig::default().with_json_response(true).disable_allowed_hosts(),
    );
    let mcp_router = Router::new().nest_service("/mcp", mcp_service);
    let index = config.web_dir.join("index.html");
    let static_files = ServeDir::new(&config.web_dir).fallback(ServeFile::new(index));
    // Each course's pictures and example recordings, as `images/<file>` and `audio/<file>` in its
    // Markdown, at /courses/<id>/images and /courses/<id>/audio; the app's course (Practice) also
    // at /texts/images and /texts/audio.
    let mut router = api::router(app.clone())
        .merge(mcp_router)
        .merge(oauth::router(app.clone()))
        .merge(chatgpt::router(app.clone()));
    for c in courses::all(&app) {
        for part in ["images", "audio"] {
            router = router.nest_service(&format!("/courses/{}/{part}", c.id), ServeDir::new(c.dir.join(part)));
            if c.id == courses::DEFAULT {
                router = router.nest_service(&format!("/texts/{part}"), ServeDir::new(c.dir.join(part)));
            }
        }
    }
    router
        .fallback_service(static_files)
        .layer(middleware::from_fn_with_state(app, oauth::gate))
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
