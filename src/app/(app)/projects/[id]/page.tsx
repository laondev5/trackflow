"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderOpen, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { useTaskStore } from "@/store/tasks";
import { PageHeader } from "@/components/layout/page-header";
import { FilteredView } from "@/components/task/filtered-view";
import { NewProjectDialog } from "@/components/project/new-project-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const project = useTaskStore((s) => s.projects.find((p) => p._id === id));
  const loaded = useTaskStore((s) => s.loaded);
  const tasks = useTaskStore((s) => s.tasks);
  const deleteProject = useTaskStore((s) => s.deleteProject);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filter = useCallback((t: Task) => t.projectId === id, [id]);
  const progress = useMemo(() => {
    const mine = tasks.filter(filter);
    return { done: mine.filter((t) => t.completed).length, total: mine.length };
  }, [tasks, filter]);

  if (!project) {
    return loaded ? (
      <EmptyState icon={<FolderOpen />} title="Project not found" description="It may have been deleted." action={<Button onClick={() => router.push("/browse")}>Back to projects</Button>} />
    ) : null;
  }

  const remove = async (deleteTasks: boolean) => {
    try {
      await deleteProject(project._id, deleteTasks);
      toast.success(`Deleted ${project.name}`);
      router.push("/today");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <FilteredView
        filter={filter}
        showProject={false}
        addDefaults={{ projectId: project._id }}
        header={(sort, n) => (
          <>
            <PageHeader
              back
              title={
                <span className="flex items-center gap-2">
                  <span>{project.icon}</span>
                  {project.name}
                </span>
              }
              subtitle={`${n} open task${n === 1 ? "" : "s"}`}
              actions={
                <>
                  {sort}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Project options"><MoreHorizontal /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditOpen(true)}><Pencil /> Edit project</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}><Trash2 /> Delete project</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              }
            />
            {progress.total > 0 && (
              <div className="mb-6 flex items-center gap-3">
                <Progress value={(progress.done / progress.total) * 100} className="h-2" style={{ ["--primary" as string]: project.color }} />
                <span className="shrink-0 text-xs text-muted-foreground">{progress.done}/{progress.total} done</span>
              </div>
            )}
          </>
        )}
        empty={{ icon: <FolderOpen />, title: "No open tasks", description: `Add tasks to ${project.name} to get started.` }}
      />

      <NewProjectDialog key={project._id + String(editOpen)} project={project} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{project.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              You can keep its {progress.total} task{progress.total === 1 ? "" : "s"} (they&apos;ll move to the Inbox) or delete them too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => remove(false)}>
              Keep tasks
            </AlertDialogAction>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => remove(true)}>
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
