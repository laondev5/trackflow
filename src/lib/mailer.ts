import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

const PLACEHOLDERS = new Set(["you@example.com", "your-app-password"]);

export function isMailConfigured() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && !PLACEHOLDERS.has(SMTP_USER) && !PLACEHOLDERS.has(SMTP_PASS));
}

function getTransporter() {
  if (transporter) return transporter;
  if (!isMailConfigured()) throw new Error("SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)");
  const port = Number(process.env.SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    pool: true,
    maxConnections: 3,
  });
  return transporter;
}

export async function sendMail(opts: { to: string; subject: string; html: string; text: string }) {
  if (!isMailConfigured()) {
    console.warn(`[mail] SMTP not configured — skipped "${opts.subject}" to ${opts.to}`);
    return false;
  }
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    ...opts,
  });
  return true;
}

// ---------- Templates ----------

export const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden">
      <tr><td style="background:#4f46e5;padding:20px 24px;color:#fff;font-size:18px;font-weight:700">✓ TaskFlow</td></tr>
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 12px;font-size:20px">${esc(title)}</h1>
        ${inner}
      </td></tr>
      <tr><td style="padding:16px 24px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a">
        You're getting this because notifications are on. <a href="${appUrl()}/settings" style="color:#4f46e5">Manage email settings</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;margin-top:16px;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${esc(label)}</a>`;

export interface MailTask {
  title: string;
  dueDate: Date | null;
  hasTime: boolean;
  priority: number;
}

function fmtDue(t: MailTask, tz: string) {
  if (!t.dueDate) return "No due date";
  const opts: Intl.DateTimeFormatOptions = t.hasTime
    ? { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz }
    : { weekday: "short", month: "short", day: "numeric", timeZone: tz };
  try {
    return new Intl.DateTimeFormat("en-US", opts).format(t.dueDate);
  } catch {
    return t.dueDate.toUTCString();
  }
}

const PRIORITY_COLORS: Record<number, string> = { 1: "#ef4444", 2: "#f97316", 3: "#3b82f6", 4: "#a1a1aa" };

function taskRows(tasks: MailTask[], tz: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${tasks
    .map(
      (t) => `<tr><td style="padding:10px 0;border-bottom:1px solid #f4f4f5">
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${PRIORITY_COLORS[t.priority] ?? "#a1a1aa"};margin-right:8px"></span>
      <strong>${esc(t.title)}</strong><br/>
      <span style="font-size:13px;color:#71717a;margin-left:18px">${esc(fmtDue(t, tz))}</span>
    </td></tr>`
    )
    .join("")}</table>`;
}

export function reminderEmail(name: string, task: MailTask, tz: string) {
  const title = `Reminder: ${task.title}`;
  return {
    subject: `⏰ ${task.title}`,
    html: layout(
      title,
      `<p style="margin:0 0 8px">Hi ${esc(name)}, this task is coming up:</p>${taskRows([task], tz)}${button(`${appUrl()}/today`, "Open TaskFlow")}`
    ),
    text: `Hi ${name}, reminder: "${task.title}" — due ${fmtDue(task, tz)}.\n${appUrl()}/today`,
  };
}

export function overdueEmail(name: string, tasks: MailTask[], tz: string) {
  const n = tasks.length;
  return {
    subject: `⚠️ ${n} task${n > 1 ? "s are" : " is"} overdue`,
    html: layout(
      `You have ${n} overdue task${n > 1 ? "s" : ""}`,
      `<p style="margin:0 0 8px">Hi ${esc(name)}, these haven't been completed yet:</p>${taskRows(tasks, tz)}${button(`${appUrl()}/today`, "Review overdue tasks")}`
    ),
    text: `Hi ${name}, these tasks are overdue:\n${tasks.map((t) => `- ${t.title} (${fmtDue(t, tz)})`).join("\n")}\n${appUrl()}/today`,
  };
}

export function digestEmail(name: string, today: MailTask[], overdue: MailTask[], tz: string) {
  const sections = [
    overdue.length ? `<h3 style="margin:16px 0 4px;color:#ef4444;font-size:15px">Overdue (${overdue.length})</h3>${taskRows(overdue, tz)}` : "",
    today.length ? `<h3 style="margin:16px 0 4px;font-size:15px">Due today (${today.length})</h3>${taskRows(today, tz)}` : "",
  ].join("");
  return {
    subject: `☀️ Your day: ${today.length} due today${overdue.length ? `, ${overdue.length} overdue` : ""}`,
    html: layout(`Good morning, ${name}`, `<p style="margin:0">Here's your plan for today.</p>${sections}${button(`${appUrl()}/today`, "Start your day")}`),
    text: `Good morning ${name}!\nOverdue:\n${overdue.map((t) => `- ${t.title}`).join("\n") || "none"}\nToday:\n${today.map((t) => `- ${t.title}`).join("\n") || "none"}\n${appUrl()}/today`,
  };
}

export function resetPasswordEmail(name: string, link: string) {
  return {
    subject: "Reset your TaskFlow password",
    html: layout(
      "Reset your password",
      `<p>Hi ${esc(name)}, we received a request to reset your password. This link expires in 1 hour.</p>${button(link, "Reset password")}<p style="font-size:13px;color:#71717a;margin-top:16px">If you didn't request this, you can ignore this email.</p>`
    ),
    text: `Hi ${name}, reset your password (valid 1 hour): ${link}`,
  };
}

export function welcomeEmail(name: string) {
  return {
    subject: "Welcome to TaskFlow 🎉",
    html: layout(
      `Welcome, ${name}!`,
      `<p>Your account is ready. A few tips to get started:</p>
       <ul style="padding-left:18px;line-height:1.7">
         <li>Type naturally: <em>"Call mom tomorrow 6pm #family p1"</em></li>
         <li>Install TaskFlow on your phone's home screen for a native feel</li>
         <li>Turn on push notifications in Settings so you never miss a deadline</li>
       </ul>${button(`${appUrl()}/today`, "Open TaskFlow")}`
    ),
    text: `Welcome to TaskFlow, ${name}! ${appUrl()}/today`,
  };
}
