"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Coffee, Pause, Play, RotateCcw, SkipForward, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayKey } from "@/lib/dates";
import { sortTasks } from "@/hooks/use-task-views";
import { showLocalNotification } from "@/hooks/use-pwa";
import { useTaskStore } from "@/store/tasks";
import { useSession } from "@/store/session";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Mode = "focus" | "break";
interface TimerState {
  mode: Mode;
  endsAt: number | null; // running
  remaining: number; // ms, when paused
  taskId: string | null;
}

const KEY = "tf-focus";
const SESSIONS_KEY = () => `tf-focus-sessions-${dayKey(new Date())}`;

function load(): TimerState | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

function chime() {
  try {
    const ctx = new AudioContext();
    [0, 0.18, 0.36].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = [660, 880, 1320][i];
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.4);
    });
  } catch {}
}

export default function FocusPage() {
  const prefs = useSession((s) => s.user?.prefs);
  const tasks = useTaskStore((s) => s.tasks);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const focusMs = (prefs?.focusMinutes ?? 25) * 60_000;
  const breakMs = (prefs?.breakMinutes ?? 5) * 60_000;

  const [state, setState] = useState<TimerState>({ mode: "focus", endsAt: null, remaining: focusMs, taskId: null });
  const [now, setNow] = useState(() => Date.now());
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    const saved = load();
    if (saved) setState(saved);
    try {
      setSessions(Number(localStorage.getItem(SESSIONS_KEY()) || 0));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const total = state.mode === "focus" ? focusMs : breakMs;
  const remaining = state.endsAt ? Math.max(0, state.endsAt - now) : state.remaining;
  const running = !!state.endsAt;

  const finish = useCallback(() => {
    chime();
    navigator.vibrate?.([200, 100, 200]);
    if (state.mode === "focus") {
      const n = sessions + 1;
      setSessions(n);
      try {
        localStorage.setItem(SESSIONS_KEY(), String(n));
      } catch {}
      const task = tasks.find((t) => t._id === state.taskId);
      toast.success("Focus session complete! Time for a break ☕", {
        duration: 15_000,
        action: task && !task.completed ? { label: "Mark task done", onClick: () => toggleComplete(task._id) } : undefined,
      });
      showLocalNotification("🎯 Focus session complete", "Take a short break.", "/focus", "focus");
      setState((s) => ({ ...s, mode: "break", endsAt: null, remaining: breakMs }));
    } else {
      toast("Break's over — ready for another round?");
      showLocalNotification("☕ Break over", "Ready to focus again?", "/focus", "focus");
      setState((s) => ({ ...s, mode: "focus", endsAt: null, remaining: focusMs }));
    }
  }, [state.mode, state.taskId, sessions, tasks, toggleComplete, breakMs, focusMs]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && remaining <= 0) finish();
  }, [running, remaining, finish]);

  const start = () => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    setNow(Date.now());
    setState((s) => ({ ...s, endsAt: Date.now() + (s.remaining > 0 ? s.remaining : total) }));
  };
  const pause = () => setState((s) => ({ ...s, endsAt: null, remaining: Math.max(0, (s.endsAt ?? 0) - Date.now()) }));
  const reset = () => setState((s) => ({ ...s, endsAt: null, remaining: s.mode === "focus" ? focusMs : breakMs }));
  const switchMode = (mode: Mode) => setState((s) => ({ ...s, mode, endsAt: null, remaining: mode === "focus" ? focusMs : breakMs }));

  const openTasks = useMemo(() => sortTasks(tasks.filter((t) => !t.completed)).slice(0, 50), [tasks]);
  const mm = String(Math.floor(remaining / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60_000) / 1000)).padStart(2, "0");
  const pct = 1 - remaining / total;

  useEffect(() => {
    document.title = running ? `${mm}:${ss} · ${state.mode === "focus" ? "Focus" : "Break"}` : "Focus · TaskFlow";
    return () => {
      document.title = "TaskFlow";
    };
  }, [mm, ss, running, state.mode]);

  const R = 130;
  const C = 2 * Math.PI * R;

  return (
    <>
      <PageHeader title="Focus" subtitle={`${sessions} session${sessions === 1 ? "" : "s"} today`} />

      <div className="mx-auto flex max-w-sm flex-col items-center">
        <div className="mb-8 inline-flex rounded-full bg-muted p-1">
          {(["focus", "break"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition",
                state.mode === m ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              {m === "focus" ? <Target className="size-4" /> : <Coffee className="size-4" />}
              {m === "focus" ? `Focus ${prefs?.focusMinutes ?? 25}m` : `Break ${prefs?.breakMinutes ?? 5}m`}
            </button>
          ))}
        </div>

        <div className="relative mb-8 aspect-square w-full max-w-72">
          <svg viewBox="0 0 300 300" className="size-full -rotate-90">
            <circle cx="150" cy="150" r={R} fill="none" strokeWidth="10" className="stroke-muted" />
            <circle
              cx="150"
              cy="150"
              r={R}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              className={cn("transition-[stroke-dashoffset] duration-300", state.mode === "focus" ? "stroke-primary" : "stroke-emerald-500")}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-bold tabular-nums tracking-tight">{mm}:{ss}</span>
            <span className="mt-1 text-sm text-muted-foreground">{state.mode === "focus" ? "Stay on task" : "Relax & recharge"}</span>
          </div>
        </div>

        <div className="mb-8 flex items-center gap-4">
          <Button variant="outline" size="icon" className="size-12 rounded-full" onClick={reset} aria-label="Reset">
            <RotateCcw />
          </Button>
          <Button size="icon" className="size-20 rounded-full shadow-lg shadow-primary/30 [&_svg]:size-8" onClick={running ? pause : start} aria-label={running ? "Pause" : "Start"}>
            {running ? <Pause /> : <Play className="ml-1" />}
          </Button>
          <Button variant="outline" size="icon" className="size-12 rounded-full" onClick={finish} aria-label="Skip">
            <SkipForward />
          </Button>
        </div>

        <div className="w-full space-y-2">
          <p className="text-sm font-medium">Working on</p>
          <Select value={state.taskId ?? "none"} onValueChange={(v) => setState((s) => ({ ...s, taskId: v === "none" ? null : v }))}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Pick a task (optional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific task</SelectItem>
              {openTasks.map((t) => (
                <SelectItem key={t._id} value={t._id}>
                  <span className="truncate">{t.title}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}
