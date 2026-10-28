//! Today's home screen, the card deck, exercises, the plan, and progress.

use crate::app::Shared;
use crate::http::R;
use crate::practice::model::Plan;
use crate::practice::{cards, exercises, progress};
use crate::recordings::model::*;
use crate::{analysis, coach::routes::review_view, recordings, util};
use axum::{
    Json, Router,
    extract::{Path, State},
    routing::{get, post},
};
use serde::Deserialize;
use serde_json::{Value, json};

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/api/today", get(today))
        .route("/api/exercises", get(list_exercises))
        .route("/api/exercises/{id}", get(get_exercise))
        .route("/api/deck/today", get(deck_today))
        .route("/api/deck/session", post(deck_session))
        .route("/api/deck/review", post(deck_review))
        .route("/api/plan", get(get_plan))
        .route("/api/plan/history", get(plan_history))
        .route("/api/plan/resume", post(resume_plan))
        .route("/api/plan/choose", post(choose_plan))
        .route("/api/progress", get(get_progress))
}

async fn today(State(app): State<Shared>) -> R<Json<Value>> {
    let profile = app.profile();
    let plan = app.ensure_plan()?;
    let (date, local_ts) = util::local_now(&profile.timezone);
    let ex = exercises::json(&app, &plan.exercise_id, plan.exercise_version);
    let cue = plan.cue_id.as_ref().and_then(|c| {
        ex["cues"].as_array()?.iter().find(|x| x["id"] == c.as_str()).cloned()
    });
    let ladder_step = plan.ladder_step.and_then(|i| ex["ladder"].get(i).cloned());
    let sessions = app.sessions();
    let unfinished = sessions
        .iter()
        .rev()
        .find(|s| s.kind.is_guided() && s.state == SessionState::InProgress && s.local_date == date)
        .cloned();
    let latest_review = app.all_reviews().into_iter().last().map(|r| review_view(&app, &r));
    // Today's guided sessions (not Studio), so the home screen can show its state.
    let today_sessions: Vec<Value> = sessions
        .iter()
        .filter(|s| s.local_date == date && s.kind.is_guided())
        .map(|s| {
            let takes = app.takes_in(&s.id);
            json!({
                "id": s.id, "kind": s.kind, "state": s.state, "completed_utc": s.completed_utc,
                "take_count": takes.iter().filter(|t| t.original.is_some()).count(),
                "roles": takes.iter().filter(|t| t.original.is_some()).map(|t| json!({"role": t.role, "phase": t.phase, "self_report": t.self_report.is_some()})).collect::<Vec<_>>(),
                "comfort": s.comfort.is_some(),
            })
        })
        .collect();
    let participation = progress::participation(&app, &date);
    let reminder_due = profile.reminder_time.as_ref().map(|t| {
        let now_hm = &local_ts[11..16];
        now_hm >= t.as_str() && !participation["practised_today"].as_bool().unwrap_or(false)
    });
    let pending = analysis::jobs(&app).iter().filter(|j| j.status != "done").count();
    Ok(Json(json!({
        "local_date": date, "local_time": local_ts, "timezone": profile.timezone,
        "goal": profile.goal, "plan": plan, "exercise": ex, "cue": cue, "ladder_step": ladder_step,
        "session_minutes": profile.session_minutes,
        "unfinished_session": unfinished, "latest_review": latest_review, "today_sessions": today_sessions,
        "participation": participation,
        "reminder": {"time": profile.reminder_time, "due": reminder_due},
        "pending_jobs": pending,
        "external_processing": profile.external_processing,
        "prompts": app.prompts,
    })))
}

async fn list_exercises(State(app): State<Shared>) -> Json<Value> {
    let reg = app.registry.read().unwrap();
    let list: Vec<Value> = reg.all_latest().iter().map(|e| e.raw.clone()).collect();
    let caps: Vec<Value> = progress::AREAS.iter().map(|a| json!({"area": a, "capability": progress::capability(a)})).collect();
    Json(json!({"exercises": list, "capability_matrix": caps}))
}

async fn get_exercise(State(app): State<Shared>, Path(id): Path<String>) -> R<Json<Value>> {
    let reg = app.registry.read().unwrap();
    let versions = reg.by_id.get(&id).ok_or_else(|| anyhow::anyhow!("exercise not found"))?;
    Ok(Json(json!({"versions": versions.values().map(|e| e.raw.clone()).collect::<Vec<_>>()})))
}

async fn get_plan(State(app): State<Shared>) -> R<Json<Plan>> {
    Ok(Json(app.ensure_plan()?))
}

async fn plan_history(State(app): State<Shared>) -> Json<Vec<Plan>> {
    Json(app.plan_history())
}

async fn deck_today(State(app): State<Shared>) -> R<Json<Value>> {
    let mut v = cards::today_queue(&app)?;
    // Practice days this week, for the calendar on the room's wall.
    v["participation"] = progress::participation(&app, v["local_date"].as_str().unwrap_or_default());
    Ok(Json(v))
}

async fn deck_session(State(app): State<Shared>) -> R<Json<Session>> {
    Ok(Json(recordings::deck_session(&app)?))
}

async fn deck_review(State(app): State<Shared>, Json(req): Json<cards::RateReq>) -> R<Json<Value>> {
    let ouch = req.rating == "ouch";
    let take = req.take_id.clone();
    let mut out = cards::rate(&app, req)?;
    if ouch {
        // Record the comfort report on the session the card was practised in.
        if let Some(sid) = take.and_then(|t| app.take(&t).ok()).map(|t| t.session_id) {
            let comfort = recordings::ComfortInput { comfort: Comfort::Strain, effort: None, hoarseness: false, likes_sound: None, note: Some("Rated a card as hurting or strained.".into()) };
            recordings::update_session(&app, &sid, recordings::SessionUpdate { comfort: Some(comfort), notes: None, complete: None })?;
        }
    }
    out["deck"] = cards::today_queue(&app)?;
    Ok(Json(out))
}

async fn resume_plan(State(app): State<Shared>) -> R<Json<Plan>> {
    cards::resume_suspended(&app)?;
    let cur = app.ensure_plan()?;
    if !cur.paused {
        return Ok(Json(cur));
    }
    let v = cur.version;
    let plan = Plan { paused: false, author: "learner".into(), rationale: "You resumed after a pause. Go gently and stop if anything hurts.".into(), ..cur };
    Ok(Json(app.write_plan(plan, Some(v))?))
}

#[derive(Deserialize)]
struct ChooseReq {
    exercise_id: String,
}

async fn choose_plan(State(app): State<Shared>, Json(req): Json<ChooseReq>) -> R<Json<Plan>> {
    let cur = app.ensure_plan()?;
    let ex = {
        let reg = app.registry.read().unwrap();
        let ex = reg.latest(&req.exercise_id).ok_or_else(|| anyhow::anyhow!("exercise not found"))?.clone();
        reg.eligible(&ex.id, ex.version)?;
        ex
    };
    let plan = Plan {
        schema: "lilt.plan/1".into(),
        version: 0,
        created_utc: String::new(),
        author: "learner".into(),
        exercise_id: ex.id.clone(),
        exercise_version: ex.version,
        focus_area: ex.primary_area.clone(),
        cue_id: Some(ex.primary_cue.id.clone()),
        ladder_step: if ex.ladder.is_empty() { None } else { Some(0) },
        rationale: "You chose this activity.".into(),
        evidence_refs: vec![],
        paused: false,
    };
    Ok(Json(app.write_plan(plan, Some(cur.version))?))
}

async fn get_progress(State(app): State<Shared>) -> Json<Value> {
    let profile = app.profile();
    let (today, _) = util::local_now(&profile.timezone);
    Json(json!({
        "skills": progress::skill_cards(&app),
        "participation": progress::participation(&app, &today),
        "goal": profile.goal,
        "missing_evaluation_assets": [
            "Natural-speech recordings with independently checked pitch contours (pitch measures stay descriptive only)",
            "Independent listener labels for lightness, resonance and perceived femininity (automatic judgements disabled)",
            "Clinician review of the exercise set",
        ],
    }))
}
