"use client";

import { create } from "zustand";
import type { Task } from "@/lib/types";

export type QuickAddDefaults = Partial<Pick<Task, "dueDate" | "hasTime" | "projectId" | "status" | "priority" | "tags">>;

interface UIState {
  editingTaskId: string | null;
  quickAddOpen: boolean;
  quickAddDefaults: QuickAddDefaults;
  openEditor: (id: string) => void;
  closeEditor: () => void;
  openQuickAdd: (defaults?: QuickAddDefaults) => void;
  closeQuickAdd: () => void;
  aiOpen: boolean;
  aiInitialText: string;
  openAi: (text?: string) => void;
  closeAi: () => void;
}

export const useUI = create<UIState>()((set) => ({
  editingTaskId: null,
  quickAddOpen: false,
  quickAddDefaults: {},
  aiOpen: false,
  aiInitialText: "",
  openAi: (text = "") => set({ aiOpen: true, aiInitialText: text, quickAddOpen: false }),
  closeAi: () => set({ aiOpen: false }),
  openEditor: (id) => set({ editingTaskId: id }),
  closeEditor: () => set({ editingTaskId: null }),
  openQuickAdd: (defaults = {}) => set({ quickAddOpen: true, quickAddDefaults: defaults }),
  closeQuickAdd: () => set({ quickAddOpen: false }),
}));
