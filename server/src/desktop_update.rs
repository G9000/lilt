//! Private admission control for the desktop app's update and restart.

use crate::app::{App, Shared};
use crate::recordings::model::{Take, TakeStatus};
use crate::store;
use axum::{
    Json, Router,
    extract::State,
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
    routing::post,
};
use serde_json::json;
use std::fs;

#[derive(Debug, thiserror::Error)]
#[error("Lilt is preparing an update. You can record again after it restarts.")]
pub struct UpdateInProgress;

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/api/desktop/update/prepare", post(prepare))
        .route("/api/desktop/update/cancel", post(cancel))
}

fn authorized(app: &App, headers: &HeaderMap) -> bool {
    let Some(token) = app
        .config
        .desktop_token
        .as_deref()
        .filter(|t| !t.is_empty())
    else {
        return false;
    };
    headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        == Some(token)
}

fn refused(status: StatusCode, message: &str) -> Response {
    (status, Json(json!({ "error": message }))).into_response()
}

async fn prepare(State(app): State<Shared>, headers: HeaderMap) -> Response {
    if !authorized(&app, &headers) {
        return refused(
            StatusCode::FORBIDDEN,
            "Only the installed desktop app can prepare an update.",
        );
    }
    let mut state = app.write_lock.lock().unwrap();
    match unfinished_take(&app) {
        Ok(false) => {
            state.desktop_update_pending = true;
            StatusCode::NO_CONTENT.into_response()
        }
        Ok(true) => refused(
            StatusCode::CONFLICT,
            "Finish recording and let your take finish saving before updating Lilt. If an older unfinished take remains, review it in Recordings and finish saving it or remove it before updating.",
        ),
        Err(error) => {
            tracing::warn!("could not inspect recordings before desktop update: {error:#}");
            refused(
                StatusCode::CONFLICT,
                "Lilt couldn't check that every take has finished saving. Please try again before updating.",
            )
        }
    }
}

async fn cancel(State(app): State<Shared>, headers: HeaderMap) -> Response {
    if !authorized(&app, &headers) {
        return refused(
            StatusCode::FORBIDDEN,
            "Only the installed desktop app can cancel an update.",
        );
    }
    app.write_lock.lock().unwrap().desktop_update_pending = false;
    StatusCode::NO_CONTENT.into_response()
}

/// The normal history helpers omit unreadable records; update admission must not.
/// Called while holding write_lock, also held by create_take and status changes.
fn unfinished_take(app: &App) -> anyhow::Result<bool> {
    for session in fs::read_dir(app.paths.sessions())? {
        let session = session?;
        anyhow::ensure!(session.file_type()?.is_dir(), "unexpected session entry");
        let recordings = match fs::read_dir(session.path().join("recordings")) {
            Ok(entries) => entries,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => continue,
            Err(e) => return Err(e.into()),
        };
        for recording in recordings {
            let recording = recording?;
            anyhow::ensure!(
                recording.file_type()?.is_dir(),
                "unexpected recording entry"
            );
            let take: Take = store::read_json(&recording.path().join("take.json"))?;
            // Saved is the gap between finalization and durable analysis-job creation.
            // AnalysisPending is only written after the job exists and can resume on restart.
            if matches!(
                take.status,
                TakeStatus::Recording | TakeStatus::Saving | TakeStatus::Saved
            ) {
                return Ok(true);
            }
        }
    }
    Ok(false)
}

#[cfg(test)]
mod tests {
    use crate::app::{App, Shared};
    use crate::recordings::model::TakeStatus;
    use crate::test_support::{self, T, new_take, session};
    use axum::body::{Body, to_bytes};
    use axum::http::{Request, StatusCode};
    use axum::response::Response;
    use serde_json::json;
    use tower::ServiceExt;

    fn fixture(token: Option<&str>) -> (tempfile::TempDir, Shared) {
        let dir = tempfile::tempdir().unwrap();
        let mut cfg = test_support::config(dir.path());
        cfg.desktop_token = token.map(String::from);
        cfg.mcp_token = Some("mcp-token".into());
        let app = App::open(cfg).unwrap();
        (dir, app)
    }

    async fn request(app: &Shared, action: &str, token: Option<&str>) -> Response {
        let mut req = Request::builder()
            .method("POST")
            .uri(format!("/api/desktop/update/{action}"))
            .header("host", "127.0.0.1:7979");
        if let Some(token) = token {
            req = req.header("authorization", format!("Bearer {token}"));
        }
        crate::build_router(app.clone(), &app.config)
            .oneshot(req.body(Body::empty()).unwrap())
            .await
            .unwrap()
    }

    async fn admit(app: &Shared, sid: &str) -> Response {
        let req = Request::builder()
            .method("POST")
            .uri("/api/takes")
            .header("host", "127.0.0.1:7979")
            .header("content-type", "application/json")
            .body(Body::from(
                json!({
                    "take_id": uuid::Uuid::new_v4().to_string(), "session_id": sid,
                    "role": "free", "prompt_id": "test", "prompt_text": "Test", "mime": "audio/wav"
                })
                .to_string(),
            ))
            .unwrap();
        crate::build_router(app.clone(), &app.config)
            .oneshot(req)
            .await
            .unwrap()
    }

    #[tokio::test]
    async fn desktop_update_requires_its_own_token_and_configuration() {
        for configured in [None, Some(""), Some("desktop-secret")] {
            let (_dir, app) = fixture(configured);
            for action in ["prepare", "cancel"] {
                for token in [None, Some(""), Some("wrong"), Some("mcp-token")] {
                    assert_eq!(
                        request(&app, action, token).await.status(),
                        StatusCode::FORBIDDEN
                    );
                }
            }
        }
    }

    #[tokio::test]
    async fn desktop_update_preparation_blocks_new_takes_until_authenticated_cancel() {
        let (_dir, app) = fixture(Some("desktop-secret"));
        let s = session(&app);
        for _ in 0..2 {
            assert_eq!(
                request(&app, "prepare", Some("desktop-secret"))
                    .await
                    .status(),
                StatusCode::NO_CONTENT
            );
        }
        assert_eq!(admit(&app, &s.id).await.status(), StatusCode::CONFLICT);
        assert_eq!(
            request(&app, "cancel", None).await.status(),
            StatusCode::FORBIDDEN
        );
        assert_eq!(admit(&app, &s.id).await.status(), StatusCode::CONFLICT);
        assert_eq!(
            request(&app, "cancel", Some("desktop-secret"))
                .await
                .status(),
            StatusCode::NO_CONTENT
        );
        assert!(admit(&app, &s.id).await.status().is_success());
    }

    #[tokio::test]
    async fn desktop_update_waits_for_recording_saving_and_durable_analysis_enqueue() {
        let (_dir, app) = fixture(Some("desktop-secret"));
        let s = session(&app);
        let tid = new_take(&app, &s.id, T::default(), "audio/wav");
        for status in [TakeStatus::Recording, TakeStatus::Saving, TakeStatus::Saved] {
            let mut take = app.take(&tid).unwrap();
            take.status = status;
            app.save_take(&take).unwrap();
            let res = request(&app, "prepare", Some("desktop-secret")).await;
            assert_eq!(res.status(), StatusCode::CONFLICT, "{status:?}");
            let body: serde_json::Value =
                serde_json::from_slice(&to_bytes(res.into_body(), 4096).await.unwrap()).unwrap();
            assert!(body["error"].as_str().unwrap().contains("saving"));
        }
        // This is the exact boundary after finalize releases write_lock and before enqueue.
        assert!(
            !app.paths
                .jobs()
                .join(format!("analyze-{tid}.json"))
                .exists()
        );
        crate::analysis::enqueue_analysis(&app, &app.take(&tid).unwrap()).unwrap();
        assert!(
            app.paths
                .jobs()
                .join(format!("analyze-{tid}.json"))
                .exists()
        );
        assert_eq!(
            request(&app, "prepare", Some("desktop-secret"))
                .await
                .status(),
            StatusCode::NO_CONTENT
        );
    }

    #[tokio::test]
    async fn desktop_update_refuses_a_finalized_take_when_analysis_enqueue_fails() {
        let (_dir, app) = fixture(Some("desktop-secret"));
        let s = session(&app);
        let tid = new_take(&app, &s.id, T::default(), "audio/wav");
        crate::recordings::put_chunk(&app, &tid, 0, b"fixture audio", None).unwrap();
        // Deterministically stop finalize after the original is saved, before a job can exist.
        std::fs::remove_dir(app.paths.jobs()).unwrap();
        std::fs::write(app.paths.jobs(), b"unavailable job directory").unwrap();
        let finalize = || {
            crate::recordings::finalize(
                &app,
                &tid,
                crate::recordings::FinalizeReq {
                    chunk_count: 1,
                    interrupted: false,
                },
            )
        };
        assert!(finalize().is_err());
        let take = app.take(&tid).unwrap();
        assert_eq!(take.status, TakeStatus::Saved);
        assert!(take.original.is_some());
        assert_eq!(
            request(&app, "prepare", Some("desktop-secret"))
                .await
                .status(),
            StatusCode::CONFLICT
        );
        std::fs::remove_file(app.paths.jobs()).unwrap();
        std::fs::create_dir(app.paths.jobs()).unwrap();
        assert_eq!(finalize().unwrap().status, TakeStatus::AnalysisPending);
        assert_eq!(
            request(&app, "prepare", Some("desktop-secret"))
                .await
                .status(),
            StatusCode::NO_CONTENT
        );
    }

    #[tokio::test]
    async fn desktop_update_stays_unreachable_through_the_remote_gate() {
        let (_dir, app) = fixture(Some("desktop-secret"));
        crate::ai::oauth::set_public_url(&app, "https://lilt.example.com").unwrap();
        for host in ["lilt.example.com", "127.0.0.1:7979"] {
            for action in ["prepare", "cancel"] {
                let req = Request::builder()
                    .method("POST")
                    .uri(format!("/api/desktop/update/{action}"))
                    .header("host", host)
                    .header("cf-connecting-ip", "1.2.3.4")
                    .header("authorization", "Bearer desktop-secret")
                    .body(Body::empty())
                    .unwrap();
                let response = crate::build_router(app.clone(), &app.config)
                    .oneshot(req)
                    .await
                    .unwrap();
                assert_eq!(response.status(), StatusCode::NOT_FOUND);
            }
        }
    }

    #[tokio::test]
    async fn desktop_update_keeps_empty_interrupted_takes_for_owner_recovery() {
        let (_dir, app) = fixture(Some("desktop-secret"));
        let s = session(&app);
        let tid = new_take(&app, &s.id, T::default(), "audio/wav");
        let reopened = App::open(app.config.clone()).unwrap();
        assert_eq!(
            crate::recordings::reconcile_interrupted(&reopened).unwrap(),
            0
        );
        let take = reopened.take(&tid).unwrap();
        assert_eq!(take.status, TakeStatus::Recording);
        assert!(take.original.is_none());
        let response = request(&reopened, "prepare", Some("desktop-secret")).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body: serde_json::Value =
            serde_json::from_slice(&to_bytes(response.into_body(), 4096).await.unwrap()).unwrap();
        assert!(body["error"].as_str().unwrap().contains("Recordings"));
        assert!(
            reopened.take(&tid).is_ok(),
            "update admission never deletes a take"
        );
    }

    #[tokio::test]
    async fn desktop_update_fails_closed_on_unreadable_take_and_directory() {
        for bad_directory in [false, true] {
            let (_dir, app) = fixture(Some("desktop-secret"));
            let s = session(&app);
            if bad_directory {
                std::fs::write(
                    app.paths.session_dir(&s.id).join("recordings"),
                    b"not a directory",
                )
                .unwrap();
            } else {
                let tid = new_take(&app, &s.id, T::default(), "audio/wav");
                std::fs::write(app.paths.take_dir(&s.id, &tid).join("take.json"), b"broken")
                    .unwrap();
            }
            assert_eq!(
                request(&app, "prepare", Some("desktop-secret"))
                    .await
                    .status(),
                StatusCode::CONFLICT
            );
        }
    }
}
