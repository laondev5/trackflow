"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-muted">
          <WifiOff className="size-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">You&apos;re offline</h1>
        <p className="mt-1 text-sm text-muted-foreground">This page hasn&apos;t been saved for offline use yet.</p>
        <Button className="mt-6" onClick={() => location.reload()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
