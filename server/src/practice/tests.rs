//! Practice scenarios: plan versions and the spaced-repetition card deck.

use crate::app::App;
use crate::practice::cards::{self, CardState, RateReq};
use crate::recordings;
use crate::store;
use crate::test_support::*;
use std::collections::BTreeMap;

#[test]
fn stale_plan_writes_are_rejected() {
    let (_d, app) = app();
    let p = app.ensure_plan().unwrap();
    let mut next = p.clone();
    next.exercise_id = "nhsfife.smile-brighten".into();
    app.write_plan(next.clone(), Some(p.version)).unwrap();
    assert!(format!("{:#}", app.write_plan(next, Some(p.version)).unwrap_err()).contains("stale plan"));
}

fn rate(app: &App, card: &str, take: Option<String>, rating: &str) -> serde_json::Value {
    cards::rate(app, RateReq { card_id: card.into(), take_id: take, rating: rating.into() }).unwrap()
}

fn queue_ids(app: &App) -> Vec<(String, String, bool)> {
    let q = cards::today_queue(app).unwrap();
    q["items"].as_array().unwrap().iter()
        .map(|i| (i["card"]["id"].as_str().unwrap().to_string(), i["kind"].as_str().unwrap().to_string(), i["done_today"].as_bool().unwrap()))
        .collect()
}

#[test]
fn card_intervals_grow_and_stay_bounded() {
    let new = CardState::default();
    assert_eq!(cards::next_interval(&new, "again").0, 0);
    assert_eq!(cards::next_interval(&new, "good").0, 1);
    assert_eq!(cards::next_interval(&new, "easy").0, 4);
    let review = CardState { reps: 2, interval_days: 3, ease: 2.5, ..Default::default() };
    let (hard, _) = cards::next_interval(&review, "hard");
    let (good, _) = cards::next_interval(&review, "good");
    let (easy, _) = cards::next_interval(&review, "easy");
    assert!(hard < good && good < easy, "{hard} {good} {easy}");
    assert_eq!(good, 8);
    let long = CardState { reps: 9, interval_days: 50, ease: 2.8, ..Default::default() };
    assert_eq!(cards::next_interval(&long, "easy").0, 60, "intervals are capped");
    let weak = CardState { reps: 3, interval_days: 2, ease: 1.35, ..Default::default() };
    assert!(cards::next_interval(&weak, "again").1 >= 1.3, "ease has a floor");
}

#[test]
fn first_deck_is_reference_plus_new_cards_from_first_stage() {
    let (_d, app) = app();
    let q = queue_ids(&app);
    assert_eq!(q[0].0, cards::REFERENCE_CARD);
    let new: Vec<_> = q.iter().filter(|x| x.1 == "new").collect();
    assert_eq!(new.len(), 2, "default two new cards a day: {q:?}");
    let all = cards::all_cards(&app);
    for (id, _, _) in &new {
        assert_eq!(all.iter().find(|c| &c.id == id).unwrap().stage, 1, "only stage-1 cards at the start");
    }
}

#[test]
fn rating_schedules_card_is_idempotent_and_again_returns_today() {
    let (_d, app) = app();
    let s = recordings::deck_session(&app).unwrap();
    assert_eq!(recordings::deck_session(&app).unwrap().id, s.id, "one deck session a day");
    let q = queue_ids(&app);
    let (first, second) = (q[1].0.clone(), q[2].0.clone());
    let take = new_take(&app, &s.id, T::default(), "audio/wav");
    let r = rate(&app, &first, Some(take.clone()), "good");
    assert_eq!(r["next"], "tomorrow");
    assert_eq!(rate(&app, &first, Some(take.clone()), "easy")["duplicate"], true, "same take rated twice is ignored");
    assert_eq!(app.take(&take).unwrap().card.unwrap()["rating"], "good");
    rate(&app, &second, None, "again");
    let q = queue_ids(&app);
    assert!(q.iter().any(|x| x.0 == first && x.2), "rated card is ticked done: {q:?}");
    assert!(q.iter().any(|x| x.0 == second && x.1 == "again" && !x.2), "again card comes back today: {q:?}");
    rate(&app, &second, None, "good");
    let q = queue_ids(&app);
    assert!(q.iter().any(|x| x.0 == second && x.2), "{q:?}");
    let log = cards::reviews(&app);
    assert_eq!(log.len(), 3);
}

#[test]
fn missed_days_never_become_a_backlog() {
    let (_d, app) = app();
    let all = cards::all_cards(&app);
    let mut state = BTreeMap::new();
    for c in all.iter().filter(|c| c.id != cards::REFERENCE_CARD) {
        state.insert(c.id.clone(), CardState { due: Some("2020-01-01".into()), interval_days: 3, ease: 2.5, reps: 2, ..Default::default() });
    }
    store::write_json(&app.paths.root.join("cards/state.json"), &state).unwrap();
    let q = cards::today_queue(&app).unwrap();
    let cap = q["cap"].as_u64().unwrap() as usize;
    assert!(q["items"].as_array().unwrap().len() <= cap, "overdue cards wait instead of piling up");
    assert_eq!(q["counts"]["new"], 0);
}

#[test]
fn hurt_card_is_suspended_pauses_plan_and_resume_brings_it_back() {
    let (_d, app) = app();
    app.ensure_plan().unwrap();
    let q = queue_ids(&app);
    let card = q[1].0.clone();
    rate(&app, &card, None, "good");
    rate(&app, &card, None, "ouch");
    assert!(app.current_plan().unwrap().paused, "plan pauses after a comfort report");
    let st = cards::load_state(&app);
    assert!(st[&card].suspended);
    let q = cards::today_queue(&app).unwrap();
    assert_eq!(q["paused"], true);
    assert!(q["items"].as_array().unwrap().is_empty(), "nothing to practise while paused");
    cards::resume_suspended(&app).unwrap();
    assert!(!cards::load_state(&app)[&card].suspended);
}

#[test]
fn chapters_set_their_own_cards_and_older_copies_fall_back() {
    use crate::courses::syllabus;
    let (_d, app) = app();
    let all = cards::all_cards(&app);
    // Start here (`today: false`) makes no cards and takes no stage: Warm-ups is stage 1, and the
    // stages run on without a gap, so Today's unlocking never stalls on an empty one.
    assert!(!all.iter().any(|c| c.level_id == "start-here"));
    assert!(all.iter().any(|c| c.stage == 1 && c.level_id == "warmup"));
    let max = all.iter().map(|c| c.stage).max().unwrap();
    assert!((1..=max).all(|s| all.iter().any(|c| c.stage == s)), "no empty stage");
    // `area` and `exercises` come from the chapter...
    assert!(all.iter().any(|c| c.id == "text.weight.light-hello" && c.area == "lightness"));
    assert!(all.iter().any(|c| c.id == "ex.nhsfife.real-phrases-intonation" && c.level_id == "intonation"));
    // ...and a copy made before they existed falls back to the built-in table by chapter id.
    let v = crate::courses::get(&app, "voice").unwrap();
    let file = std::fs::read_to_string(root().join("content/courses/voice/02-warmup.md")).unwrap();
    let old = file.lines().filter(|l| !l.starts_with("exercises:") && !l.starts_with("area:")).collect::<Vec<_>>().join("\n");
    syllabus::write(&app, &v, "02-warmup.md", &old, "an older copy").unwrap();
    let all = cards::all_cards(&app);
    assert!(all.iter().any(|c| c.id == "ex.nhsfife.forward-hum" && c.level_id == "warmup"));
    assert!(all.iter().any(|c| c.id == "text.warmup.hum" && c.area == "resonance"));
}
