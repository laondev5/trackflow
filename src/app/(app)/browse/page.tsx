"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, Hash, LogOut, Plus } from "lucide-react";
import { FILTERS } from "@/lib/filters";
import { useTaskStore } from "@/store/tasks";
import { useSession } from "@/store/session";
import { PageHeader } from "@/components/layout/page-header";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/components/layout/nav-items";
import { NewProjectDialog } from "@/components/project/new-project-dialog";
import { Button } from "@/components/ui/button";

function Row({ href, icon, label, count }: { href: string; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 active:bg-muted">
      <span className="grid size-5 place-items-center [&_svg]:size-5">{icon}</span>
      <span className="flex-1 text-[15px]">{label}</span>
      {!!count && <span className="text-sm text-muted-foreground">{count}</span>}
      <ChevronRight className="size-4 text-muted-foreground/60" />
    </Link>
  );
}

function Group({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
        {action}
      </div>
      <div className="divide-y overflow-hidden rounded-2xl border bg-card">{children}</div>
    </section>
  );
}

export default function BrowsePage() {
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useTaskStore((s) => s.projects);
  const logout = useSession((s) => s.logout);

  const { tags, projectCounts, filterCounts } = useMemo(() => {
    const open = tasks.filter((t) => !t.completed);
    const tagCounts = new Map<string, number>();
    const projectCounts = new Map<string, number>();
    for (const t of open) {
      t.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1));
      if (t.projectId) projectCounts.set(t.projectId, (projectCounts.get(t.projectId) ?? 0) + 1);
    }
    return {
      tags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]),
      projectCounts,
      filterCounts: Object.fromEntries(FILTERS.map((f) => [f.slug, open.filter(f.match).length])) as Record<string, number>,
    };
  }, [tasks]);

  const views = [...PRIMARY_NAV.filter((n) => !["/today", "/upcoming", "/calendar"].includes(n.href)), ...SECONDARY_NAV];

  return (
    <>
      <PageHeader title="Browse" />

      <Group
        title="Projects"
        action={
          <NewProjectDialog trigger={<Button variant="ghost" size="sm" className="h-7 text-primary"><Plus /> New</Button>} />
        }
      >
        {projects.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">Create projects to group tasks — like Work, Home or Groceries.</p>
        ) : (
          projects.map((p) => (
            <Row
              key={p._id}
              href={`/projects/${p._id}`}
              icon={<span className="text-lg leading-none">{p.icon}</span>}
              label={p.name}
              count={projectCounts.get(p._id)}
            />
          ))
        )}
      </Group>

      <Group title="Views">
        {views.map((v) => (
          <Row key={v.href} href={v.href} icon={<v.icon className="text-primary" />} label={v.label} />
        ))}
      </Group>

      <Group title="Filters">
        {FILTERS.map((f) => (
          <Row key={f.slug} href={`/filters/${f.slug}`} icon={<f.icon className={f.color} />} label={f.label} count={filterCounts[f.slug]} />
        ))}
      </Group>

      {tags.length > 0 && (
        <Group title="Tags">
          {tags.map(([tag, count]) => (
            <Row key={tag} href={`/tags/${encodeURIComponent(tag)}`} icon={<Hash className="text-primary" />} label={tag} count={count} />
          ))}
        </Group>
      )}

      <Button variant="outline" className="w-full text-destructive md:hidden" onClick={logout}>
        <LogOut /> Log out
      </Button>
    </>
  );
}
