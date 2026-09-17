import type { Task } from "./types";

export const MINUTE = 60_000;
export const DAY = 86_400_000;

export function startOfDay(d: Date | number = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date | number = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date | number, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function dayKey(d: Date | string | number) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export function isSameDay(a: Date | string, b: Date | string) {
  return dayKey(a) === dayKey(b);
}

export function isOverdue(t: Pick<Task, "completed" | "dueDate">, now = Date.now()) {
  return !t.completed && !!t.dueDate && new Date(t.dueDate).getTime() < now;
}

export function isDueToday(t: Pick<Task, "dueDate">) {
  return !!t.dueDate && isSameDay(t.dueDate, new Date());
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const shortFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const fullFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });

export const formatTime = (d: Date | string) => timeFmt.format(new Date(d));

export function relativeDay(d: Date | string) {
  const date = new Date(d);
  const diff = Math.round((startOfDay(date).getTime() - startOfDay().getTime()) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return weekdayFmt.format(date);
  if (date.getFullYear() !== new Date().getFullYear()) {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
  }
  return shortFmt.format(date);
}

export function formatDue(t: Pick<Task, "dueDate" | "hasTime">) {
  if (!t.dueDate) return "";
  const day = relativeDay(t.dueDate);
  return t.hasTime ? `${day} ${formatTime(t.dueDate)}` : day;
}

export const formatFullDay = (d: Date | string) => fullFmt.format(new Date(d));

export function timeAgo(d: Date | string) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return shortFmt.format(new Date(d));
}

/** All-day tasks are stored at 23:59:59.999 local so they only become overdue after the day ends. */
export function toDueDate(date: Date, hasTime: boolean) {
  return hasTime ? date : endOfDay(date);
}

/** Reminder offsets: for timed tasks minutes before due; for all-day tasks minutes before 9:00 AM on the day. */
export function computeRemindAt(dueISO: string | null, hasTime: boolean, offset: number | null) {
  if (!dueISO || offset === null || offset === undefined) return null;
  const base = hasTime ? new Date(dueISO) : new Date(startOfDay(new Date(dueISO)).getTime() + 9 * 60 * MINUTE);
  return new Date(base.getTime() - offset * MINUTE).toISOString();
}

export const TIMED_REMINDERS: { value: number; label: string }[] = [
  { value: 0, label: "At time of task" },
  { value: 5, label: "5 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 120, label: "2 hours before" },
  { value: 1440, label: "1 day before" },
];

export const ALLDAY_REMINDERS: { value: number; label: string }[] = [
  { value: 0, label: "Morning of (9 AM)" },
  { value: 1440, label: "Day before (9 AM)" },
  { value: 2880, label: "2 days before (9 AM)" },
  { value: 10080, label: "1 week before (9 AM)" },
];

/** Value for <input type="date"> */
export const toDateInput = (d: Date | string) => dayKey(d);
/** Value for <input type="time"> */
export function toTimeInput(d: Date | string) {
  const x = new Date(d);
  return `${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`;
}

export function fromInputs(date: string, time: string | null) {
  const [y, m, d] = date.split("-").map(Number);
  if (time) {
    const [hh, mm] = time.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }
  return endOfDay(new Date(y, m - 1, d));
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
