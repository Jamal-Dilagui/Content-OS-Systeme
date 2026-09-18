"use client";
import * as React from "react";
import { PageHeader } from "@/components/biz/layout";
import { Skeleton } from "@/components/ui/skeleton";

export function MonthlyView() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Monthly" description="This section is being built." />
      <Skeleton className="h-64" />
    </div>
  );
}
