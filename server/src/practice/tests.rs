//! Practice scenarios: plan versions and the spaced-repetition card deck.

use crate::app::App;
use crate::practice::cards::{self, CardState, RateReq};
use crate::recordings;
use crate::store;
use crate::test_support::*;
use std::collections::BTreeMap;

#[test]
fn a_new_profile_does_not_assign_a_personal_goal_or_location() {
    let (_dir, app) = app();
    let profile = app.profile();
    assert!(profile.goal.summary.is_empty());
    assert!(profile.goal.descriptors.is_empty());
    assert!(profile.goal.preferred_take_ids.is_empty());
    assert_eq!(profile.timezone, "UTC");
}

#[test]
fn reopening_keeps_the_learners_saved_goal_timezone_and_plan() {
    let (dir, app) = app();
    let mut profile = app.profile();
    profile.goal.summary = "A more feminine voice for everyday conversation".into();
    profile.goal.descriptors = vec!["lighter".into(), "comfortable".into()];
    profile.timezone = "Asia/Kuala_Lumpur".into();
    store::write_json(&app.paths.profile(), &profile).unwrap();
    let mut plan = app.ensure_plan().unwrap();
    plan.rationale = "My existing practice plan".into();
    let version = plan.version;
    let plan = app.write_plan(plan, Some(version)).unwrap();
    drop(app);

    let reopened = App::open(config(dir.path())).unwrap();
    assert_eq!(
        serde_json::to_value(reopened.profile()).unwrap(),
        serde_json::to_value(profile).unwrap()
    );
    assert_eq!(
        serde_json::to_value(reopened.ensure_plan().unwrap()).unwrap(),
        serde_json::to_value(plan).unwrap()
    );
}

#[test]
fn stale_plan_writes_are_rejected() {
    let (_d, app) = app();
    let p = app.ensure_plan().unwrap();
    let mut next = p.clone();
    next.exercise_id = "nhsfife.smile-brighten".into();
    app.write_plan(next.clone(), Some(p.version)).unwrap();
    assert!(
        format!("{:#}", app.write_plan(next, Some(p.version)).unwrap_err()).contains("stale plan")
    );
}

fn rate(app: &App, card: &str, take: Option<String>, rating: &str) -> serde_json::Value {
    cards::rate(
        app,
        RateReq {
            request_id: None,
            card_id: card.into(),
            take_id: take,
            rating: rating.into(),
        },
    )
    .unwrap()
}

fn queue_ids(app: &App) -> Vec<(String, String, bool)> {
    let q = cards::today_queue(app).unwrap();
    q["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|i| {
            (
                i["card"]["id"].as_str().unwrap().to_string(),
                i["kind"].as_str().unwrap().to_string(),
                i["done_today"].as_bool().unwrap(),
            )
        })
        .collect()
}

#[test]
fn card_intervals_grow_and_stay_bounded() {
    let new = CardState::default();
    assert_eq!(cards::next_interval(&new, "again").0, 0);
    assert_eq!(cards::next_interval(&new, "hard").0, 1);
    assert_eq!(
        cards::next_interval(&new, "good").0,
        2,
        "good waits longer than hard"
    );
    assert_eq!(cards::next_interval(&new, "easy").0, 4);
    let review = CardState {
        reps: 2,
        interval_days: 3,
        ease: 2.5,
        ..Default::default()
    };
    let (hard, _) = cards::next_interval(&review, "hard");
    let (good, _) = cards::next_interval(&review, "good");
    let (easy, _) = cards::next_interval(&review, "easy");
    assert!(hard < good && good < easy, "{hard} {good} {easy}");
    assert_eq!(good, 8);
    let long = CardState {
        reps: 9,
        interval_days: 50,
        ease: 2.8,
        ..Default::default()
    };
    assert_eq!(
        cards::next_interval(&long, "easy").0,
        60,
        "intervals are capped"
    );
    let weak = CardState {
        reps: 3,
        interval_days: 2,
        ease: 1.35,
        ..Default::default()
    };
    assert!(
        cards::next_interval(&weak, "again").1 >= 1.3,
        "ease has a floor"
    );
}

#[test]
fn first_deck_is_reference_plus_new_cards_from_first_stage() {
    let (_d, app) = app();
    let q = queue_ids(&app);
    assert_eq!(q[1].0, cards::REFERENCE_CARD);
    let new: Vec<_> = q.iter().filter(|x| x.1 == "new").collect();
    assert_eq!(new.len(), 2, "default two new cards a day: {q:?}");
    let all = cards::all_cards(&app);
    for (id, _, _) in &new {
        assert_eq!(
            all.iter().find(|c| &c.id == id).unwrap().stage,
            1,
            "only stage-1 cards at the start"
        );
    }
}

#[test]
fn a_chapter_practised_in_opens_its_stage_in_the_deck() {
    let (_d, app) = app();
    let all = cards::all_cards(&app);
    let pitch = all
        .iter()
        .find(|c| c.prompt_id == "text.pitch.mm-hm")
        .expect("pitch has an mm-hm card");
    assert!(pitch.stage > 1, "pitch comes after the first stage");
    let q = cards::today_queue(&app).unwrap();
    assert_eq!(q["open_stage"], 1, "a new deck starts at the first stage");
    let s = recordings::deck_session(&app).unwrap();
    new_take(
        &app,
        &s.id,
        T {
            prompt: "text.pitch.mm-hm",
            exercise: None,
            ..T::default()
        },
        "audio/wav",
    );
    let q = cards::today_queue(&app).unwrap();
    assert_eq!(
        q["open_stage"].as_u64().unwrap() as usize,
        pitch.stage,
        "practising Pitch in its chapter opens Pitch in Today's deck"
    );
    assert_eq!(q["open_chapter"]["id"], "pitch");
}

#[test]
fn rating_schedules_card_is_idempotent_and_again_returns_today() {
    let (_d, app) = app();
    let s = recordings::deck_session(&app).unwrap();
    assert_eq!(
        recordings::deck_session(&app).unwrap().id,
        s.id,
        "one deck session a day"
    );
    let q = queue_ids(&app);
    let (first, second) = (q[1].0.clone(), q[2].0.clone());
    let take = new_take(
        &app,
        &s.id,
        T {
            prompt: "ref.count-1-10",
            exercise: None,
            ..T::default()
        },
        "audio/wav",
    );
    let r = rate(&app, &first, Some(take.clone()), "good");
    assert_eq!(r["next"], "tomorrow");
    assert_eq!(
        rate(&app, &first, Some(take.clone()), "easy")["duplicate"],
        true,
        "same take rated twice is ignored"
    );
    assert_eq!(app.take(&take).unwrap().card.unwrap()["rating"], "good");
    rate(&app, &second, None, "again");
    let q = queue_ids(&app);
    assert!(
        q.iter().any(|x| x.0 == first && x.2),
        "rated card is ticked done: {q:?}"
    );
    assert!(
        q.iter().any(|x| x.0 == second && x.1 == "again" && !x.2),
        "again card comes back today: {q:?}"
    );
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
        state.insert(
            c.id.clone(),
            CardState {
                due: Some("2020-01-01".into()),
                interval_days: 3,
                ease: 2.5,
                reps: 2,
                ..Default::default()
            },
        );
    }
    store::write_json(&app.paths.root.join("cards/state.json"), &state).unwrap();
    let q = cards::today_queue(&app).unwrap();
    let cap = q["cap"].as_u64().unwrap() as usize;
    let capped = q["items"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|i| i["kind"] != "warmup" && i["kind"] != "cooldown")
        .count();
    assert!(capped <= cap, "overdue cards wait instead of piling up");
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
    assert!(
        app.current_plan().unwrap().paused,
        "plan pauses after a comfort report"
    );
    let st = cards::load_state(&app);
    assert!(st[&card].suspended);
    let q = cards::today_queue(&app).unwrap();
    assert_eq!(q["paused"], true);
    assert!(
        q["items"].as_array().unwrap().is_empty(),
        "nothing to practise while paused"
    );
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
    assert!(
        (1..=max).all(|s| all.iter().any(|c| c.stage == s)),
        "no empty stage"
    );
    // `area` and `exercises` come from the chapter...
    assert!(
        all.iter()
            .any(|c| c.id == "text.weight.light-hello" && c.area == "lightness")
    );
    assert!(
        all.iter()
            .any(|c| c.id == "ex.nhsfife.real-phrases-intonation" && c.level_id == "intonation")
    );
    // ...and a copy made before they existed falls back to the built-in table by chapter id.
    let v = crate::courses::get(&app, "voice").unwrap();
    let file = std::fs::read_to_string(root().join("content/courses/voice/02-warmup.md")).unwrap();
    let old = file
        .lines()
        .filter(|l| !l.starts_with("exercises:") && !l.starts_with("area:"))
        .collect::<Vec<_>>()
        .join("\n");
    syllabus::write(&app, &v, "02-warmup.md", &old, "an older copy").unwrap();
    let all = cards::all_cards(&app);
    assert!(
        all.iter()
            .any(|c| c.id == "ex.nhsfife.forward-hum" && c.level_id == "warmup")
    );
    assert!(
        all.iter()
            .any(|c| c.id == "text.warmup.hum" && c.area == "resonance")
    );
}

/// Recording the daily reference on day one doesn't use up a new-card slot.
#[test]
fn daily_reference_does_not_count_as_a_new_card() {
    let (_d, app) = app();
    rate(&app, cards::REFERENCE_CARD, None, "good");
    let q = queue_ids(&app);
    assert_eq!(
        q.iter().filter(|x| x.1 == "new").count(),
        2,
        "still two new cards: {q:?}"
    );
}

/// Two writers holding the same plan version: only one gets the next version.
#[test]
fn concurrent_plan_writes_get_one_version_each() {
    let (_d, app) = app();
    let p = app.ensure_plan().unwrap();
    let oks = std::thread::scope(|s| {
        let hs: Vec<_> = (0..8)
            .map(|_| s.spawn(|| app.write_plan(p.clone(), Some(p.version)).is_ok()))
            .collect();
        hs.into_iter()
            .map(|h| h.join().unwrap())
            .filter(|ok| *ok)
            .count()
    });
    assert_eq!(oks, 1);
    assert_eq!(app.current_plan().unwrap().version, p.version + 1);
    assert_eq!(app.plan_history().len(), 2);
}

fn set_warmup(app: &App, id: &str) {
    let mut p = app.profile();
    p.warmup_card = id.into();
    store::write_json(&app.paths.profile(), &p).unwrap();
}

/// Your warm-up opens every day's cards and the cool-down closes them: never spaced, never a new
/// card, and outside the cap. Choosing none turns both off.
#[test]
fn warm_up_first_and_cool_down_last_every_day() {
    let (_d, app) = app();
    let q = queue_ids(&app);
    assert_eq!(
        (q[0].0.as_str(), q[0].1.as_str()),
        ("text.warmup.hum", "warmup"),
        "{q:?}"
    );
    assert_eq!(
        (q.last().unwrap().0.as_str(), q.last().unwrap().1.as_str()),
        ("text.warmup.cool-down", "cooldown"),
        "{q:?}"
    );
    assert_eq!(
        q.iter().filter(|x| x.0 == "text.warmup.hum").count(),
        1,
        "not also a new card"
    );
    // Rating it Easy doesn't push it days away, and it doesn't use up a new-card slot.
    let r = rate(&app, "text.warmup.hum", None, "easy");
    assert_eq!(r["next"], "tomorrow");
    let q = queue_ids(&app);
    assert!(
        q.iter().any(|x| x.0 == "text.warmup.hum" && x.2),
        "done today: {q:?}"
    );
    assert_eq!(
        q.iter().filter(|x| x.1 == "new").count(),
        2,
        "still two new cards: {q:?}"
    );
    set_warmup(&app, "lip-trill");
    assert_eq!(queue_ids(&app)[0].0, "text.warmup.lip-trill");
    set_warmup(&app, "");
    let q = queue_ids(&app);
    assert!(
        q.iter().all(|x| x.1 != "warmup" && x.1 != "cooldown"),
        "{q:?}"
    );
}

/// A review of a card you know well is eyes-off every other time: no live line, rate first.
#[test]
fn well_known_reviews_alternate_eyes_off() {
    let (_d, app) = app();
    let mut state = BTreeMap::new();
    state.insert(
        "text.warmup.lip-trill".to_string(),
        CardState {
            due: Some("2020-01-01".into()),
            interval_days: 6,
            ease: 2.5,
            reps: 3,
            ..Default::default()
        },
    );
    state.insert(
        "text.warmup.ng".to_string(),
        CardState {
            due: Some("2020-01-01".into()),
            interval_days: 6,
            ease: 2.5,
            reps: 4,
            ..Default::default()
        },
    );
    state.insert(
        "text.warmup.zzz".to_string(),
        CardState {
            due: Some("2020-01-01".into()),
            interval_days: 1,
            ease: 2.5,
            reps: 1,
            ..Default::default()
        },
    );
    store::write_json(&app.paths.root.join("cards/state.json"), &state).unwrap();
    let q = cards::today_queue(&app).unwrap();
    let eyes = |id: &str| {
        q["items"]
            .as_array()
            .unwrap()
            .iter()
            .find(|i| i["card"]["id"] == id)
            .unwrap()["eyes_off"]
            .as_bool()
            .unwrap()
    };
    assert!(eyes("text.warmup.lip-trill"));
    assert!(!eyes("text.warmup.ng") && !eyes("text.warmup.zzz"));
}

/// About six weeks after your first "before" take it comes back for a before-and-after, then every
/// three weeks; recording it today marks it done; "Not today" puts it off a week; nothing shows until
/// you've recorded the first one.
#[test]
fn before_texts_come_back_for_a_before_and_after() {
    let (_d, app) = app();
    let ba = |app: &App| {
        queue_ids(app)
            .into_iter()
            .filter(|x| x.1 == "before_after")
            .collect::<Vec<_>>()
    };
    assert!(ba(&app).is_empty());
    let s = session(&app);
    let t = T {
        role: crate::recordings::model::TakeRole::Free,
        prompt: "text.start-here.baseline-read",
        exercise: None,
        ..Default::default()
    };
    let old = upload(&app, &s.id, t, "harmonic_240.wav");
    assert!(
        ba(&app)
            .iter()
            .any(|x| x.0 == "text.start-here.baseline-read" && x.2),
        "recorded today: shown as done"
    );
    let age = |id: &str, days: i64| {
        let mut t = app.take(id).unwrap();
        t.created_utc = (chrono::Utc::now() - chrono::Duration::days(days)).to_rfc3339();
        app.save_take(&t).unwrap();
    };
    age(&old.id, 22);
    assert!(
        ba(&app).is_empty(),
        "the first one waits about six weeks, not three"
    );
    age(&old.id, 43);
    let due = vec![(
        "text.start-here.baseline-read".to_string(),
        "before_after".to_string(),
        false,
    )];
    assert_eq!(ba(&app), due);
    // Once it's been done, the next one is three weeks after the latest take.
    let again = upload(
        &app,
        &s.id,
        T {
            role: crate::recordings::model::TakeRole::Free,
            prompt: "text.start-here.baseline-read",
            exercise: None,
            ..Default::default()
        },
        "harmonic_240.wav",
    );
    age(&again.id, 10);
    assert!(ba(&app).is_empty(), "ten days after the last one");
    age(&again.id, 22);
    assert_eq!(ba(&app), due);
    // "Not today": done for today, doesn't use a new-card slot, and back after a week.
    rate(&app, "text.start-here.baseline-read", None, "later");
    assert!(ba(&app).iter().all(|x| x.2), "put off: done for today");
    assert_eq!(
        queue_ids(&app).iter().filter(|x| x.1 == "new").count(),
        2,
        "still two new cards"
    );
    assert!(
        cards::rate(
            &app,
            RateReq {
                request_id: None,
                card_id: "text.warmup.hum-to-hello".into(),
                take_id: None,
                rating: "later".into()
            }
        )
        .is_err(),
        "only a before-and-after can be put off"
    );
    // It isn't rated like a card, but "it hurts" still pauses the plan.
    assert!(
        cards::rate(
            &app,
            RateReq {
                request_id: None,
                card_id: "text.start-here.baseline-read".into(),
                take_id: None,
                rating: "good".into()
            }
        )
        .is_err()
    );
    rate(&app, "text.start-here.baseline-read", None, "ouch");
    assert!(app.current_plan().unwrap().paused);
}

/// When reviews would fill the day, one place is still kept for a new card.
#[test]
fn reviews_leave_room_for_a_new_card() {
    let (_d, app) = app();
    let mut state = BTreeMap::new();
    for c in cards::all_cards(&app)
        .iter()
        .filter(|c| c.stage == 1 && c.id != "text.warmup.hum" && c.id != "text.warmup.cool-down")
        .take(7)
    {
        state.insert(
            c.id.clone(),
            CardState {
                due: Some("2020-01-01".into()),
                interval_days: 3,
                ease: 2.5,
                reps: 2,
                ..Default::default()
            },
        );
    }
    store::write_json(&app.paths.root.join("cards/state.json"), &state).unwrap();
    let q = queue_ids(&app);
    assert!(
        cards::all_cards(&app)
            .iter()
            .filter(|c| c.stage == 1)
            .count()
            > 9,
        "stage 1 still has unseen cards"
    );
    assert_eq!(q.iter().filter(|x| x.1 == "new").count(), 1, "{q:?}");
}
