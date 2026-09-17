"use client";

import { useCallback } from "react";
import { Inbox } from "lucide-react";
import type { Task } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { FilteredView } from "@/components/task/filtered-view";

export default function InboxPage() {
  const filter = useCallback((t: Task) => !t.projectId, []);
  return (
    <FilteredView
      filter={filter}
      showProject={false}
      header={(sort, n) => <PageHeader title="Inbox" subtitle={`${n} open task${n === 1 ? "" : "s"} not in a project`} actions={sort} />}
      empty={{ icon: <Inbox />, title: "Inbox zero 🎉", description: "Capture anything on your mind — sort it into projects later." }}
    />
  );
}
