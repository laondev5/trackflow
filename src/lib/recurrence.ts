import type { Recurrence } from "./types";

const DAY = 86_400_000;

function weekdayIn(date: Date, tz: string) {
  try {
    const w = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: tz }).format(date);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(w);
  } catch {
    return date.getUTCDay();
  }
}

function step(date: Date, rule: Recurrence, tz: string): Date {
  const d = new Date(date);
  switch (rule) {
    case "daily":
      return new Date(d.getTime() + DAY);
    case "weekdays": {
      let next = new Date(d.getTime() + DAY);
      while ([0, 6].includes(weekdayIn(next, tz))) next = new Date(next.getTime() + DAY);
      return next;
    }
    case "weekly":
      return new Date(d.getTime() + 7 * DAY);
    case "monthly": {
      const day = d.getUTCDate();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + 1);
      const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      d.setUTCDate(Math.min(day, lastDay));
      return d;
    }
    case "yearly":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      return d;
    default:
      return d;
  }
}

/**
 * Next occurrence strictly after `now` (so completing a very overdue daily task
 * schedules it for the next upcoming day rather than another past date).
 */
export function nextOccurrence(due: Date, rule: Recurrence, tz = "UTC", now = new Date()): Date | null {
  if (rule === "none") return null;
  let next = step(due, rule, tz);
  let guard = 0;
  while (next.getTime() <= now.getTime() && guard++ < 1000) next = step(next, rule, tz);
  return next;
}

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "Does not repeat",
  daily: "Every day",
  weekdays: "Every weekday",
  weekly: "Every week",
  monthly: "Every month",
  yearly: "Every year",
};
