// Time zones as people read them: "Kuala Lumpur (GMT+8)" grouped under Asia, not "Asia/Kuala_Lumpur".

export interface ZoneOption { id: string; label: string }
export interface ZoneGroup { region: string; zones: ZoneOption[] }

/** The place a zone is named after: "America/Argentina/Buenos_Aires" is "Buenos Aires, Argentina". */
export function zoneCity(id: string): string {
  const parts = id.split("/").map((s) => s.replace(/_/g, " "));
  if (parts.length < 2) return parts[0];
  const [city, ...within] = parts.slice(1).reverse();
  return within.length ? `${city}, ${within.join(", ")}` : city;
}

/** Its offset from UTC at `at`, such as "GMT+8" or "GMT-3:30"; plain "GMT" when there's none. */
export function zoneOffset(id: string, at: Date): string {
  try {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: id, timeZoneName: "shortOffset" })
      .formatToParts(at).find((x) => x.type === "timeZoneName")?.value;
    return !name || name === "GMT+0" ? "GMT" : name;
  } catch {
    return "GMT";
  }
}

export const zoneLabel = (id: string, at: Date) => (id === "UTC" ? "UTC" : `${zoneCity(id)} (${zoneOffset(id, at)})`);

/** The zones by region, alphabetical by place, with UTC and other single names under "Other" at the end. */
export function zoneGroups(ids: string[], at: Date): ZoneGroup[] {
  const groups = new Map<string, ZoneOption[]>();
  for (const id of new Set(ids)) {
    const region = id.includes("/") ? id.split("/")[0] : "Other";
    const list = groups.get(region) ?? [];
    list.push({ id, label: zoneLabel(id, at) });
    groups.set(region, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)))
    .map(([region, zones]) => ({ region, zones: zones.sort((a, b) => a.label.localeCompare(b.label)) }));
}

/** The time and day in a zone, such as "6:54 PM on Sunday 8 November". */
export function zoneNow(id: string, at: Date, locale?: string): string {
  try {
    const time = new Intl.DateTimeFormat(locale, { timeZone: id, hour: "numeric", minute: "2-digit" }).format(at);
    const day = new Intl.DateTimeFormat(locale, { timeZone: id, weekday: "long", day: "numeric", month: "long" }).format(at);
    return `${time} on ${day.replace(",", "")}`;
  } catch {
    return "";
  }
}

/** This computer's own zone, if the browser can say. */
export function computerZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
