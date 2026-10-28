//! Connecting AI apps: sign-in through the public address, the ChatGPT sign-in, and keeping its data out of exports.

use crate::test_support::*;

/// A cloud app signing in through the public address: registration, the pairing code, PKCE,
/// refresh, and what the tunnel can and can't reach.
#[tokio::test]
async fn remote_apps_sign_in_with_a_pairing_code_and_only_reach_mcp() {
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use base64::Engine;
    use http_body_util::BodyExt;
    use sha2::{Digest, Sha256};
    use tower::ServiceExt;
    let (dir, app) = app();
    let router = crate::build_router(app.clone(), &config(dir.path()));
    let send = |req: Request<Body>| { let r = router.clone(); async move {
        let res = r.oneshot(req).await.unwrap();
        let status = res.status();
        let headers = res.headers().clone();
        let body = res.into_body().collect().await.unwrap().to_bytes();
        (status, headers, String::from_utf8_lossy(&body).to_string())
    } };
    let public = |method: &str, uri: &str, body: Body| Request::builder().method(method).uri(uri).header("host", "lilt.example.com").header("content-type", "application/x-www-form-urlencoded").body(body).unwrap();

    // Before an address is saved: no sign-in metadata. Locally everything still works.
    assert_eq!(send(public("GET", "/.well-known/oauth-authorization-server", Body::empty())).await.0, StatusCode::NOT_FOUND);
    crate::ai::oauth::set_public_url(&app, "https://lilt.example.com/").unwrap();
    assert!(crate::ai::oauth::set_public_url(&app, "http://lilt.example.com").is_err());

    // Through the tunnel only MCP and sign-in are reachable, and MCP asks for sign-in.
    assert_eq!(send(public("GET", "/api/profile", Body::empty())).await.0, StatusCode::NOT_FOUND);
    assert_eq!(send(public("GET", "/", Body::empty())).await.0, StatusCode::NOT_FOUND);
    let cf = Request::builder().uri("/api/profile").header("host", "127.0.0.1:7878").header("cf-connecting-ip", "1.2.3.4").body(Body::empty()).unwrap();
    assert_eq!(send(cf).await.0, StatusCode::NOT_FOUND, "Cloudflare's header marks the tunnel too");
    let (s, h, _) = send(public("POST", "/mcp", Body::from("{}"))).await;
    assert_eq!(s, StatusCode::UNAUTHORIZED);
    assert!(h["www-authenticate"].to_str().unwrap().contains("https://lilt.example.com/.well-known/oauth-protected-resource/mcp"));
    let (_, _, meta) = send(public("GET", "/.well-known/oauth-authorization-server", Body::empty())).await;
    let meta: serde_json::Value = serde_json::from_str(&meta).unwrap();
    assert_eq!((meta["issuer"].as_str(), meta["code_challenge_methods_supported"][0].as_str()), (Some("https://lilt.example.com"), Some("S256")));

    // Register, then sign in: a wrong code is refused, the right one sends the app back with a code.
    let reg = Request::builder().method("POST").uri("/oauth/register").header("host", "lilt.example.com").header("content-type", "application/json")
        .body(Body::from(r#"{"client_name":"ChatGPT","redirect_uris":["https://chatgpt.com/connector/oauth/x1"]}"#)).unwrap();
    let (s, _, body) = send(reg).await;
    assert_eq!(s, StatusCode::CREATED);
    let client_id = serde_json::from_str::<serde_json::Value>(&body).unwrap()["client_id"].as_str().unwrap().to_string();
    let verifier = "a".repeat(50);
    let challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let q = format!("response_type=code&client_id={client_id}&redirect_uri=https%3A%2F%2Fchatgpt.com%2Fconnector%2Foauth%2Fx1&code_challenge={challenge}&code_challenge_method=S256&state=s1&resource=https%3A%2F%2Flilt.example.com%2Fmcp");
    let (s, _, html) = send(public("GET", &format!("/oauth/authorize?{q}"), Body::empty())).await;
    assert!(s.is_success() && html.contains("Connect ChatGPT to Lilt?"));
    let bad = send(public("GET", &format!("/oauth/authorize?{}", q.replace("x1", "evil")), Body::empty())).await.2;
    assert!(bad.contains("return address doesn&#39;t match"));
    let code = crate::ai::oauth::new_pairing_code(&app)["code"].as_str().unwrap().to_string();
    let (s, _, html) = send(public("POST", "/oauth/authorize", Body::from(format!("{q}&pairing_code=WRONG-CODE&decision=allow")))).await;
    assert!(s.is_success() && html.contains("isn&#39;t right"));
    let (s, h, _) = send(public("POST", "/oauth/authorize", Body::from(format!("{q}&pairing_code={}&decision=allow", code.to_lowercase())))).await;
    assert!(s.is_redirection());
    let to = h["location"].to_str().unwrap().to_string();
    assert!(to.starts_with("https://chatgpt.com/connector/oauth/x1?code=") && to.ends_with("&state=s1"));
    let auth_code = to.split("code=").nth(1).unwrap().split('&').next().unwrap().to_string();
    let used = send(public("POST", "/oauth/authorize", Body::from(format!("{q}&pairing_code={code}&decision=allow")))).await.2;
    assert!(used.contains("isn&#39;t right"), "a pairing code works once");

    // Exchange the code (PKCE checked), call MCP with the token, refresh it.
    let form = |extra: &str| Body::from(format!("grant_type=authorization_code&code={auth_code}&client_id={client_id}&redirect_uri=https%3A%2F%2Fchatgpt.com%2Fconnector%2Foauth%2Fx1{extra}"));
    assert_eq!(send(public("POST", "/oauth/token", form(&format!("&code_verifier={}", "b".repeat(50))))).await.0, StatusCode::BAD_REQUEST);
    let (s, _, body) = send(public("POST", "/oauth/token", form(&format!("&code_verifier={verifier}")))).await;
    assert_eq!(s, StatusCode::BAD_REQUEST, "a failed exchange uses the code up");
    assert!(body.contains("invalid_grant"));
    // Sign in again for a fresh code.
    let code = crate::ai::oauth::new_pairing_code(&app)["code"].as_str().unwrap().to_string();
    let to = send(public("POST", "/oauth/authorize", Body::from(format!("{q}&pairing_code={code}&decision=allow")))).await.1["location"].to_str().unwrap().to_string();
    let auth_code = to.split("code=").nth(1).unwrap().split('&').next().unwrap().to_string();
    let form = Body::from(format!("grant_type=authorization_code&code={auth_code}&client_id={client_id}&redirect_uri=https%3A%2F%2Fchatgpt.com%2Fconnector%2Foauth%2Fx1&code_verifier={verifier}"));
    let (s, _, body) = send(public("POST", "/oauth/token", form)).await;
    assert_eq!(s, StatusCode::OK, "{body}");
    let tok: serde_json::Value = serde_json::from_str(&body).unwrap();
    let access = tok["access_token"].as_str().unwrap().to_string();
    let init = |t: &str| Request::builder().method("POST").uri("/mcp").header("host", "lilt.example.com").header("authorization", format!("Bearer {t}"))
        .header("content-type", "application/json").header("accept", "application/json, text/event-stream")
        .body(Body::from(r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}"#)).unwrap();
    assert_eq!(send(init(&access)).await.0, StatusCode::OK);
    assert_eq!(send(init("nope")).await.0, StatusCode::UNAUTHORIZED);
    let refresh = Body::from(format!("grant_type=refresh_token&refresh_token={}&client_id={client_id}", tok["refresh_token"].as_str().unwrap()));
    let (s, _, body) = send(public("POST", "/oauth/token", refresh)).await;
    assert_eq!(s, StatusCode::OK);
    let new_access = serde_json::from_str::<serde_json::Value>(&body).unwrap()["access_token"].as_str().unwrap().to_string();
    assert_eq!(send(init(&access)).await.0, StatusCode::UNAUTHORIZED, "the old token is replaced");
    assert_eq!(send(init(&new_access)).await.0, StatusCode::OK);
    assert!(!std::fs::read_to_string(dir.path().join("oauth.json")).unwrap().contains(&new_access), "only hashes are kept");

    // Disconnecting in Settings ends it.
    let conns = crate::ai::oauth::connections(&app);
    assert_eq!((conns.len(), conns[0]["client_name"].as_str()), (1, Some("ChatGPT")));
    crate::ai::oauth::disconnect(&app, conns[0]["id"].as_str().unwrap()).unwrap();
    assert_eq!(send(init(&new_access)).await.0, StatusCode::UNAUTHORIZED);

    // From this computer: MCP answers local host names only.
    let local = |host: &str| Request::builder().method("POST").uri("/mcp").header("host", host).header("content-type", "application/json").header("accept", "application/json, text/event-stream")
        .body(Body::from(r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}"#)).unwrap();
    assert_eq!(send(local("127.0.0.1:7878")).await.0, StatusCode::OK);
    assert_eq!(send(local("attacker.example")).await.0, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn chatgpt_signin_is_local_same_origin_and_callback_is_bound_to_browser() {
    use axum::{body::{Body, to_bytes}, http::{Request, StatusCode}};
    use tower::ServiceExt;
    let (_dir, a) = app();
    let router = crate::build_router(a.clone(), &a.config);
    for (host, origin) in [("attacker.example:7878", "http://attacker.example:7878"), ("127.0.0.1:7878", "https://attacker.example")] {
        let res = router.clone().oneshot(Request::builder().method("POST").uri("/api/chatgpt/login").header("host", host).header("origin", origin).body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(res.status(), StatusCode::FORBIDDEN);
    }
    let res = router.clone().oneshot(Request::builder().method("POST").uri("/api/chatgpt/login").header("host", "127.0.0.1:7878").header("origin", "http://127.0.0.1:7878").body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    assert_eq!(res.headers()["cache-control"], "no-store");
    let cookie = res.headers()["set-cookie"].to_str().unwrap().split(';').next().unwrap().to_owned();
    let body: serde_json::Value = serde_json::from_slice(&to_bytes(res.into_body(), 16384).await.unwrap()).unwrap();
    let url = url::Url::parse(body["url"].as_str().unwrap()).unwrap();
    let params: std::collections::HashMap<_, _> = url.query_pairs().into_owned().collect();
    assert_eq!(params["client_id"], "dynamic_agent_client");
    assert_eq!(params["redirect_uri"], "http://127.0.0.1:7878/auth/callback");
    assert!(params["scope"].contains("chatgpt.tokens.use.direct"));
    let wrong = format!("/auth/callback?state={}&error=access_denied", params["state"]);
    let res = router.clone().oneshot(Request::builder().uri(&wrong).header("host", "127.0.0.1:7878").body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    let res = router.oneshot(Request::builder().uri(&wrong).header("host", "127.0.0.1:7878").header("cookie", cookie).body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    assert!(!a.chatgpt.lock().await.pending_for_test());
}

#[test]
fn chatgpt_private_data_is_never_in_practice_export() {
    let (_dir, a) = app();
    std::fs::create_dir(a.paths.root.join(".private")).unwrap();
    std::fs::write(a.paths.root.join(".private/chatgpt.json"), b"secret").unwrap();
    let path = crate::store::export::write_zip(&a).unwrap();
    let zip = zip::ZipArchive::new(std::fs::File::open(&path).unwrap()).unwrap();
    assert!(!zip.file_names().any(|name| name.unwrap().contains(".private")));
    std::fs::remove_file(path).unwrap();
}
