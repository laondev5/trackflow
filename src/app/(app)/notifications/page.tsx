"use client";

import { useEffect } from "react";
import { AlarmClock, Bell, BellOff, CheckCheck, Sun, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/dates";
import type { AppNotification } from "@/lib/types";
import { useSession } from "@/store/session";
import { useTaskStore } from "@/store/tasks";
import { useUI } from "@/store/ui";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

const ICONS: Record<AppNotification["type"], { icon: React.ReactNode; tone: string }> = {
  reminder: { icon: <AlarmClock />, tone: "bg-amber-500/10 text-amber-500" },
  overdue: { icon: <TriangleAlert />, tone: "bg-destructive/10 text-destructive" },
  digest: { icon: <Sun />, tone: "bg-primary/10 text-primary" },
  system: { icon: <Bell />, tone: "bg-muted text-muted-foreground" },
};

export default function NotificationsPage() {
  const notifications = useSession((s) => s.notifications);
  const unread = useSession((s) => s.unread);
  const fetchNotifications = useSession((s) => s.fetchNotifications);
  const markRead = useSession((s) => s.markRead);
  const clear = useSession((s) => s.clearNotifications);
  const tasks = useTaskStore((s) => s.tasks);
  const openEditor = useUI((s) => s.openEditor);

  useEffect(() => {
    fetchNotifications().catch(() => {});
  }, [fetchNotifications]);

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread` : "You're all caught up"}
        actions={
          notifications.length > 0 && (
            <>
              <Button variant="ghost" size="icon" onClick={() => markRead()} aria-label="Mark all as read" disabled={!unread}>
                <CheckCheck />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => clear()} aria-label="Clear all">
                <Trash2 />
              </Button>
            </>
          )
        }
      />

      {notifications.length === 0 ? (
        <EmptyState icon={<BellOff />} title="No notifications" description="Reminders, overdue alerts and daily plans will appear here." />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {notifications.map((n) => {
            const meta = ICONS[n.type];
            const task = n.taskId ? tasks.find((t) => t._id === n.taskId) : undefined;
            return (
              <li key={n._id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!n.read) markRead([n._id]).catch(() => {});
                    if (task) openEditor(task._id);
                  }}
                  className={cn("flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50", !n.read && "bg-primary/5")}
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-full [&_svg]:size-4", meta.tone)}>{meta.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", !n.read && "font-semibold")}>{n.title}</span>
                    {n.body && <span className="block text-sm text-muted-foreground">{n.body}</span>}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {timeAgo(n.createdAt)}
                      {task?.completed && " · ✓ completed"}
                    </span>
                  </span>
                  {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
