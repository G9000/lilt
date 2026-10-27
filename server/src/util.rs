use chrono::{DateTime, SecondsFormat, Utc};
use chrono_tz::Tz;

pub fn now_utc() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

pub fn tz(name: &str) -> Tz {
    name.parse().unwrap_or(chrono_tz::Asia::Kuala_Lumpur)
}

/// (local date YYYY-MM-DD, local RFC3339 timestamp) for `now` in the named timezone.
pub fn local_now(tz_name: &str) -> (String, String) {
    local_at(Utc::now(), tz_name)
}

pub fn local_at(at: DateTime<Utc>, tz_name: &str) -> (String, String) {
    let local = at.with_timezone(&tz(tz_name));
    (
        local.format("%Y-%m-%d").to_string(),
        local.to_rfc3339_opts(SecondsFormat::Secs, false),
    )
}

pub fn new_id(prefix: &str) -> String {
    format!("{prefix}_{}", uuid::Uuid::now_v7().simple())
}
