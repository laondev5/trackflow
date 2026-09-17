"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "@/lib/api-client";
import type { Project, Task } from "@/lib/types";

export type NewTask = Partial<Omit<Task, "_id" | "createdAt" | "updatedAt">> & { title: string };

interface TaskState {
  tasks: Task[];
  projects: Project[];
  loaded: boolean;
  syncing: boolean;
  error: string | null;

  fetchAll: () => Promise<void>;
  createTask: (input: NewTask) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  toggleComplete: (id: string) => Promise<boolean>;
  deleteTask: (id: string) => Promise<Task | undefined>;
  restoreTask: (task: Task) => Promise<void>;
  rescheduleMany: (ids: string[], dueDate: Date, hasTime?: boolean) => Promise<void>;
  reorder: (ids: string[]) => Promise<void>;
  clearCompleted: () => Promise<void>;

  createProject: (input: Pick<Project, "name" | "color" | "icon">) => Promise<Project>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  deleteProject: (id: string, deleteTasks?: boolean) => Promise<void>;

  reset: () => void;
}

// Temp ids let the UI respond instantly; edits made before the server answers wait for the real id.
const pendingCreates = new Map<string, Promise<string>>();
const resolveId = async (id: string) => (pendingCreates.has(id) ? pendingCreates.get(id)! : id);

const tempId = () => `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const blankTask = (input: NewTask): Task => {
  const now = new Date().toISOString();
  return {
    _id: tempId(),
    notes: "",
    priority: 4,
    status: "todo",
    completed: false,
    completedAt: null,
    dueDate: null,
    hasTime: false,
    remindAt: null,
    reminderOffset: null,
    recurrence: "none",
    projectId: null,
    tags: [],
    subtasks: [],
    order: Date.now(),
    createdAt: now,
    updatedAt: now,
    ...input,
  };
};

function toPayload(t: Partial<Task>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, createdAt, updatedAt, completedAt, ...rest } = t;
  return rest;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      projects: [],
      loaded: false,
      syncing: false,
      error: null,

      fetchAll: async () => {
        set({ syncing: true });
        try {
          const [{ tasks }, { projects }] = await Promise.all([
            api<{ tasks: Task[] }>("/api/tasks"),
            api<{ projects: Project[] }>("/api/projects"),
          ]);
          // Keep optimistic tasks that haven't reached the server yet.
          const pending = get().tasks.filter((t) => t._id.startsWith("tmp-"));
          set({ tasks: [...tasks, ...pending], projects, loaded: true, error: null });
        } catch (e) {
          set({ error: (e as Error).message, loaded: true });
        } finally {
          set({ syncing: false });
        }
      },

      createTask: async (input) => {
        const optimistic = blankTask(input);
        set((s) => ({ tasks: [...s.tasks, optimistic] }));
        const promise = api<{ task: Task }>("/api/tasks", { method: "POST", body: toPayload(optimistic) }).then(
          ({ task }) => {
            set((s) => ({ tasks: s.tasks.map((t) => (t._id === optimistic._id ? { ...task, ...pickLocalEdits(t, optimistic) } : t)) }));
            return task;
          }
        );
        pendingCreates.set(optimistic._id, promise.then((t) => t._id));
        try {
          const saved = await promise;
          return get().tasks.find((t) => t._id === saved._id) ?? saved;
        } catch (e) {
          set((s) => ({ tasks: s.tasks.filter((t) => t._id !== optimistic._id) }));
          throw e;
        } finally {
          setTimeout(() => pendingCreates.delete(optimistic._id), 30_000);
        }
      },

      updateTask: async (id, patch) => {
        const prev = get().tasks.find((t) => t._id === id);
        if (!prev) return;
        const optimistic: Task = { ...prev, ...patch, updatedAt: new Date().toISOString() };
        if (patch.completed !== undefined) {
          optimistic.completedAt = patch.completed ? new Date().toISOString() : null;
          if (patch.status === undefined) optimistic.status = patch.completed ? "done" : prev.status === "done" ? "todo" : prev.status;
        }
        if (patch.status !== undefined && patch.completed === undefined) {
          optimistic.completed = patch.status === "done";
          optimistic.completedAt = optimistic.completed ? prev.completedAt ?? new Date().toISOString() : null;
        }
        set((s) => ({ tasks: s.tasks.map((t) => (t._id === id ? optimistic : t)) }));

        try {
          const realId = await resolveId(id);
          const { task, spawned } = await api<{ task: Task; spawned: Task | null }>(`/api/tasks/${realId}`, {
            method: "PATCH",
            body: toPayload(patch),
          });
          set((s) => ({
            tasks: [...s.tasks.map((t) => (t._id === id || t._id === realId ? task : t)), ...(spawned ? [spawned] : [])],
          }));
        } catch (e) {
          set((s) => ({ tasks: s.tasks.map((t) => (t._id === id ? prev : t)) }));
          throw e;
        }
      },

      toggleComplete: async (id) => {
        const t = get().tasks.find((x) => x._id === id);
        if (!t) return false;
        await get().updateTask(id, { completed: !t.completed });
        return !t.completed;
      },

      deleteTask: async (id) => {
        const prev = get().tasks.find((t) => t._id === id);
        if (!prev) return;
        set((s) => ({ tasks: s.tasks.filter((t) => t._id !== id) }));
        try {
          const realId = await resolveId(id);
          await api(`/api/tasks/${realId}`, { method: "DELETE" });
        } catch (e) {
          set((s) => ({ tasks: [...s.tasks, prev] }));
          throw e;
        }
        return prev;
      },

      restoreTask: async (task) => {
        await get().createTask({ ...toPayload(task), title: task.title });
      },

      rescheduleMany: async (ids, dueDate, hasTime = false) => {
        const prev = get().tasks;
        const iso = dueDate.toISOString();
        set((s) => ({
          tasks: s.tasks.map((t) => (ids.includes(t._id) ? { ...t, dueDate: iso, hasTime, remindAt: null, reminderOffset: null } : t)),
        }));
        try {
          const realIds = await Promise.all(ids.map(resolveId));
          await api("/api/tasks/bulk", { method: "POST", body: { action: "reschedule", ids: realIds, dueDate: iso, hasTime } });
        } catch (e) {
          set({ tasks: prev });
          throw e;
        }
      },

      reorder: async (ids) => {
        const order = new Map(ids.map((id, i) => [id, i]));
        set((s) => ({ tasks: s.tasks.map((t) => (order.has(t._id) ? { ...t, order: order.get(t._id)! } : t)) }));
        const realIds = (await Promise.all(ids.map(resolveId))).filter((id) => !id.startsWith("tmp-"));
        if (realIds.length) await api("/api/tasks/bulk", { method: "POST", body: { action: "reorder", ids: realIds } });
      },

      clearCompleted: async () => {
        const prev = get().tasks;
        set((s) => ({ tasks: s.tasks.filter((t) => !t.completed) }));
        try {
          await api("/api/tasks/bulk", { method: "POST", body: { action: "clearCompleted" } });
        } catch (e) {
          set({ tasks: prev });
          throw e;
        }
      },

      createProject: async (input) => {
        const { project } = await api<{ project: Project }>("/api/projects", { method: "POST", body: input });
        set((s) => ({ projects: [...s.projects, project] }));
        return project;
      },

      updateProject: async (id, patch) => {
        const prev = get().projects;
        set((s) => ({ projects: s.projects.map((p) => (p._id === id ? { ...p, ...patch } : p)) }));
        try {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _id, ...body } = patch;
          const { project } = await api<{ project: Project }>(`/api/projects/${id}`, { method: "PATCH", body });
          set((s) => ({ projects: s.projects.map((p) => (p._id === id ? project : p)) }));
        } catch (e) {
          set({ projects: prev });
          throw e;
        }
      },

      deleteProject: async (id, deleteTasks = false) => {
        await api(`/api/projects/${id}?deleteTasks=${deleteTasks}`, { method: "DELETE" });
        set((s) => ({
          projects: s.projects.filter((p) => p._id !== id),
          tasks: deleteTasks
            ? s.tasks.filter((t) => t.projectId !== id)
            : s.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
        }));
      },

      reset: () => set({ tasks: [], projects: [], loaded: false, error: null }),
    }),
    {
      name: "taskflow-data",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ tasks: s.tasks, projects: s.projects }),
    }
  )
);

/** If the user edited a temp task while it was saving, keep those local fields. */
function pickLocalEdits(current: Task, original: Task): Partial<Task> {
  const edits: Partial<Task> = {};
  for (const key of Object.keys(current) as (keyof Task)[]) {
    if (key === "_id" || key === "createdAt" || key === "updatedAt") continue;
    if (JSON.stringify(current[key]) !== JSON.stringify(original[key])) {
      (edits as Record<string, unknown>)[key] = current[key];
    }
  }
  return edits;
}
