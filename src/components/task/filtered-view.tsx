"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Plus } from "lucide-react";
import { sortTasks, type SortMode } from "@/hooks/use-task-views";
import { useTaskStore } from "@/store/tasks";
import { useUI, type QuickAddDefaults } from "@/store/ui";
import type { Task } from "@/lib/types";
import { TaskSection } from "./task-list";
import { TaskSkeleton } from "./task-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SORTS: Record<SortMode, string> = {
  smart: "Smart",
  priority: "Priority",
  due: "Due date",
  created: "Newest",
  alpha: "A → Z",
};

export function SortMenu({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Sort">
          <ArrowUpDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as SortMode)}>
          {(Object.keys(SORTS) as SortMode[]).map((k) => (
            <DropdownMenuRadioItem key={k} value={k}>
              {SORTS[k]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Generic list view for Inbox, projects, tags and filters. */
export function FilteredView({
  filter,
  header,
  empty,
  addDefaults,
  showProject = true,
}: {
  filter: (t: Task) => boolean;
  header: (sort: React.ReactNode, openCount: number) => React.ReactNode;
  empty: { icon: React.ReactNode; title: string; description?: string };
  addDefaults?: QuickAddDefaults;
  showProject?: boolean;
}) {
  const tasks = useTaskStore((s) => s.tasks);
  const loaded = useTaskStore((s) => s.loaded);
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const [sort, setSort] = useState<SortMode>("smart");

  const { open, done } = useMemo(() => {
    const matching = tasks.filter(filter);
    return {
      open: sortTasks(matching.filter((t) => !t.completed), sort),
      done: sortTasks(matching.filter((t) => t.completed), "created"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, sort, filter]);

  return (
    <>
      {header(<SortMenu value={sort} onChange={setSort} />, open.length)}
      {!loaded && tasks.length === 0 ? (
        <TaskSkeleton />
      ) : open.length === 0 ? (
        <EmptyState
          {...empty}
          action={
            <Button onClick={() => openQuickAdd(addDefaults)}>
              <Plus /> Add task
            </Button>
          }
        />
      ) : (
        <TaskSection title="Tasks" tasks={open} showProject={showProject} />
      )}
      <TaskSection title="Completed" tone="muted" tasks={done} collapsible defaultOpen={false} showProject={showProject} />
    </>
  );
}
