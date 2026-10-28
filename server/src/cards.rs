//! Voice cards with spaced repetition ("Anki for your voice").
//!
//! Cards are generated from the content (reference phrase, exercises, practice texts);
//! only their scheduling state and the review log live in the data root:
//! `cards/state.json` (atomic rewrite) and `cards/reviews.jsonl` (append-only).
//! Ratings are the learner's own judgement. Pitch measurements never set a rating.
//! Differences from Anki, on purpose: a daily cap so missed days never become a backlog,
//! and an "it hurt" answer that suspends the card and pauses the plan.

use crate::app::App;
use crate::model::*;
use crate::store;
use crate::util;
use anyhow::{Result, anyhow, bail};
use chrono::{Duration, NaiveDate};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::BTreeMap;

pub const REFERENCE_CARD: &str = "ref.daily";
const START_EASE: f64 = 2.5;
const MIN_EASE: f64 = 1.3;
const MAX_INTERVAL: i64 = 60;
/// A stage unlocks once this share of the previous stage's cards is learned.
const UNLOCK_SHARE: f64 = 0.6;

#[derive(Clone, Debug, Serialize)]
pub struct Card {
    pub id: String,
    /// 1-based stage in the introduction order.
    pub stage: usize,
    pub deck: String,
    pub deck_title: String,
    /// "reference" | "exercise" | "text"
    pub kind: String,
    pub front: String,
    pub hint: String,
    pub area: String,
    pub level_id: String,
    pub text_kind: String,
    pub exercise_id: Option<String>,
    pub exercise_version: Option<u32>,
    pub prompt_id: String,
    pub source: String,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct CardState {
    pub due: Option<String>,
    pub interval_days: i64,
    pub ease: f64,
    pub reps: u32,
    pub lapses: u32,
    pub good_streak: u32,
    pub last_rating: Option<String>,
    pub last_reviewed_utc: Option<String>,
    pub last_reviewed_date: Option<String>,
    pub introduced_date: Option<String>,
    #[serde(default)]
    pub suspended: bool,
    #[serde(default)]
    pub suspended_reason: Option<String>,
}

impl CardState {
    pub fn learned(&self) -> bool {
        self.good_streak >= 2
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReviewLog {
    pub card_id: String,
    pub take_id: Option<String>,
    pub rating: String,
    pub reviewed_utc: String,
    pub local_date: String,
    pub interval_before: i64,
    pub interval_after: i64,
    pub due_after: Option<String>,
}

/// Areas that each practice-text level mainly trains (for display and progress).
fn level_area(level: &str) -> &'static str {
    match level {
        "warmup" | "m-words" => "resonance",
        "automatic" => "carryover",
        "phrases" => "intonation",
        "sentences" => "resonance",
        "passages" => "carryover",
        "conversation" => "carryover",
        _ => "practice",
    }
}

/// All cards in introduction order. Exercises join the stage they fit.
pub fn all_cards(app: &App) -> Vec<Card> {
    let reg = app.registry.read().unwrap();
    let mut out = vec![];
    let ref_text = app.prompts["reference"]["text"].as_str().unwrap_or("Count from one to ten.").to_string();
    let ref_prompt = app.prompts["reference"]["prompt_id"].as_str().unwrap_or("ref.count-1-10").to_string();
    out.push(Card {
        id: REFERENCE_CARD.into(), stage: 0, deck: "reference".into(), deck_title: "Reference".into(), kind: "reference".into(),
        front: "One, two, three, four, five, six, seven, eight, nine, ten.".into(),
        hint: format!("{ref_text} Same every day, so your recordings stay comparable."),
        area: "baseline".into(), level_id: "automatic".into(), text_kind: "automatic".into(),
        exercise_id: None, exercise_version: None, prompt_id: ref_prompt, source: "Lilt reference task (NHS Fife automatic speech)".into(),
    });
    let exercise_after: BTreeMap<&str, Vec<&str>> = BTreeMap::from([
        ("warmup", vec!["nhsfife.forward-hum"]),
        ("automatic", vec!["nhsfife.gentle-pitch-count"]),
        ("phrases", vec!["nhsfife.smile-brighten", "nhsfife.real-phrases-intonation"]),
    ]);
    let levels = crate::syllabus::texts(app)["levels"].as_array().cloned().unwrap_or_default();
    for (si, l) in levels.iter().enumerate() {
        let lid = l["id"].as_str().unwrap_or_default();
        let ltitle = l["title"].as_str().unwrap_or_default();
        let lkind = l["kind"].as_str().unwrap_or_default();
        let stage = si + 1;
        for it in l["items"].as_array().cloned().unwrap_or_default() {
            let iid = it["id"].as_str().unwrap_or_default();
            out.push(Card {
                id: crate::courses::text_id(crate::courses::DEFAULT, lid, iid), stage, deck: lid.into(), deck_title: ltitle.into(), kind: "text".into(),
                front: it["text"].as_str().unwrap_or_default().into(), hint: it["hint"].as_str().unwrap_or_default().into(),
                area: level_area(lid).into(), level_id: lid.into(), text_kind: lkind.into(),
                exercise_id: None, exercise_version: None, prompt_id: crate::courses::text_id(crate::courses::DEFAULT, lid, iid),
                source: l["written_by"].as_str().unwrap_or_default().into(),
            });
        }
        for ex_id in exercise_after.get(lid).cloned().unwrap_or_default() {
            if let Some(ex) = reg.latest(ex_id) {
                out.push(Card {
                    id: format!("ex.{}", ex.id), stage, deck: lid.into(), deck_title: ltitle.into(), kind: "exercise".into(),
                    front: ex.practice_task.prompt_text.clone(), hint: ex.primary_cue.text.clone(),
                    area: ex.primary_area.clone(), level_id: lid.into(), text_kind: "phrases".into(),
                    exercise_id: Some(ex.id.clone()), exercise_version: Some(ex.version), prompt_id: ex.practice_task.prompt_id.clone(),
                    source: ex.raw["source"]["title"].as_str().unwrap_or("NHS Fife").into(),
                });
            }
        }
    }
    out
}

fn state_path(app: &App) -> std::path::PathBuf {
    app.paths.root.join("cards").join("state.json")
}
fn log_path(app: &App) -> std::path::PathBuf {
    app.paths.root.join("cards").join("reviews.jsonl")
}

pub fn load_state(app: &App) -> BTreeMap<String, CardState> {
    store::read_json_opt(&state_path(app)).ok().flatten().unwrap_or_default()
}

pub fn reviews(app: &App) -> Vec<ReviewLog> {
    std::fs::read_to_string(log_path(app))
        .unwrap_or_default()
        .lines()
        .filter_map(|l| serde_json::from_str(l).ok())
        .collect()
}

fn date(s: &str) -> NaiveDate {
    NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap_or_else(|_| chrono::Utc::now().date_naive())
}

/// The interval (days) a rating would give. 0 means "again, later today".
pub fn next_interval(st: &CardState, rating: &str) -> (i64, f64) {
    let ease = if st.ease > 0.0 { st.ease } else { START_EASE };
    if st.reps == 0 {
        return match rating {
            "again" => (0, ease),
            "hard" => (1, ease - 0.15),
            "good" => (1, ease),
            _ => (4, ease + 0.15),
        };
    }
    let ivl = st.interval_days.max(1) as f64;
    let (days, e) = match rating {
        "again" => (0.0, ease - 0.2),
        "hard" => ((ivl * 1.2).max(ivl + 1.0), ease - 0.15),
        "good" => ((ivl * ease).max(ivl + 1.0), ease),
        _ => ((ivl * ease * 1.3).max(ivl + 2.0), ease + 0.15),
    };
    ((days.round() as i64).min(MAX_INTERVAL), e.max(MIN_EASE))
}

pub fn describe_interval(days: i64) -> String {
    match days {
        0 => "later today".into(),
        1 => "tomorrow".into(),
        d if d < 14 => format!("{d} days"),
        d if d < 60 => format!("{} weeks", (d as f64 / 7.0).round() as i64),
        _ => "2 months".into(),
    }
}

#[derive(Debug, Serialize)]
pub struct QueueItem {
    pub card: Card,
    /// "daily" | "new" | "review" | "again"
    pub kind: String,
    pub done_today: bool,
    pub rating_today: Option<String>,
    pub preview: BTreeMap<String, String>,
    pub state: CardState,
}

/// Today's deck. Capped so a missed week never turns into a pile: overdue cards
/// beyond the cap simply wait, oldest first, with no catch-up debt shown.
pub fn today_queue(app: &App) -> Result<Value> {
    let profile = app.profile();
    let (today, _) = util::local_now(&profile.timezone);
    let td = date(&today);
    let cards = all_cards(app);
    let state = load_state(app);
    let logs = reviews(app);
    let paused = app.current_plan().map(|p| p.paused).unwrap_or(false);
    let cap = (profile.session_minutes as usize).clamp(4, 15);
    let new_per_day = profile.new_cards_per_day.min(5) as usize;

    let today_logs: Vec<&ReviewLog> = logs.iter().filter(|l| l.local_date == today).collect();
    let rated_today = |id: &str| today_logs.iter().rev().find(|l| l.card_id == id).map(|l| l.rating.clone());
    let introduced_today = state.values().filter(|s| s.introduced_date.as_deref() == Some(today.as_str())).count();

    // Which stages are open: stage 1 always; each next one once the previous is mostly learned.
    let max_stage = cards.iter().map(|c| c.stage).max().unwrap_or(1);
    let mut open_stage = 1;
    for s in 1..max_stage {
        let in_stage: Vec<&Card> = cards.iter().filter(|c| c.stage == s).collect();
        let learned = in_stage.iter().filter(|c| state.get(&c.id).map(|x| x.learned()).unwrap_or(false)).count();
        if !in_stage.is_empty() && learned as f64 / in_stage.len() as f64 >= UNLOCK_SHARE { open_stage = s + 1; } else { break; }
    }

    let mut picked: Vec<(Card, String)> = vec![];
    if paused {
        return Ok(json!({
            "local_date": today, "paused": true, "items": [], "counts": {"new": 0, "review": 0, "again": 0},
            "open_stage": open_stage, "cap": cap,
            "message": "Your plan is paused after a comfort report. Rest today; a quick check-in is still fine.",
        }));
    }
    // 1. The reference phrase, every day (keeps recordings comparable).
    if let Some(r) = cards.iter().find(|c| c.id == REFERENCE_CARD) { picked.push((r.clone(), "daily".into())); }
    // 2. Cards rated "again" today come back.
    for c in &cards {
        if c.id == REFERENCE_CARD { continue; }
        if let Some(s) = state.get(&c.id) {
            if !s.suspended && s.last_reviewed_date.as_deref() == Some(today.as_str()) && s.due.as_deref() == Some(today.as_str()) && s.last_rating.as_deref() == Some("again") {
                picked.push((c.clone(), "again".into()));
            }
        }
    }
    // 3. Reviews due today or earlier, oldest first; also keep those already done today.
    let mut due: Vec<(&Card, &CardState)> = cards.iter().filter(|c| c.id != REFERENCE_CARD)
        .filter_map(|c| state.get(&c.id).map(|s| (c, s)))
        .filter(|(_, s)| !s.suspended && s.reps > 0 && (s.due.as_deref().map(|d| date(d) <= td).unwrap_or(false) || s.last_reviewed_date.as_deref() == Some(today.as_str())))
        .filter(|(_, s)| !(s.last_rating.as_deref() == Some("again") && s.last_reviewed_date.as_deref() == Some(today.as_str())))
        .collect();
    due.sort_by(|a, b| a.1.due.cmp(&b.1.due).then(b.1.lapses.cmp(&a.1.lapses)));
    for (c, _) in due { if picked.len() >= cap { break; } picked.push((c.clone(), "review".into())); }
    // 4. New cards, in order, from open stages, within today's allowance.
    let mut new_left = new_per_day.saturating_sub(introduced_today);
    for c in cards.iter().filter(|c| c.id != REFERENCE_CARD && c.stage <= open_stage) {
        if picked.len() >= cap || new_left == 0 { break; }
        let st = state.get(&c.id);
        if st.map(|s| s.reps == 0 && !s.suspended).unwrap_or(true) && !picked.iter().any(|(p, _)| p.id == c.id) {
            picked.push((c.clone(), "new".into()));
            new_left -= 1;
        }
    }
    // Cards introduced today stay visible even after the allowance is used.
    for c in cards.iter() {
        if let Some(s) = state.get(&c.id) {
            if s.introduced_date.as_deref() == Some(today.as_str()) && !picked.iter().any(|(p, _)| p.id == c.id) {
                picked.push((c.clone(), "new".into()));
            }
        }
    }

    let items: Vec<QueueItem> = picked.into_iter().map(|(c, kind)| {
        let st = state.get(&c.id).cloned().unwrap_or_default();
        let rt = rated_today(&c.id);
        let done = match (&rt, kind.as_str()) {
            (Some(r), _) => r != "again" || st.due.as_deref() != Some(today.as_str()),
            _ => false,
        };
        let preview = ["again", "hard", "good", "easy"].iter().map(|r| (r.to_string(), describe_interval(next_interval(&st, r).0))).collect();
        QueueItem { card: c, kind, done_today: done, rating_today: rt, preview, state: st }
    }).collect();
    let count = |k: &str| items.iter().filter(|i| i.kind == k && !i.done_today).count();
    let all_done = !items.is_empty() && items.iter().all(|i| i.done_today);
    let next_due = state.iter().filter(|(_, s)| !s.suspended && s.reps > 0).filter_map(|(_, s)| s.due.clone()).filter(|d| date(d) > td).min();
    Ok(json!({
        "local_date": today, "paused": false, "items": items, "all_done": all_done,
        "counts": {"new": count("new"), "review": count("review") + count("daily"), "again": count("again")},
        "open_stage": open_stage, "stages": max_stage, "cap": cap, "next_due": next_due,
        "learned": state.values().filter(|s| s.learned()).count(), "total_cards": cards.len(),
        "suspended": state.iter().filter(|(_, s)| s.suspended).map(|(k, _)| k.clone()).collect::<Vec<_>>(),
    }))
}

#[derive(Debug, Deserialize)]
pub struct RateReq {
    pub card_id: String,
    pub take_id: Option<String>,
    /// "again" | "hard" | "good" | "easy" | "ouch"
    pub rating: String,
}

/// Apply a rating. Idempotent per (card, take): repeating it changes nothing.
pub fn rate(app: &App, req: RateReq) -> Result<Value> {
    if !["again", "hard", "good", "easy", "ouch"].contains(&req.rating.as_str()) { bail!("unknown rating"); }
    let card = all_cards(app).into_iter().find(|c| c.id == req.card_id).ok_or_else(|| anyhow!("card not found"))?;
    if let Some(t) = &req.take_id { app.take(t).map_err(|_| anyhow!("take does not exist"))?; }
    let _g = app.write_lock.lock().unwrap();
    if let Some(t) = &req.take_id {
        if reviews(app).iter().any(|l| l.card_id == card.id && l.take_id.as_deref() == Some(t.as_str())) {
            return Ok(json!({"duplicate": true, "card_id": card.id}));
        }
    }
    let profile = app.profile();
    let (today, _) = util::local_now(&profile.timezone);
    let mut all = load_state(app);
    let mut st = all.get(&card.id).cloned().unwrap_or_default();
    if st.ease == 0.0 { st.ease = START_EASE; }
    if st.introduced_date.is_none() { st.introduced_date = Some(today.clone()); }
    let before = st.interval_days;

    if req.rating == "ouch" {
        // Comfort first: suspend this card and pause the plan; nothing gets harder.
        st.suspended = true;
        st.suspended_reason = Some("comfort".into());
        st.last_rating = Some("ouch".into());
        if let Some(cur) = app.current_plan() {
            if !cur.paused {
                let v = cur.version;
                app.write_plan(Plan { paused: true, author: "learner".into(), rationale: "Paused after you said a card hurt or felt strained. Rest, and resume when speaking feels comfortable.".into(), ..cur }, Some(v))?;
            }
        }
    } else if card.id == REFERENCE_CARD {
        // The daily reference isn't spaced; it's just recorded each day.
        st.reps += 1;
        st.last_rating = Some(req.rating.clone());
        st.due = Some((date(&today) + Duration::days(1)).to_string());
        st.interval_days = 1;
    } else {
        let (days, ease) = next_interval(&st, &req.rating);
        st.ease = ease;
        if req.rating == "again" {
            if st.reps > 0 { st.lapses += 1; }
            st.good_streak = 0;
            st.interval_days = 0;
            st.due = Some(today.clone());
        } else {
            st.reps += 1;
            st.interval_days = days;
            st.due = Some((date(&today) + Duration::days(days)).to_string());
            st.good_streak = if req.rating == "hard" { 0 } else { st.good_streak + 1 };
        }
        st.last_rating = Some(req.rating.clone());
    }
    st.last_reviewed_utc = Some(util::now_utc());
    st.last_reviewed_date = Some(today.clone());
    all.insert(card.id.clone(), st.clone());
    store::write_json(&state_path(app), &all)?;
    let log = ReviewLog {
        card_id: card.id.clone(), take_id: req.take_id.clone(), rating: req.rating.clone(), reviewed_utc: util::now_utc(),
        local_date: today, interval_before: before, interval_after: st.interval_days, due_after: st.due.clone(),
    };
    store::append_line(&log_path(app), &serde_json::to_string(&log)?)?;
    // Keep the rating with the recording too (it's the learner's own report).
    if let Some(t) = &req.take_id {
        if let Ok(mut take) = app.take(t) {
            take.card = Some(json!({"card_id": card.id, "rating": req.rating, "rated_utc": log.reviewed_utc}));
            app.save_take(&take)?;
        }
    }
    Ok(json!({"card_id": card.id, "state": st, "next": describe_interval(st.interval_days), "paused": req.rating == "ouch"}))
}

/// Un-suspend cards paused for comfort (when the learner resumes). They come back due today.
pub fn resume_suspended(app: &App) -> Result<()> {
    let _g = app.write_lock.lock().unwrap();
    let (today, _) = util::local_now(&app.profile().timezone);
    let mut all = load_state(app);
    for s in all.values_mut() {
        if s.suspended_reason.as_deref() == Some("comfort") {
            s.suspended = false;
            s.suspended_reason = None;
            if s.reps > 0 { s.due = Some(today.clone()); }
        }
    }
    store::write_json(&state_path(app), &all)
}
