// How a card reads away from its chapter page: its hint without the chapter's check-in label, and
// when cards come back as words rather than a date.

/** A card's hint away from its chapter: "Your check-in: …" only means something there. */
export function cardHint(hint: string): string {
  const t = hint.replace(/^your check-in:\s*/i, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** When something is due, from two YYYY-MM-DD days: "later today", "tomorrow" or "in 3 days". */
export function friendlyDate(day: string, today: string): string {
  const days = Math.round((Date.parse(`${day}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 86400000);
  return days <= 0 ? "later today" : days === 1 ? "tomorrow" : `in ${days} days`;
}
