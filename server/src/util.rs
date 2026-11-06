use chrono::{DateTime, SecondsFormat, Utc};
use chrono_tz::Tz;

pub fn now_utc() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

pub fn tz(name: &str) -> Tz {
    name.parse().unwrap_or(chrono_tz::UTC)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unknown_timezone_uses_utc_and_valid_timezones_keep_their_dates() {
        let at = "2026-11-07T23:30:00Z".parse::<DateTime<Utc>>().unwrap();
        assert_eq!(local_at(at, "unknown"), local_at(at, "UTC"));
        assert_eq!(local_at(at, "unknown").0, "2026-11-07");
        assert_eq!(local_at(at, "Asia/Kuala_Lumpur").0, "2026-11-08");
        assert_eq!(local_at(at, "America/New_York").0, "2026-11-07");
    }
}
