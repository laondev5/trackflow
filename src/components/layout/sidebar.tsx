"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { CheckSquare, LogOut, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDueToday, isOverdue } from "@/lib/dates";
import { useTaskStore } from "@/store/tasks";
import { useSession } from "@/store/session";
import { useUI } from "@/store/ui";
import { Button } from "@/components/ui/button";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "./nav-items";
import { NewProjectDialog } from "@/components/project/new-project-dialog";

export function Sidebar() {
  const pathname = usePathname();
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useTaskStore((s) => s.projects);
  const user = useSession((s) => s.user);
  const unread = useSession((s) => s.unread);
  const logout = useSession((s) => s.logout);
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const openAi = useUI((s) => s.openAi);

  const counts = useMemo(() => {
    const open = tasks.filter((t) => !t.completed);
    const byProject = new Map<string, number>();
    open.forEach((t) => t.projectId && byProject.set(t.projectId, (byProject.get(t.projectId) ?? 0) + 1));
    const nav: Record<string, number> = {
      "/today": open.filter((t) => isDueToday(t) || isOverdue(t)).length,
      "/inbox": open.filter((t) => !t.projectId).length,
      "/notifications": unread,
    };
    return { nav, byProject };
  }, [tasks, unread]);

  const link = (item: NavItem) => {
    const active = pathname === item.href;
    const count = counts.nav[item.href];
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          active && "bg-sidebar-accent text-sidebar-accent-foreground"
        )}
      >
        <item.icon className="size-4" />
        {item.label}
        {!!count && <span className="ml-auto text-xs text-muted-foreground">{count}</span>}
      </Link>
    );
  };

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <CheckSquare className="size-5" />
        </div>
        <span className="text-lg font-bold tracking-tight">TaskFlow</span>
      </div>

      <div className="space-y-2 px-3">
        <Button className="w-full justify-start" onClick={() => openQuickAdd()}>
          <Plus /> Add task
          <kbd className="ml-auto rounded bg-primary-foreground/20 px-1.5 text-[10px]">Q</kbd>
        </Button>
        <Button variant="outline" className="w-full justify-start border-primary/30 text-primary hover:text-primary" onClick={() => openAi()}>
          <Sparkles /> Plan with AI
          <kbd className="ml-auto rounded bg-primary/10 px-1.5 text-[10px]">A</kbd>
        </Button>
      </div>

      <nav className="mt-4 flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        <div className="space-y-0.5">{PRIMARY_NAV.map(link)}</div>

        <div>
          <div className="mb-1 flex items-center justify-between px-3">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Projects</span>
            <NewProjectDialog
              trigger={
                <button type="button" aria-label="New project" className="rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent">
                  <Plus className="size-4" />
                </button>
              }
            />
          </div>
          <div className="space-y-0.5">
            {projects.filter((p) => !p.archived).map((p) => (
              <Link
                key={p._id}
                href={`/projects/${p._id}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent",
                  pathname === `/projects/${p._id}` && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                <span className="text-base leading-none">{p.icon}</span>
                <span className="truncate">{p.name}</span>
                <span className="ml-auto flex items-center gap-2">
                  {!!counts.byProject.get(p._id) && <span className="text-xs text-muted-foreground">{counts.byProject.get(p._id)}</span>}
                  <span className="size-2 rounded-full" style={{ background: p.color }} />
                </span>
              </Link>
            ))}
            {projects.length === 0 && <p className="px-3 py-1 text-xs text-muted-foreground">No projects yet</p>}
          </div>
        </div>

        <div className="space-y-0.5">{SECONDARY_NAV.map(link)}</div>
      </nav>

      {user && (
        <div className="flex items-center gap-3 border-t px-4 py-3">
          <div className="grid size-9 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
            <LogOut />
          </Button>
        </div>
      )}
    </aside>
  );
}
