import * as chrono from "chrono-node";
import type { Priority, Project, Recurrence } from "./types";
import { endOfDay } from "./dates";

export interface ParsedTask {
  title: string;
  dueDate: Date | null;
  hasTime: boolean;
  priority: Priority | null;
  tags: string[];
  projectId: string | null;
  projectName: string | null;
  recurrence: Recurrence;
}

const RECURRENCE_PATTERNS: [RegExp, Recurrence][] = [
  [/\bevery\s+weekdays?\b|\bweekdays\b/i, "weekdays"],
  [/\bevery\s*day\b|\bdaily\b/i, "daily"],
  [/\bevery\s*week\b|\bweekly\b/i, "weekly"],
  [/\bevery\s*month\b|\bmonthly\b/i, "monthly"],
  [/\bevery\s*year\b|\byearly\b|\bannually\b/i, "yearly"],
];

/**
 * Natural-language quick add, e.g.
 *   "Pay rent every month on the 1st #bills p1"
 *   "Call mom tomorrow at 6pm @family"
 */
export function parseQuickAdd(input: string, projects: Project[] = [], now = new Date()): ParsedTask {
  let text = ` ${input} `;
  let priority: Priority | null = null;
  let recurrence: Recurrence = "none";
  let projectId: string | null = null;
  let projectName: string | null = null;
  const tags: string[] = [];

  // Priority: p1..p4 or !1..!4 or !!! / !!
  text = text.replace(/(?:^|\s)(?:p|!)([1-4])(?=\s)/i, (_m, n) => {
    priority = Number(n) as Priority;
    return " ";
  });
  if (!priority) {
    text = text.replace(/(?:^|\s)(!{2,3})(?=\s)/, (_m, bangs: string) => {
      priority = bangs.length === 3 ? 1 : 2;
      return " ";
    });
  }

  // Tags: #tag
  text = text.replace(/(?:^|\s)#([\p{L}\p{N}_-]{1,40})/gu, (_m, tag: string) => {
    if (!tags.includes(tag.toLowerCase())) tags.push(tag.toLowerCase());
    return " ";
  });

  // Project: @name (matches existing project, spaces as - or _)
  text = text.replace(/(?:^|\s)@([\p{L}\p{N}_-]{1,80})/u, (m, name: string) => {
    const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");
    const match = projects.find((p) => norm(p.name) === norm(name)) ?? projects.find((p) => norm(p.name).startsWith(norm(name)));
    if (!match) return m;
    projectId = match._id;
    projectName = match.name;
    return " ";
  });

  // Recurrence
  for (const [re, rule] of RECURRENCE_PATTERNS) {
    if (re.test(text)) {
      recurrence = rule;
      text = text.replace(re, " ");
      break;
    }
  }

  // Date/time
  let dueDate: Date | null = null;
  let hasTime = false;
  const results = chrono.parse(text, now, { forwardDate: true });
  const r = results[0];
  if (r) {
    hasTime = r.start.isCertain("hour");
    const d = r.start.date();
    dueDate = hasTime ? d : endOfDay(d);
    text = text.slice(0, r.index) + " " + text.slice(r.index + r.text.length);
  } else if (recurrence !== "none") {
    dueDate = endOfDay(now); // "water plants every day" starts today
  }

  const title = text.replace(/\s+/g, " ").replace(/\s+(at|on|by)$/i, "").trim();

  return { title, dueDate, hasTime, priority, tags, projectId, projectName, recurrence };
}
