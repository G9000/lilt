//! Which AI apps have used Lilt's MCP server, and when: shown in Settings → Connect your AI so you
//! can see a connection works. Only the app's name, the tool and the time are kept
//! (`<data>/agents.json`), not what was asked or answered.

use crate::app::App;
use crate::store;
use serde_json::{Value, json};

fn path(app: &App) -> std::path::PathBuf {
    app.paths.root.join("agents.json")
}

pub fn record(app: &App, client: &str, tool: &str) {
    let _g = app.oauth.lock().unwrap();
    let mut v: Value = store::read_json_opt(&path(app)).ok().flatten().unwrap_or_else(|| json!({}));
    let name: String = client.chars().filter(|c| !c.is_control()).take(80).collect();
    let name = if name.is_empty() { "An AI app".to_string() } else { name };
    v[name] = json!({ "last_tool": tool, "last_used": crate::util::now_utc() });
    if let Err(e) = store::write_json(&path(app), &v) {
        tracing::warn!("couldn't note agent activity: {e:#}");
    }
}

/// Apps that have used Lilt, most recent first.
pub fn recent(app: &App) -> Vec<Value> {
    let v: Value = store::read_json_opt(&path(app)).ok().flatten().unwrap_or_else(|| json!({}));
    let mut rows: Vec<Value> = v.as_object().map(|o| o.iter().map(|(k, x)| json!({ "client": k, "last_tool": x["last_tool"], "last_used": x["last_used"] })).collect()).unwrap_or_default();
    rows.sort_by(|a, b| b["last_used"].as_str().cmp(&a["last_used"].as_str()));
    rows
}
