//! Signing in AI apps that connect from the internet (ChatGPT, claude.ai) to Lilt's MCP server.
//!
//! Lilt runs on your computer. For a cloud app to reach it, you run an HTTPS tunnel (for example
//! `cloudflared tunnel --url http://127.0.0.1:7878`) and save its address in Settings. Requests that
//! come through that address (its host name, or Cloudflare's `Cf-Connecting-Ip` header) only reach
//! the MCP endpoint and the sign-in endpoints below; the app, its API and your recordings stay local.
//!
//! Sign-in is OAuth 2.1 for one person: the app registers itself (dynamic client registration),
//! sends you to Lilt's sign-in page, and you type a one-time code that only Lilt's own Settings
//! shows (local, valid 10 minutes, five tries). Then the app gets an access token (a day) and a
//! refresh token (90 days, replaced on every use), PKCE (S256) required. Lilt keeps only hashes of
//! the tokens, in `<data>/oauth.json`; disconnecting in Settings removes them.

use crate::app::{App, Shared};
use crate::store;
use anyhow::{Result, anyhow, bail, ensure};
use axum::extract::{Form, Query, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode, header};
use axum::response::{Html, IntoResponse, Redirect, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

const SCOPE: &str = "lilt";
const ACCESS_SECS: u64 = 24 * 3600;
const REFRESH_SECS: u64 = 90 * 24 * 3600;
const PAIRING: Duration = Duration::from_secs(600);
const CODE_LIFE: Duration = Duration::from_secs(300);

/// What lives only in memory: the pairing code shown in Settings and unused authorization codes.
#[derive(Default)]
pub struct Memory {
    pairing: Option<(String, Instant, u8)>,
    codes: HashMap<String, AuthCode>,
}

struct AuthCode { client_id: String, client_name: String, redirect_uri: String, challenge: String, expires: Instant }

#[derive(Serialize, Deserialize, Default)]
struct Saved {
    #[serde(default)]
    public_url: Option<String>,
    #[serde(default)]
    clients: Vec<Client>,
    #[serde(default)]
    grants: Vec<Grant>,
}

#[derive(Serialize, Deserialize, Clone)]
struct Client { client_id: String, client_name: String, redirect_uris: Vec<String>, created: String }

#[derive(Serialize, Deserialize, Clone)]
struct Grant {
    id: String, client_id: String, client_name: String,
    access_hash: String, access_expires: u64, refresh_hash: String, refresh_expires: u64,
    created: String, last_used: String,
}

fn now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

fn token() -> String {
    format!("{}{}", uuid::Uuid::new_v4().simple(), uuid::Uuid::new_v4().simple())
}

fn path(app: &App) -> std::path::PathBuf {
    app.paths.root.join("oauth.json")
}

fn load(app: &App) -> Saved {
    store::read_json_opt(&path(app)).ok().flatten().unwrap_or_default()
}

fn save(app: &App, s: &Saved) -> Result<()> {
    store::write_json(&path(app), s)
}

/// Read, change and save `oauth.json` under one lock.
fn edit<T>(app: &App, f: impl FnOnce(&mut Saved) -> Result<T>) -> Result<T> {
    let _g = app.oauth.lock().unwrap();
    let mut s = load(app);
    let out = f(&mut s)?;
    save(app, &s)?;
    Ok(out)
}

/// The tunnel's public address, as saved in Settings, without a trailing slash.
pub fn public_url(app: &App) -> Option<String> {
    load(app).public_url
}

pub fn set_public_url(app: &App, url: &str) -> Result<Option<String>> {
    let url = url.trim().trim_end_matches('/');
    let url = if url.is_empty() {
        None
    } else {
        let rest = url.strip_prefix("https://").ok_or_else(|| anyhow!("the address must start with https://"))?;
        ensure!(!rest.is_empty() && !rest.contains(['/', '?', '#', ' ', '@']), "use just the address, like https://lilt.example.com");
        Some(url.to_string())
    };
    edit(app, |s| { s.public_url = url.clone(); Ok(()) })?;
    Ok(url)
}

fn host_of(url: &str) -> &str {
    url.split("://").nth(1).unwrap_or(url)
}

/// Whether a request came in through the public tunnel rather than from this computer.
pub fn is_public(app: &App, headers: &HeaderMap) -> bool {
    if headers.contains_key("cf-connecting-ip") {
        return true;
    }
    let host = headers.get(header::HOST).and_then(|v| v.to_str().ok()).unwrap_or_default();
    public_url(app).is_some_and(|u| host.eq_ignore_ascii_case(host_of(&u)))
}

fn loopback(headers: &HeaderMap) -> bool {
    let host = headers.get(header::HOST).and_then(|v| v.to_str().ok()).unwrap_or_default();
    let name = if host.starts_with('[') { host.split(']').next().map(|h| &h[1..]).unwrap_or(host) } else { host.split(':').next().unwrap_or(host) };
    matches!(name, "localhost" | "127.0.0.1" | "::1") || name.ends_with(".localhost")
}

/// Through the tunnel only MCP and sign-in are reachable, and MCP needs a signed-in app. From this
/// computer everything works as before (MCP with `LILT_MCP_TOKEN` if set), but MCP only answers
/// local host names, so a web page can't reach it by DNS rebinding.
pub async fn gate(State(app): State<Shared>, req: axum::extract::Request, next: axum::middleware::Next) -> Response {
    let p = req.uri().path().to_string();
    let mcp = p == "/mcp" || p.starts_with("/mcp/");
    if is_public(&app, req.headers()) {
        let open = p.starts_with("/.well-known/oauth-") || p.starts_with("/oauth/");
        if !mcp && !open {
            return (StatusCode::NOT_FOUND, "Only Lilt's MCP server is reachable at this address.").into_response();
        }
        if mcp {
            let bearer = req.headers().get(header::AUTHORIZATION).and_then(|v| v.to_str().ok()).and_then(|v| v.strip_prefix("Bearer ")).map(str::to_string);
            if !bearer.is_some_and(|b| check_access(&app, &b)) {
                return unauthorized(&app);
            }
        }
        return next.run(req).await;
    }
    if mcp {
        if !loopback(req.headers()) {
            return (StatusCode::FORBIDDEN, "Lilt's MCP server answers only on this computer, or through the public address saved in Settings.").into_response();
        }
        if let Some(t) = &app.config.mcp_token {
            let ok = req.headers().get(header::AUTHORIZATION).and_then(|v| v.to_str().ok()) == Some(&format!("Bearer {t}"));
            if !ok {
                return (StatusCode::UNAUTHORIZED, "missing or wrong bearer token").into_response();
            }
        }
    }
    next.run(req).await
}

fn unauthorized(app: &App) -> Response {
    let mut r = (StatusCode::UNAUTHORIZED, Json(json!({"error": "invalid_token", "error_description": "Sign in to Lilt first."}))).into_response();
    if let Some(u) = public_url(app) {
        let v = format!("Bearer resource_metadata=\"{u}/.well-known/oauth-protected-resource/mcp\", scope=\"{SCOPE}\"");
        if let Ok(h) = HeaderValue::from_str(&v) {
            r.headers_mut().insert(header::WWW_AUTHENTICATE, h);
        }
    }
    r
}

fn hash(t: &str) -> String {
    store::sha256_hex(t.as_bytes())
}

/// A valid access token from a signed-in app. Notes when it was last used, at most once a minute.
pub fn check_access(app: &App, bearer: &str) -> bool {
    let h = hash(bearer);
    let s = load(app);
    let Some(g) = s.grants.iter().find(|g| g.access_hash == h && g.access_expires > now()) else { return false };
    let stale = chrono::DateTime::parse_from_rfc3339(&g.last_used).map(|t| (chrono::Utc::now() - t.with_timezone(&chrono::Utc)).num_seconds() > 60).unwrap_or(true);
    if stale {
        let id = g.id.clone();
        let _ = edit(app, |s| {
            if let Some(g) = s.grants.iter_mut().find(|g| g.id == id) { g.last_used = crate::util::now_utc(); }
            Ok(())
        });
    }
    true
}

/// A fresh one-time code for the sign-in page, shown in Settings. Replaces any earlier one.
pub fn new_pairing_code(app: &App) -> Value {
    const LETTERS: &[u8] = b"ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let bytes = uuid::Uuid::new_v4().into_bytes();
    let code: String = bytes.iter().take(8).map(|b| LETTERS[*b as usize % LETTERS.len()] as char).collect();
    let shown = format!("{}-{}", &code[..4], &code[4..]);
    app.oauth_mem.lock().unwrap().pairing = Some((code, Instant::now() + PAIRING, 0));
    json!({ "code": shown, "expires_in": PAIRING.as_secs() })
}

/// Whether `typed` is the current pairing code; a right one is used up, five wrong ones end it.
fn use_pairing_code(app: &App, typed: &str) -> bool {
    let typed: String = typed.chars().filter(|c| c.is_ascii_alphanumeric()).collect::<String>().to_ascii_uppercase();
    let mut m = app.oauth_mem.lock().unwrap();
    let Some((code, expires, tries)) = m.pairing.as_mut() else { return false };
    if Instant::now() > *expires {
        m.pairing = None;
        return false;
    }
    if *code == typed {
        m.pairing = None;
        return true;
    }
    *tries += 1;
    if *tries >= 5 {
        m.pairing = None;
    }
    false
}

/// Signed-in apps, for Settings.
pub fn connections(app: &App) -> Vec<Value> {
    load(app).grants.iter().filter(|g| g.refresh_expires > now())
        .map(|g| json!({ "id": g.id, "client_name": g.client_name, "connected": g.created, "last_used": g.last_used }))
        .collect()
}

pub fn disconnect(app: &App, id: &str) -> Result<()> {
    edit(app, |s| {
        let before = s.grants.len();
        s.grants.retain(|g| g.id != id);
        ensure!(s.grants.len() < before, "that connection does not exist");
        Ok(())
    })
}

// ------------------------------------------------------------------ the OAuth endpoints

pub fn router(app: Shared) -> Router {
    Router::new()
        .route("/.well-known/oauth-protected-resource", get(resource_meta))
        .route("/.well-known/oauth-protected-resource/mcp", get(resource_meta))
        .route("/.well-known/oauth-authorization-server", get(server_meta))
        .route("/.well-known/oauth-authorization-server/mcp", get(server_meta))
        .route("/oauth/register", post(register))
        .route("/oauth/authorize", get(authorize_page).post(authorize))
        .route("/oauth/token", post(token_endpoint))
        .with_state(app)
}

fn oauth_error(code: StatusCode, error: &str, desc: &str) -> Response {
    (code, Json(json!({ "error": error, "error_description": desc }))).into_response()
}

fn no_address() -> Response {
    oauth_error(StatusCode::NOT_FOUND, "not_configured", "Save Lilt's public address in Settings → Connect your AI first.")
}

async fn resource_meta(State(app): State<Shared>) -> Response {
    let Some(u) = public_url(&app) else { return no_address() };
    Json(json!({ "resource": format!("{u}/mcp"), "authorization_servers": [u], "scopes_supported": [SCOPE],
        "bearer_methods_supported": ["header"], "resource_name": "Lilt voice practice" })).into_response()
}

async fn server_meta(State(app): State<Shared>) -> Response {
    let Some(u) = public_url(&app) else { return no_address() };
    Json(json!({
        "issuer": u,
        "authorization_endpoint": format!("{u}/oauth/authorize"),
        "token_endpoint": format!("{u}/oauth/token"),
        "registration_endpoint": format!("{u}/oauth/register"),
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none"],
        "scopes_supported": [SCOPE],
    })).into_response()
}

/// Where an app may be sent back to: an https address, or this computer (desktop apps).
fn redirect_ok(u: &str) -> bool {
    let local = ["http://localhost", "http://127.0.0.1", "http://[::1]"].iter().any(|p| u.starts_with(p));
    (u.starts_with("https://") || local) && !u.contains('#') && u.len() < 2000
}

async fn register(State(app): State<Shared>, Json(b): Json<Value>) -> Response {
    let uris: Vec<String> = b["redirect_uris"].as_array().map(|a| a.iter().filter_map(|v| v.as_str().map(str::to_string)).collect()).unwrap_or_default();
    if uris.is_empty() || uris.len() > 10 || !uris.iter().all(|u| redirect_ok(u)) {
        return oauth_error(StatusCode::BAD_REQUEST, "invalid_redirect_uri", "redirect_uris must be https addresses (or http on this computer)");
    }
    let name: String = b["client_name"].as_str().unwrap_or("An AI app").chars().filter(|c| !c.is_control()).take(80).collect();
    let client = Client { client_id: format!("lilt-{}", uuid::Uuid::new_v4().simple()), client_name: name, redirect_uris: uris, created: crate::util::now_utc() };
    let saved = edit(&app, |s| {
        s.clients.push(client.clone());
        // Keep the most recent registrations; apps register again when they need to.
        let extra = s.clients.len().saturating_sub(30);
        s.clients.drain(..extra);
        Ok(())
    });
    if let Err(e) = saved {
        return oauth_error(StatusCode::INTERNAL_SERVER_ERROR, "server_error", &e.to_string());
    }
    (StatusCode::CREATED, Json(json!({
        "client_id": client.client_id, "client_name": client.client_name, "redirect_uris": client.redirect_uris,
        "token_endpoint_auth_method": "none", "grant_types": ["authorization_code", "refresh_token"], "response_types": ["code"],
        "client_id_issued_at": now(),
    }))).into_response()
}

#[derive(Deserialize, Default)]
struct AuthorizeParams {
    #[serde(default)] response_type: String,
    #[serde(default)] client_id: String,
    #[serde(default)] redirect_uri: String,
    #[serde(default)] code_challenge: String,
    #[serde(default)] code_challenge_method: String,
    #[serde(default)] state: Option<String>,
    #[serde(default)] scope: Option<String>,
    #[serde(default)] resource: Option<String>,
    #[serde(default)] pairing_code: String,
    #[serde(default)] decision: String,
}

/// The client and redirect address of a sign-in request, if they check out. Anything wrong here
/// is shown on the page rather than sent to an address that might not be the app's.
fn check_request(app: &App, p: &AuthorizeParams) -> Result<Client> {
    let u = public_url(app).ok_or_else(|| anyhow!("Lilt has no public address saved yet. Open Lilt → Settings → Connect your AI."))?;
    let client = load(app).clients.into_iter().find(|c| c.client_id == p.client_id).ok_or_else(|| anyhow!("This app isn't registered with Lilt. Try connecting again from the app."))?;
    ensure!(client.redirect_uris.contains(&p.redirect_uri), "The app's return address doesn't match what it registered.");
    ensure!(p.response_type == "code", "Unsupported sign-in type.");
    ensure!(p.code_challenge_method == "S256" && p.code_challenge.len() >= 43, "The app must use PKCE (S256).");
    if let Some(r) = p.resource.as_deref().filter(|r| !r.is_empty()) {
        ensure!(r.trim_end_matches('/') == u || r.trim_end_matches('/') == format!("{u}/mcp"), "The app asked for a different server ({r}).");
    }
    Ok(client)
}

fn esc(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;").replace('\'', "&#39;")
}

fn page(client: Option<&Client>, p: &AuthorizeParams, problem: Option<&str>) -> Html<String> {
    let name = client.map(|c| esc(&c.client_name)).unwrap_or_default();
    let hidden: String = [("response_type", &p.response_type), ("client_id", &p.client_id), ("redirect_uri", &p.redirect_uri), ("code_challenge", &p.code_challenge),
        ("code_challenge_method", &p.code_challenge_method)].iter()
        .map(|(k, v)| format!("<input type=hidden name={k} value=\"{}\">", esc(v)))
        .chain([("state", &p.state), ("scope", &p.scope), ("resource", &p.resource)].iter().filter_map(|(k, v)| v.as_ref().map(|v| format!("<input type=hidden name={k} value=\"{}\">", esc(v)))))
        .collect();
    let body = match client {
        None => format!("<h1>Can't connect</h1><p class=err>{}</p>", esc(problem.unwrap_or("Something is wrong with this sign-in request."))),
        Some(_) => format!(r#"<h1>Connect {name} to Lilt?</h1>
<p>{name} will be able to read your practice (sessions, measurements, notes and short audio clips), save reviews, and change your own copy of the chapters. Lilt's original chapters are never changed, and every change can be undone.</p>
<p>To allow it, open <b>Lilt → Settings → Connect your AI</b> on your computer, choose <b>Get a code</b>, and type the code here.</p>
<form method=post action="/oauth/authorize">{hidden}
<label for=c>Code from Lilt</label>
<input id=c name=pairing_code autocomplete=one-time-code autocapitalize=characters spellcheck=false placeholder="ABCD-EFGH" autofocus>
{err}
<div class=row><button name=decision value=allow>Connect</button><button class=quiet name=decision value=deny>Don't connect</button></div>
</form>"#, err = problem.map(|e| format!("<p class=err>{}</p>", esc(e))).unwrap_or_default()),
    };
    Html(format!(r#"<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Connect to Lilt</title>
<style>
:root{{color-scheme:light dark;--ink:#17171d;--ink2:#4c4c58;--bg:#f4f2ef;--card:#fff;--accent:#e0643c;--hair:rgba(0,0,0,.08)}}
@media (prefers-color-scheme:dark){{:root{{--ink:#f1f1f4;--ink2:#a9a9b4;--bg:#16161b;--card:#1f1f25;--hair:rgba(255,255,255,.1)}}}}
body{{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:16px;box-sizing:border-box}}
main{{max-width:440px;width:100%;background:var(--card);border-radius:22px;padding:32px 28px;box-shadow:0 1px 0 var(--hair),0 20px 60px rgba(0,0,0,.08)}}
.mark{{font-weight:700;letter-spacing:-.02em;color:var(--accent);margin:0 0 18px}}
h1{{font-size:26px;line-height:1.15;letter-spacing:-.03em;margin:0 0 12px}} p{{color:var(--ink2);margin:0 0 14px}}
label{{display:block;font-size:13px;font-weight:600;margin:18px 0 6px}}
input[name=pairing_code]{{width:100%;box-sizing:border-box;font:600 22px/1 ui-monospace,Menlo,monospace;letter-spacing:.12em;padding:12px 14px;border-radius:12px;border:1px solid var(--hair);background:transparent;color:var(--ink);text-transform:uppercase}}
.row{{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}} button{{height:44px;padding:0 20px;border-radius:999px;border:0;font:600 15px inherit;font-family:inherit;cursor:pointer;background:var(--ink);color:var(--card)}}
button.quiet{{background:none;color:var(--ink2)}} .err{{color:#c2410c;font-size:14px;margin-top:10px}}
</style></head><body><main><p class=mark>Lilt</p>{body}</main></body></html>"#))
}

async fn authorize_page(State(app): State<Shared>, Query(p): Query<AuthorizeParams>) -> Html<String> {
    match check_request(&app, &p) {
        Ok(c) => page(Some(&c), &p, None),
        Err(e) => page(None, &p, Some(&e.to_string())),
    }
}

fn back_to(redirect: &str, params: &[(&str, &str)]) -> Response {
    let q: Vec<String> = params.iter().map(|(k, v)| format!("{k}={}", urlencode(v))).collect();
    let sep = if redirect.contains('?') { '&' } else { '?' };
    Redirect::to(&format!("{redirect}{sep}{}", q.join("&"))).into_response()
}

fn urlencode(s: &str) -> String {
    s.bytes().map(|b| match b {
        b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (b as char).to_string(),
        _ => format!("%{b:02X}"),
    }).collect()
}

async fn authorize(State(app): State<Shared>, Form(p): Form<AuthorizeParams>) -> Response {
    let client = match check_request(&app, &p) {
        Ok(c) => c,
        Err(e) => return page(None, &p, Some(&e.to_string())).into_response(),
    };
    let state = p.state.clone().unwrap_or_default();
    let with_state = |mut v: Vec<(&'static str, String)>| { if !state.is_empty() { v.push(("state", state.clone())); } v };
    if p.decision != "allow" {
        let v = with_state(vec![("error", "access_denied".into())]);
        return back_to(&p.redirect_uri, &v.iter().map(|(k, v)| (*k, v.as_str())).collect::<Vec<_>>());
    }
    if !use_pairing_code(&app, &p.pairing_code) {
        return page(Some(&client), &p, Some("That code isn't right, or it has expired. Get a new one in Lilt's Settings.")).into_response();
    }
    let code = token();
    {
        let mut m = app.oauth_mem.lock().unwrap();
        m.codes.retain(|_, c| c.expires > Instant::now());
        m.codes.insert(hash(&code), AuthCode { client_id: client.client_id.clone(), client_name: client.client_name.clone(),
            redirect_uri: p.redirect_uri.clone(), challenge: p.code_challenge.clone(), expires: Instant::now() + CODE_LIFE });
    }
    let v = with_state(vec![("code", code)]);
    back_to(&p.redirect_uri, &v.iter().map(|(k, v)| (*k, v.as_str())).collect::<Vec<_>>())
}

#[derive(Deserialize)]
struct TokenParams {
    grant_type: String,
    #[serde(default)] code: String,
    #[serde(default)] redirect_uri: String,
    #[serde(default)] client_id: String,
    #[serde(default)] code_verifier: String,
    #[serde(default)] refresh_token: String,
}

fn pkce_ok(verifier: &str, challenge: &str) -> bool {
    let digest = Sha256::digest(verifier.as_bytes());
    (43..=128).contains(&verifier.len()) && base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(digest) == challenge
}

/// A new access and refresh token pair, kept as hashes.
fn issue(app: &App, grant_id: Option<&str>, client_id: &str, client_name: &str) -> Result<Value> {
    let (access, refresh) = (token(), token());
    edit(app, |s| {
        s.grants.retain(|g| g.refresh_expires > now());
        let t = now();
        match grant_id {
            Some(id) => {
                let g = s.grants.iter_mut().find(|g| g.id == id).ok_or_else(|| anyhow!("grant is gone"))?;
                g.access_hash = hash(&access); g.access_expires = t + ACCESS_SECS;
                g.refresh_hash = hash(&refresh); g.refresh_expires = t + REFRESH_SECS;
                g.last_used = crate::util::now_utc();
            }
            None => s.grants.push(Grant {
                id: crate::util::new_id("conn"), client_id: client_id.into(), client_name: client_name.into(),
                access_hash: hash(&access), access_expires: t + ACCESS_SECS, refresh_hash: hash(&refresh), refresh_expires: t + REFRESH_SECS,
                created: crate::util::now_utc(), last_used: crate::util::now_utc(),
            }),
        }
        Ok(())
    })?;
    Ok(json!({ "access_token": access, "token_type": "Bearer", "expires_in": ACCESS_SECS, "refresh_token": refresh, "scope": SCOPE }))
}

fn exchange(app: &App, p: &TokenParams) -> Result<Value> {
    match p.grant_type.as_str() {
        "authorization_code" => {
            let c = app.oauth_mem.lock().unwrap().codes.remove(&hash(&p.code)).ok_or_else(|| anyhow!("invalid_grant: unknown or used code"))?;
            ensure!(c.expires > Instant::now(), "invalid_grant: the code expired");
            ensure!(c.client_id == p.client_id && c.redirect_uri == p.redirect_uri, "invalid_grant: client or return address doesn't match");
            ensure!(pkce_ok(&p.code_verifier, &c.challenge), "invalid_grant: PKCE check failed");
            issue(app, None, &c.client_id, &c.client_name)
        }
        "refresh_token" => {
            let h = hash(&p.refresh_token);
            let g = load(app).grants.into_iter().find(|g| g.refresh_hash == h && g.refresh_expires > now()).ok_or_else(|| anyhow!("invalid_grant: unknown or expired refresh token"))?;
            ensure!(p.client_id.is_empty() || p.client_id == g.client_id, "invalid_grant: wrong client");
            issue(app, Some(&g.id), &g.client_id, &g.client_name)
        }
        other => bail!("unsupported_grant_type: {other}"),
    }
}

async fn token_endpoint(State(app): State<Shared>, Form(p): Form<TokenParams>) -> Response {
    match exchange(&app, &p) {
        Ok(v) => {
            let mut r = Json(v).into_response();
            r.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
            r
        }
        Err(e) => {
            let msg = e.to_string();
            let (code, desc) = msg.split_once(": ").unwrap_or(("invalid_request", &msg));
            oauth_error(StatusCode::BAD_REQUEST, code, desc)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pkce_s256() {
        let v = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWjVXZnE";
        assert!(pkce_ok(v, "OLM_FJnjtk0JtaQuhVbwYI_oP-H2AF9ioLDvfgSaEsg"));
        assert!(!pkce_ok(v, "E9Melhoa2OwvFrEMTJguCQaR8wiOvUuYuK4N7GnO1-c"));
        assert!(!pkce_ok("short", "OLM_FJnjtk0JtaQuhVbwYI_oP-H2AF9ioLDvfgSaEsg"));
    }

    #[test]
    fn return_addresses() {
        assert!(redirect_ok("https://chatgpt.com/connector/oauth/abc"));
        assert!(redirect_ok("http://localhost:6274/callback"));
        assert!(!redirect_ok("http://evil.example/cb"));
        assert!(!redirect_ok("javascript:alert(1)"));
    }
}
