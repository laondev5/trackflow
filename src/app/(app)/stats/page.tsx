"use client";

import { CheckCircle2, Clock, Flame, ListTodo, TriangleAlert, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStats } from "@/hooks/use-task-views";
import { PRIORITY_META } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressRing } from "@/components/progress-ring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: string }) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="px-4">
        <div className={cn("mb-2 grid size-9 place-items-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5", tone)}>{icon}</div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function StatsPage() {
  const s = useStats();
  const max = Math.max(1, ...s.last7.map((d) => d.count));
  const openTotal = Math.max(1, s.open);

  return (
    <>
      <PageHeader title="Insights" subtitle="Your productivity at a glance" />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat icon={<Flame />} label="Day streak" value={s.streak} tone="bg-orange-500/10 text-orange-500" />
        <Stat icon={<CheckCircle2 />} label="Done today" value={s.completedToday} tone="bg-emerald-500/10 text-emerald-500" />
        <Stat icon={<Trophy />} label="Done this week" value={s.completedWeek} />
        <Stat icon={<ListTodo />} label="Open tasks" value={s.open} tone="bg-blue-500/10 text-blue-500" />
        <Stat icon={<TriangleAlert />} label="Overdue" value={s.overdue} tone="bg-destructive/10 text-destructive" />
        <Stat icon={<Clock />} label="Completed (90 days)" value={s.totalCompleted} tone="bg-violet-500/10 text-violet-500" />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Last 7 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-end gap-2" role="img" aria-label="Tasks completed per day over the last 7 days">
            {s.last7.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-xs font-medium tabular-nums text-muted-foreground">{d.count || ""}</span>
                <div
                  className={cn("w-full rounded-t-md bg-primary/80 transition-all", i === 6 && "bg-primary")}
                  style={{ height: `${Math.max(4, (d.count / max) * 100)}%`, opacity: d.count ? 1 : 0.25 }}
                />
                <span className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d.date)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">On-time rate</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <ProgressRing value={s.onTimeRate} size={88} stroke={9} />
            <p className="text-sm text-muted-foreground">
              Share of tasks with a past due date that were completed before their deadline.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open by priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.byPriority.map(({ priority, count }) => (
              <div key={priority} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0">{PRIORITY_META[priority].label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", PRIORITY_META[priority].color)} style={{ width: `${(count / openTotal) * 100}%` }} />
                </div>
                <span className="w-6 text-right tabular-nums text-muted-foreground">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
