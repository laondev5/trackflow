"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUI } from "@/store/ui";
import { MOBILE_NAV } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const items = [...MOBILE_NAV.slice(0, 2), null, ...MOBILE_NAV.slice(2)];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 pb-safe backdrop-blur-xl md:hidden">
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
        {items.map((item) =>
          item === null ? (
            <li key="fab" className="flex justify-center">
              <button
                type="button"
                aria-label="Add task"
                onClick={() => openQuickAdd(pathname === "/today" ? { dueDate: todayEnd() } : {})}
                className="-mt-6 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-95"
              >
                <Plus className="size-7" />
              </button>
            </li>
          ) : (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-1 text-[11px] font-medium text-muted-foreground transition-colors",
                  (pathname === item.href || (item.href === "/browse" && isBrowseChild(pathname))) && "text-primary"
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            </li>
          )
        )}
      </ul>
    </nav>
  );
}

const todayEnd = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

const isBrowseChild = (p: string) =>
  ["/browse", "/inbox", "/board", "/projects", "/tags", "/filters", "/search", "/completed", "/focus", "/stats", "/settings", "/notifications"].some(
    (x) => p.startsWith(x)
  );
