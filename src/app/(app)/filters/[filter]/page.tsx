"use client";

import { useParams } from "next/navigation";
import { Filter } from "lucide-react";
import { FILTERS } from "@/lib/filters";
import { PageHeader } from "@/components/layout/page-header";
import { FilteredView } from "@/components/task/filtered-view";
import { EmptyState } from "@/components/empty-state";

export default function FilterPage() {
  const { filter: slug } = useParams<{ filter: string }>();
  const f = FILTERS.find((x) => x.slug === slug);
  if (!f) return <EmptyState icon={<Filter />} title="Unknown filter" />;

  return (
    <FilteredView
      filter={f.match}
      addDefaults={slug === "urgent" ? { priority: 1 } : undefined}
      header={(sort) => <PageHeader back title={f.label} subtitle={f.description} actions={sort} />}
      empty={{ icon: <f.icon />, title: "Nothing here", description: "No open tasks match this filter." }}
    />
  );
}
