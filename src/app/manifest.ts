import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TaskFlow — Tasks & Reminders",
    short_name: "TaskFlow",
    description: "Plan your day, never miss a deadline. Tasks, reminders, and focus in one app.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "portrait",
    background_color: "#09090b",
    theme_color: "#4f46e5",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add task", url: "/today?add=1", icons: [{ src: "/icons/96", sizes: "96x96" }] },
      { name: "Upcoming", url: "/upcoming", icons: [{ src: "/icons/96", sizes: "96x96" }] },
      { name: "Focus timer", url: "/focus", icons: [{ src: "/icons/96", sizes: "96x96" }] },
    ],
  };
}
