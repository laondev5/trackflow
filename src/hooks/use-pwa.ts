"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api-client";

// ---------- Online status ----------
const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

// ---------- Install prompt ----------
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    setEvent(null);
    return outcome === "accepted";
  }, [event]);

  return { canInstall: !!event, installed, isIOS, install };
}

// ---------- Web push ----------
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePush() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager?.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  /** Asks for permission; subscribes to server push if VAPID is configured. */
  const enable = useCallback(async () => {
    if (!("Notification" in window)) throw new Error("Notifications aren't supported on this browser");
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== "granted") throw new Error("Notification permission was denied");

    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) return "local" as const; // in-app/browser notifications only
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) return "local" as const; // e.g. iOS Safari outside an installed PWA
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
    await api("/api/push/subscribe", { method: "POST", body: sub.toJSON() });
    setSubscribed(true);
    return "push" as const;
  }, []);

  const disable = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager?.getSubscription();
    await api("/api/push/subscribe", { method: "DELETE", body: { endpoint: sub?.endpoint } });
    await sub?.unsubscribe();
    setSubscribed(false);
  }, []);

  return { permission, subscribed, enable, disable };
}

/** Shows a system notification through the service worker (works on Android where `new Notification` doesn't). */
export async function showLocalNotification(title: string, body: string, url = "/today", tag?: string) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, { body, icon: "/icons/192", badge: "/icons/96", tag, data: { url } });
  } catch {
    new Notification(title, { body, icon: "/icons/192", tag });
  }
}
