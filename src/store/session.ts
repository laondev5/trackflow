"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "@/lib/api-client";
import type { AppNotification, PublicUser, UserPrefs } from "@/lib/types";
import { useTaskStore } from "./tasks";

interface SessionState {
  user: PublicUser | null;
  features: { email: boolean; push: boolean };
  notifications: AppNotification[];
  unread: number;

  fetchMe: () => Promise<void>;
  setUser: (user: PublicUser) => void;
  updatePrefs: (patch: Partial<UserPrefs> & { name?: string }) => Promise<void>;
  fetchNotifications: () => Promise<AppNotification[]>;
  markRead: (ids?: string[]) => Promise<void>;
  clearNotifications: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      user: null,
      features: { email: false, push: false },
      notifications: [],
      unread: 0,

      fetchMe: async () => {
        const data = await api<{ user: PublicUser; features: SessionState["features"] }>("/api/auth/me");
        set({ user: data.user, features: data.features });
      },

      setUser: (user) => set({ user }),

      updatePrefs: async (patch) => {
        const prev = get().user;
        if (prev) {
          const { name, ...prefs } = patch;
          set({ user: { ...prev, name: name ?? prev.name, prefs: { ...prev.prefs, ...prefs } } });
        }
        try {
          const { user } = await api<{ user: PublicUser }>("/api/settings", { method: "PATCH", body: patch });
          set({ user });
        } catch (e) {
          set({ user: prev });
          throw e;
        }
      },

      fetchNotifications: async () => {
        const data = await api<{ notifications: AppNotification[]; unread: number }>("/api/notifications");
        set({ notifications: data.notifications, unread: data.unread });
        return data.notifications;
      },

      markRead: async (ids) => {
        set((s) => ({
          notifications: s.notifications.map((n) => (!ids || ids.includes(n._id) ? { ...n, read: true } : n)),
          unread: ids ? Math.max(0, s.unread - s.notifications.filter((n) => ids.includes(n._id) && !n.read).length) : 0,
        }));
        await api("/api/notifications", { method: "PATCH", body: ids ? { ids } : { all: true } });
      },

      clearNotifications: async () => {
        set({ notifications: [], unread: 0 });
        await api("/api/notifications", { method: "DELETE" });
      },

      logout: async () => {
        await api("/api/auth/logout", { method: "POST" }).catch(() => {});
        set({ user: null, notifications: [], unread: 0 });
        useTaskStore.getState().reset();
        try {
          localStorage.removeItem("taskflow-data");
        } catch {}
        window.location.href = "/login";
      },
    }),
    {
      name: "taskflow-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user, features: s.features }),
    }
  )
);
