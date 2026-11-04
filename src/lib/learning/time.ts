/*
 * Calendar arithmetic in the learner's time zone. Derive counts "today" and
 * "this week" (Monday to Sunday) where the learner lives, not on the server.
 */

export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** The calendar date (YYYY-MM-DD) of an instant in a time zone. */
export function localDate(instant: Date | string, timeZone = DEFAULT_TIME_ZONE): string {
  const parts = formatter(timeZone).formatToParts(new Date(instant));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** 0 for Monday through 6 for Sunday. */
export function localWeekday(instant: Date | string, timeZone = DEFAULT_TIME_ZONE): number {
  const parts = formatter(timeZone).formatToParts(new Date(instant));
  const day = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  return Math.max(0, WEEKDAYS.indexOf(day));
}

/** Adds whole days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** The Monday (YYYY-MM-DD) of the week containing an instant. */
export function weekStart(instant: Date | string, timeZone = DEFAULT_TIME_ZONE): string {
  return addDays(localDate(instant, timeZone), -localWeekday(instant, timeZone));
}

/** A friendly long date, such as "Wednesday 4 November". */
export function longDate(instant: Date | string, timeZone = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(instant));
}
