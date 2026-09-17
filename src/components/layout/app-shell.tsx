"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { WifiOff } from "lucide-react";
import { useTaskStore } from "@/store/tasks";
import { useSession } from "@/store/session";
import { useUI } from "@/store/ui";
import { useOnline } from "@/hooks/use-pwa";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { AlertWatcher } from "./alert-watcher";
import { QuickAdd } from "@/components/task/quick-add";
import { TaskEditor } from "@/components/task/task-editor";
import { AiPlanner } from "@/components/ai/ai-planner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const online = useOnline();
  const { setTheme } = useTheme();
  const themePref = useSession((s) => s.user?.prefs.theme);

  // Initial load + refresh when the app comes back to the foreground / online.
  useEffect(() => {
    const refresh = () => {
      useTaskStore.getState().fetchAll();
      useSession.getState().fetchNotifications().catch(() => {});
    };
    useSession.getState().fetchMe().catch(() => {});
    refresh();

    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") useSession.getState().fetchNotifications().catch(() => {});
    }, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      clearInterval(poll);
    };
  }, []);

  // Sync the saved theme preference.
  useEffect(() => {
    if (themePref) setTheme(themePref);
  }, [themePref, setTheme]);

  // Keyboard shortcuts (desktop): Q = quick add, / = search, G+T/U/I style shortcuts kept simple.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable=true], [role=dialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "q" || e.key === "n") {
        e.preventDefault();
        useUI.getState().openQuickAdd();
      } else if (e.key === "a") {
        e.preventDefault();
        useUI.getState().openAi();
      } else if (e.key === "/") {
        e.preventDefault();
        router.push("/search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {!online && (
          <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-medium text-amber-950 pt-safe">
            <WifiOff className="size-3.5" /> You're offline — showing your last synced tasks
          </div>
        )}
        <main key={pathname} className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 animate-in fade-in-0 duration-200 md:px-8 md:pt-6 md:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
      <QuickAdd />
      <TaskEditor />
      <AiPlanner />
      <AlertWatcher />
      <Suspense>
        <AddFromQuery />
      </Suspense>
    </div>
  );
}

/** Supports the PWA shortcut /today?add=1 */
function AddFromQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (params.get("add") === "1") {
      useUI.getState().openQuickAdd();
      router.replace(pathname);
    }
  }, [params, router, pathname]);
  return null;
}
