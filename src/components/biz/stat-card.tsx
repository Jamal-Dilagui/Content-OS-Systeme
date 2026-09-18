"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  trend?: number; // percentage
  trendLabel?: string;
  icon?: React.ReactNode;
  accent?: "default" | "emerald" | "amber" | "rose" | "sky" | "violet";
  className?: string;
  footer?: React.ReactNode;
}

const accentMap: Record<string, string> = {
  default: "text-foreground",
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
  sky: "text-sky-600 dark:text-sky-400",
  violet: "text-violet-600 dark:text-violet-400",
};

export function StatCard({
  label,
  value,
  hint,
  trend,
  trendLabel,
  icon,
  accent = "default",
  className,
  footer,
}: StatCardProps) {
  return (
    <Card className={cn("p-4 gap-2 py-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        {icon && <div className={cn("shrink-0", accentMap[accent])}>{icon}</div>}
      </div>
      <div className={cn("text-2xl font-bold tracking-tight", accentMap[accent])}>
        {value}
      </div>
      <div className="flex items-center gap-2 text-xs">
        {typeof trend === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-semibold",
              trend > 0 ? "text-emerald-600 dark:text-emerald-400" : trend < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
            )}
          >
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
        {hint && typeof trend !== "number" && <span className="text-muted-foreground">{hint}</span>}
      </div>
      {footer && <div className="text-xs text-muted-foreground pt-1 border-t">{footer}</div>}
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="p-4 gap-2 py-4">
      <div className="h-3 w-20 bg-muted rounded animate-pulse" />
      <div className="h-7 w-28 bg-muted rounded animate-pulse" />
      <div className="h-3 w-16 bg-muted rounded animate-pulse" />
    </Card>
  );
}
