"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { Hash } from "lucide-react";
import type { Task } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { FilteredView } from "@/components/task/filtered-view";

export default function TagPage() {
  const params = useParams<{ tag: string }>();
  const tag = decodeURIComponent(params.tag);
  const filter = useCallback((t: Task) => t.tags.includes(tag), [tag]);

  return (
    <FilteredView
      filter={filter}
      addDefaults={{ tags: [tag] }}
      header={(sort, n) => <PageHeader back title={`#${tag}`} subtitle={`${n} open task${n === 1 ? "" : "s"}`} actions={sort} />}
      empty={{ icon: <Hash />, title: `Nothing tagged #${tag}`, description: "Add #tags when typing a task to organize across projects." }}
    />
  );
}
