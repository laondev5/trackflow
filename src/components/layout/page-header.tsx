"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/store/session";
import { useTaskStore } from "@/store/tasks";
import { useUI } from "@/store/ui";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  subtitle,
  actions,
  back = false,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  back?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const unread = useSession((s) => s.unread);
  const syncing = useTaskStore((s) => s.syncing);
  const openAi = useUI((s) => s.openAi);

  return (
    <header className={cn("sticky top-0 z-30 -mx-4 mb-4 bg-background/85 px-4 pt-safe backdrop-blur-xl md:static md:mx-0 md:bg-transparent md:px-0 md:backdrop-blur-none", className)}>
      <div className="flex min-h-14 items-center gap-2 py-2">
        {back && (
          <Button variant="ghost" size="icon" className="-ml-2" onClick={() => router.back()} aria-label="Back">
            <ArrowLeft />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {syncing && <RefreshCw className="size-4 animate-spin text-muted-foreground" aria-label="Syncing" />}
        {actions}
        <Button variant="ghost" size="icon" className="text-primary md:hidden" aria-label="Plan with AI" onClick={() => openAi()}>
          <Sparkles />
        </Button>
        <Button asChild variant="ghost" size="icon" className="relative md:hidden" aria-label="Notifications">
          <Link href="/notifications">
            <Bell />
            {unread > 0 && (
              <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        </Button>
      </div>
    </header>
  );
}
