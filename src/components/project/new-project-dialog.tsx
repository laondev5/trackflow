"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PROJECT_COLORS, type Project } from "@/lib/types";
import { useTaskStore } from "@/store/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ICONS = ["📁", "💼", "🏠", "🛒", "💪", "📚", "💡", "🎯", "✈️", "💰", "❤️", "🎨", "🧑‍💻", "🎵", "🌱", "🐾"];

export function NewProjectDialog({
  trigger,
  project,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  project?: Project;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const router = useRouter();
  const createProject = useTaskStore((s) => s.createProject);
  const updateProject = useTaskStore((s) => s.updateProject);
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;

  const [name, setName] = useState(project?.name ?? "");
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[6]);
  const [icon, setIcon] = useState(project?.icon ?? "📁");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (project) {
        await updateProject(project._id, { name: name.trim(), color, icon });
        toast.success("Project updated");
      } else {
        const p = await createProject({ name: name.trim(), color, icon });
        toast.success(`Created ${p.name}`);
        router.push(`/projects/${p._id}`);
        setName("");
      }
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
            <DialogDescription>Group related tasks together.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Work, Groceries, Side project" autoFocus maxLength={80} />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={cn("grid aspect-square place-items-center rounded-lg text-lg hover:bg-muted", icon === i && "bg-primary/15 ring-2 ring-primary")}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  className={cn("size-8 rounded-full transition", color === c && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || saving} className="w-full sm:w-auto">
              {project ? "Save" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
