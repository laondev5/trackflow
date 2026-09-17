"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { sortTasks } from "@/hooks/use-task-views";
import { useTaskStore } from "@/store/tasks";
import { PageHeader } from "@/components/layout/page-header";
import { TaskList } from "@/components/task/task-list";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function SearchPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useTaskStore((s) => s.projects);
  const [query, setQuery] = useState("");
  const [includeDone, setIncludeDone] = useState(false);
  const q = useDeferredValue(query.trim().toLowerCase());

  const results = useMemo(() => {
    if (!q) return [];
    const terms = q.split(/\s+/);
    const projectName = new Map(projects.map((p) => [p._id, p.name.toLowerCase()]));
    return sortTasks(
      tasks.filter((t) => {
        if (!includeDone && t.completed) return false;
        const haystack = [
          t.title,
          t.notes,
          ...t.tags.map((x) => `#${x}`),
          ...t.subtasks.map((s) => s.title),
          t.projectId ? projectName.get(t.projectId) ?? "" : "inbox",
        ]
          .join(" ")
          .toLowerCase();
        return terms.every((term) => haystack.includes(term));
      })
    );
  }, [q, tasks, projects, includeDone]);

  return (
    <>
      <PageHeader title="Search" />
      <div className="sticky top-16 z-20 -mx-4 mb-4 bg-background/85 px-4 pb-3 backdrop-blur-xl md:static md:mx-0 md:px-0">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, notes, #tags, projects…"
            className="h-11 pl-9"
          />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Switch id="include-done" checked={includeDone} onCheckedChange={setIncludeDone} />
          <Label htmlFor="include-done" className="text-sm text-muted-foreground">Include completed</Label>
          {q && <span className="ml-auto text-xs text-muted-foreground">{results.length} result{results.length === 1 ? "" : "s"}</span>}
        </div>
      </div>

      {!q ? (
        <EmptyState icon={<Search />} title="Find anything" description="Search across titles, notes, subtasks, tags and projects." />
      ) : results.length === 0 ? (
        <EmptyState icon={<SearchX />} title="No matches" description={`Nothing found for “${query}”.`} />
      ) : (
        <TaskList tasks={results} />
      )}
    </>
  );
}
