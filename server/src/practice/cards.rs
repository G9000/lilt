//! Voice cards with spaced repetition ("Anki for your voice").
//!
//! Cards are generated from the content (reference phrase, exercises, practice texts);
//! only their scheduling state and the review log live in the data root:
//! `cards/state.json` (atomic rewrite) and `cards/reviews.jsonl` (append-only).
//! Ratings are the learner's own judgement. Pitch measurements never set a rating.
//! Differences from Anki, on purpose: a daily cap so missed days never become a backlog,
//! and an "it hurt" answer that suspends the card and pauses the plan.

use crate::app::App;
use crate::practice::model::Plan;
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
/// The chapter your daily warm-up comes from, and the text that cools down at the end.
const WARMUP_CHAPTER: &str = "warmup";
const COOL_DOWN: &str = "cool-down";
/// Your "before" texts from Start here come back to hear next to your first takes: first about six
/// weeks after you recorded them (once there's been time to change), then every three weeks.
const BEFORE_AFTER_FIRST_DAYS: i64 = 42;
const BEFORE_AFTER_DAYS: i64 = 21;
/// "Not today" on a before-and-after puts it off for a week.
const BEFORE_AFTER_SNOOZE_DAYS: i64 = 7;
const BEFORE_AFTER: [&str; 2] = ["baseline-read", "baseline-talk"];

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

/// Areas the original chapters train, for a chapter with no `area:` (a copy made before course version 2).
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
    // Built-in exercises for a chapter with no `exercises:` (a copy made before course version 2).
    let exercise_after: BTreeMap<&str, Vec<&str>> = BTreeMap::from([
        ("warmup", vec!["nhsfife.forward-hum"]),
        ("automatic", vec!["nhsfife.gentle-pitch-count"]),
        ("phrases", vec!["nhsfife.smile-brighten", "nhsfife.real-phrases-intonation"]),
    ]);
    let levels = crate::courses::syllabus::texts(app)["levels"].as_array().cloned().unwrap_or_default();
    // A draft chapter (a blank "New chapter" not filled in yet) has placeholder texts: no cards.
    // A chapter marked `today: false` (Start here) has no cards either, and takes no stage, so the
    // next chapter opens on day one.
    let levels: Vec<_> = levels.into_iter().filter(|l| l["draft"] != "true" && l["today"] != false).collect();
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
                area: l["area"].as_str().unwrap_or(level_area(lid)).into(), level_id: lid.into(), text_kind: lkind.into(),
                exercise_id: None, exercise_version: None, prompt_id: crate::courses::text_id(crate::courses::DEFAULT, lid, iid),
                source: l["written_by"].as_str().unwrap_or_default().into(),
            });
        }
        let exercises: Vec<String> = match l["exercises"].as_array() {
            Some(a) => a.iter().filter_map(|e| e.as_str().map(String::from)).collect(),
            None => exercise_after.get(lid).cloned().unwrap_or_default().into_iter().map(String::from).collect(),
        };
        for ex_id in &exercises {
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

/// The warm-up that opens today's cards and the cool-down that closes them (card ids), when the
/// learner has chosen one and the course has them. Neither is spaced: they come every day.
fn pinned(app: &App, cards: &[Card]) -> (Option<String>, Option<String>) {
    let w = app.profile().warmup_card;
    if w.is_empty() { return (None, None); }
    let id = |t: &str| crate::courses::text_id(crate::courses::DEFAULT, WARMUP_CHAPTER, t);
    let has = |id: String| cards.iter().any(|c| c.id == id).then_some(id);
    let warm = has(id(&w));
    let cool = if w == COOL_DOWN { None } else { has(id(COOL_DOWN)) };
    (warm, cool)
}

/// A card that comes every day instead of being spaced: the reference, and the pinned warm-up and cool-down.
fn is_daily(app: &App, cards: &[Card], id: &str) -> bool {
    if id == REFERENCE_CARD { return true; }
    let (w, c) = pinned(app, cards);
    w.as_deref() == Some(id) || c.as_deref() == Some(id)
}

/// Start here's "before" texts, due again once your last take of one is three weeks old (and shown
/// as done on the day you record it). Nothing until you've recorded the first one.
fn before_after(app: &App, today: &str) -> Vec<(Card, bool)> {
    let state = load_state(app);
    let texts = crate::courses::syllabus::texts(app);
    let Some(level) = texts["levels"].as_array().and_then(|ls| ls.iter().find(|l| l["id"] == "start-here")) else { return vec![] };
    let tz = app.profile().timezone;
    let takes = app.all_takes();
    let td = date(today);
    let mut out = vec![];
    for iid in BEFORE_AFTER {
        let Some(it) = level["items"].as_array().and_then(|a| a.iter().find(|i| i["id"] == iid)) else { continue };
        let id = crate::courses::text_id(crate::courses::DEFAULT, "start-here", iid);
        let days: Vec<String> = takes.iter().filter(|t| t.prompt_id == id && t.original.is_some())
            .filter_map(|t| chrono::DateTime::parse_from_rfc3339(&t.created_utc).ok())
            .map(|at| util::local_at(at.with_timezone(&chrono::Utc), &tz).0).collect();
        let (Some(first), Some(last)) = (days.iter().min(), days.iter().max()) else { continue };
        // Put off with "Not today": done for today, then due again once the week is up.
        let snoozed = state.get(&id).and_then(|s| s.due.clone()).filter(|d| date(d) > td);
        let done = last == today || snoozed.is_some() && state.get(&id).and_then(|s| s.last_reviewed_date.as_deref()) == Some(today);
        let wait = if first == last { BEFORE_AFTER_FIRST_DAYS } else { BEFORE_AFTER_DAYS };
        if !done && (date(last) > td - Duration::days(wait) || snoozed.is_some()) { continue; }
        out.push((Card {
            id: id.clone(), stage: 0, deck: "start-here".into(), deck_title: "Before and after".into(), kind: "text".into(),
            front: it["text"].as_str().unwrap_or_default().into(),
            hint: "Say it with whatever you've practised that feels easy, then listen beside your very first take. Small changes count, and hearing none yet is normal.".into(),
            area: "recording".into(), level_id: "start-here".into(), text_kind: level["kind"].as_str().unwrap_or("phrases").into(),
            exercise_id: None, exercise_version: None, prompt_id: id,
            source: level["written_by"].as_str().unwrap_or_default().into(),
        }, done));
    }
    out
}

#[derive(Debug, Serialize)]
pub struct QueueItem {
    pub card: Card,
    /// "warmup" | "daily" | "before_after" | "new" | "review" | "again" | "cooldown"
    pub kind: String,
    /// Record without the live pitch line, and rate before seeing the numbers: a review of a card
    /// you know well, every other time, so you learn to hear it yourself.
    pub eyes_off: bool,
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
    let (warm, cool) = pinned(app, &cards);
    let daily = |id: &str| id == REFERENCE_CARD || warm.as_deref() == Some(id) || cool.as_deref() == Some(id);
    // The daily cards aren't new cards, so they don't use up today's allowance.
    let introduced_today = state.iter().filter(|(id, s)| !daily(id) && s.introduced_date.as_deref() == Some(today.as_str())).count();

    // Which stages are open: stage 1 always; each next one once the previous is mostly learned.
    let max_stage = cards.iter().map(|c| c.stage).max().unwrap_or(1);
    let mut open_stage = 1;
    for s in 1..max_stage {
        let in_stage: Vec<&Card> = cards.iter().filter(|c| c.stage == s).collect();
        let learned = in_stage.iter().filter(|c| state.get(&c.id).map(|x| x.learned()).unwrap_or(false)).count();
        if !in_stage.is_empty() && learned as f64 / in_stage.len() as f64 >= UNLOCK_SHARE { open_stage = s + 1; } else { break; }
    }

    // The chapter the newest open stage belongs to, so a "new stage" note can name it and open it.
    let open_chapter = cards.iter().find(|c| c.stage == open_stage).map(|c| json!({"id": c.deck, "title": c.deck_title}));
    let mut picked: Vec<(Card, String)> = vec![];
    if paused {
        return Ok(json!({
            "local_date": today, "paused": true, "items": [], "counts": {"new": 0, "review": 0, "again": 0},
            "open_stage": open_stage, "open_chapter": open_chapter, "stages": max_stage, "cap": cap,
            "message": "Your plan is paused after a comfort report. Rest today; a quick check-in is still fine.",
        }));
    }
    // 1. Your warm-up first, then the reference phrase, every day (keeps recordings comparable),
    //    then any "before" text that's due for its before-and-after. Only the reference counts against the cap.
    if let Some(w) = cards.iter().find(|c| Some(&c.id) == warm.as_ref()) { picked.push((w.clone(), "warmup".into())); }
    if let Some(r) = cards.iter().find(|c| c.id == REFERENCE_CARD) { picked.push((r.clone(), "daily".into())); }
    let before_after = before_after(app, &today);
    for (c, _) in &before_after { picked.push((c.clone(), "before_after".into())); }
    let fixed = picked.len().saturating_sub(1);
    let full = |picked: &Vec<(Card, String)>| picked.len() - fixed >= cap;
    // 2. Cards rated "again" today come back.
    for c in &cards {
        if daily(&c.id) { continue; }
        if let Some(s) = state.get(&c.id) {
            if !s.suspended && s.last_reviewed_date.as_deref() == Some(today.as_str()) && s.due.as_deref() == Some(today.as_str()) && s.last_rating.as_deref() == Some("again") {
                picked.push((c.clone(), "again".into()));
            }
        }
    }
    // 3. Reviews due today or earlier, oldest first; also keep those already done today.
    let mut due: Vec<(&Card, &CardState)> = cards.iter().filter(|c| !daily(&c.id))
        .filter_map(|c| state.get(&c.id).map(|s| (c, s)))
        .filter(|(_, s)| !s.suspended && s.reps > 0 && (s.due.as_deref().map(|d| date(d) <= td).unwrap_or(false) || s.last_reviewed_date.as_deref() == Some(today.as_str())))
        .filter(|(_, s)| !(s.last_rating.as_deref() == Some("again") && s.last_reviewed_date.as_deref() == Some(today.as_str())))
        .collect();
    due.sort_by(|a, b| a.1.due.cmp(&b.1.due).then(b.1.lapses.cmp(&a.1.lapses)));
    // Leave one place for a new card while today's allowance and an open stage still have some, so
    // reviews never stall the course.
    let new_waiting = new_per_day > introduced_today
        && cards.iter().any(|c| !daily(&c.id) && c.stage <= open_stage && state.get(&c.id).map(|s| s.reps == 0 && !s.suspended).unwrap_or(true));
    let review_cap = if new_waiting { cap.saturating_sub(1) } else { cap };
    for (c, _) in due { if picked.len() - fixed >= review_cap { break; } picked.push((c.clone(), "review".into())); }
    // 4. New cards, in order, from open stages, within today's allowance.
    let mut new_left = new_per_day.saturating_sub(introduced_today);
    for c in cards.iter().filter(|c| !daily(&c.id) && c.stage <= open_stage) {
        if full(&picked) || new_left == 0 { break; }
        let st = state.get(&c.id);
        if st.map(|s| s.reps == 0 && !s.suspended).unwrap_or(true) && !picked.iter().any(|(p, _)| p.id == c.id) {
            picked.push((c.clone(), "new".into()));
            new_left -= 1;
        }
    }
    // Cards introduced today stay visible even after the allowance is used.
    for c in cards.iter().filter(|c| !daily(&c.id)) {
        if let Some(s) = state.get(&c.id) {
            if s.introduced_date.as_deref() == Some(today.as_str()) && !picked.iter().any(|(p, _)| p.id == c.id) {
                picked.push((c.clone(), "new".into()));
            }
        }
    }
    // 5. The cool-down closes the day.
    if let Some(c) = cards.iter().find(|c| Some(&c.id) == cool.as_ref()) { picked.push((c.clone(), "cooldown".into())); }

    let items: Vec<QueueItem> = picked.into_iter().map(|(c, kind)| {
        let st = state.get(&c.id).cloned().unwrap_or_default();
        let rt = rated_today(&c.id);
        let done = match (&rt, kind.as_str()) {
            // A before-and-after is done once you've recorded it today; it isn't rated.
            (_, "before_after") => before_after.iter().any(|(b, d)| b.id == c.id && *d),
            (Some(r), _) => r != "again" || st.due.as_deref() != Some(today.as_str()),
            _ => false,
        };
        let preview = ["again", "hard", "good", "easy"].iter().map(|r| {
            let days = if daily(&c.id) { 1 } else { next_interval(&st, r).0 };
            (r.to_string(), describe_interval(days))
        }).collect();
        let eyes_off = kind == "review" && st.reps >= 3 && st.reps % 2 == 1;
        QueueItem { card: c, kind, eyes_off, done_today: done, rating_today: rt, preview, state: st }
    }).collect();
    let count = |k: &str| items.iter().filter(|i| i.kind == k && !i.done_today).count();
    let all_done = !items.is_empty() && items.iter().all(|i| i.done_today);
    let next_due = state.iter().filter(|(_, s)| !s.suspended && s.reps > 0).filter_map(|(_, s)| s.due.clone()).filter(|d| date(d) > td).min();
    Ok(json!({
        "local_date": today, "paused": false, "items": items, "all_done": all_done,
        "counts": {"new": count("new"), "review": count("review") + count("daily") + count("warmup") + count("cooldown") + count("before_after"), "again": count("again")},
        "open_stage": open_stage, "open_chapter": open_chapter, "stages": max_stage, "cap": cap, "next_due": next_due,
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
    // "later" is "Not today" on a before-and-after.
    if !["again", "hard", "good", "easy", "ouch", "later"].contains(&req.rating.as_str()) { bail!("unknown rating"); }
    let cards = all_cards(app);
    // A before-and-after isn't a spaced card: it can only be put off ("later") or reported as hurting.
    let card = match cards.iter().find(|c| c.id == req.card_id) {
        Some(c) if req.rating != "later" => c.clone(),
        Some(_) => bail!("only a before-and-after can be put off"),
        None => {
            let (today, _) = util::local_now(&app.profile().timezone);
            before_after(app, &today).into_iter().map(|(c, _)| c)
                .find(|c| c.id == req.card_id && (req.rating == "ouch" || req.rating == "later")).ok_or_else(|| anyhow!("card not found"))?
        }
    };
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
    // A before-and-after isn't a new card, so it never uses up today's allowance.
    if st.introduced_date.is_none() && card.level_id != "start-here" { st.introduced_date = Some(today.clone()); }
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
    } else if req.rating == "later" {
        st.due = Some((date(&today) + Duration::days(BEFORE_AFTER_SNOOZE_DAYS)).to_string());
        st.last_rating = Some("later".into());
    } else if is_daily(app, &cards, &card.id) {
        // The reference and the pinned warm-up and cool-down aren't spaced; they're recorded each
        // day. Good or Easy still counts towards learning the warm-up chapter.
        st.reps += 1;
        st.last_rating = Some(req.rating.clone());
        st.due = Some((date(&today) + Duration::days(1)).to_string());
        st.interval_days = 1;
        st.good_streak = if matches!(req.rating.as_str(), "good" | "easy") { st.good_streak + 1 } else { 0 };
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
