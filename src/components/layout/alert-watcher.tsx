"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { dayKey, formatDue, isOverdue } from "@/lib/dates";
import { useTaskStore } from "@/store/tasks";
import { useSession } from "@/store/session";
import { showLocalNotification } from "@/hooks/use-pwa";

const WINDOW_MS = 15 * 60_000; // only alert for things that happened in the last 15 minutes
const SEEN_KEY = "tf-alerted";

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

/**
 * Real-time, in-app alerts while the app is open:
 *  - reminder time reached → toast (+ system notification if the tab is hidden)
 *  - a timed task just became overdue → toast
 *  - once per day: summary of overdue tasks
 * Server-side cron handles email + push when the app is closed.
 */
export function AlertWatcher() {
  const router = useRouter();
  const loaded = useTaskStore((s) => s.loaded);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    seen.current = loadSeen();
  }, []);

  useEffect(() => {
    if (!loaded) return;

    const mark = (key: string) => {
      seen.current.add(key);
      try {
        sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen.current].slice(-300)));
      } catch {}
    };

    const check = () => {
      const { tasks, updateTask, toggleComplete } = useTaskStore.getState();
      const now = Date.now();

      for (const t of tasks) {
        if (t.completed) continue;

        if (t.remindAt) {
          const at = new Date(t.remindAt).getTime();
          const key = `r:${t._id}:${t.remindAt}`;
          if (at <= now && now - at < WINDOW_MS && !seen.current.has(key)) {
            mark(key);
            toast.warning(`⏰ ${t.title}`, {
              description: t.dueDate ? `Due ${formatDue(t)}` : "Reminder",
              duration: 15_000,
              action: { label: "Done", onClick: () => toggleComplete(t._id).catch(() => {}) },
              cancel: {
                label: "Snooze 10m",
                onClick: () => updateTask(t._id, { remindAt: new Date(Date.now() + 10 * 60_000).toISOString() }).catch(() => {}),
              },
            });
            if (document.hidden) showLocalNotification(`⏰ ${t.title}`, t.dueDate ? `Due ${formatDue(t)}` : "Reminder", "/today", t._id);
          }
        }

        if (t.dueDate && t.hasTime) {
          const due = new Date(t.dueDate).getTime();
          const key = `o:${t._id}:${t.dueDate}`;
          if (due <= now && now - due < WINDOW_MS && !seen.current.has(key)) {
            mark(key);
            toast.error(`“${t.title}” is now overdue`, {
              duration: 12_000,
              action: { label: "Complete", onClick: () => toggleComplete(t._id).catch(() => {}) },
            });
            if (document.hidden) showLocalNotification("⚠️ Task overdue", t.title, "/today", `overdue-${t._id}`);
          }
        }
      }

      // Daily overdue summary
      const prefs = useSession.getState().user?.prefs;
      if (prefs?.overdueAlerts !== false) {
        const overdue = tasks.filter((t) => isOverdue(t));
        const summaryKey = `tf-overdue-summary-${dayKey(new Date())}`;
        let shown = false;
        try {
          shown = localStorage.getItem(summaryKey) === "1";
        } catch {}
        if (overdue.length > 0 && !shown) {
          try {
            localStorage.setItem(summaryKey, "1");
          } catch {}
          toast.error(`You have ${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}`, {
            description: overdue.slice(0, 3).map((t) => t.title).join(" · "),
            duration: 10_000,
            action: { label: "Review", onClick: () => router.push("/today") },
          });
        }
      }
    };

    const initial = setTimeout(check, 1500);
    const interval = setInterval(check, 20_000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [loaded, router]);

  return null;
}
