"use client";
import * as React from "react";
import { PageHeader } from "@/components/biz/layout";
import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsView() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Analytics" description="This section is being built." />
      <Skeleton className="h-64" />
    </div>
  );
}
