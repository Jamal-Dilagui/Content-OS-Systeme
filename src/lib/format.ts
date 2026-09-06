// Shared formatting + helper utilities for the Business Operating System

export function formatCurrency(n: number, opts: { compact?: boolean } = {}): string {
  if (n == null || isNaN(n)) return "$0";
  if (opts.compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(n: number, opts: { compact?: boolean } = {}): string {
  if (n == null || isNaN(n)) return "0";
  if (opts.compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatPercent(n: number, digits = 1): string {
  if (n == null || isNaN(n)) return "0%";
  return `${n.toFixed(digits)}%`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatShortDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatRelative(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = date.getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}

export function pct(current: number, target: number): number {
  if (!target) return 0;
  return (current / target) * 100;
}

export function growth(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// Status color helpers
export const STATUS_COLORS: Record<string, string> = {
  // generic
  ACTIVE: "emerald",
  PAUSED: "amber",
  SKIPPED: "zinc",
  IDEA: "zinc",
  BRIEF: "zinc",
  // production
  DESIGN: "violet",
  READY: "sky",
  SCHEDULED: "cyan",
  PUBLISHED: "emerald",
  PROMOTED: "emerald",
  LIVE: "emerald",
  FAILED: "rose",
  REVISE: "amber",
  // tasks
  TODO: "zinc",
  IN_PROGRESS: "sky",
  DONE: "emerald",
  BLOCKED: "rose",
  // goals
  NOT_STARTED: "zinc",
  ON_TRACK: "emerald",
  AT_RISK: "amber",
  ACHIEVED: "emerald",
  MISSED: "rose",
  // experiments
  RUNNING: "sky",
  COMPLETED: "zinc",
};

export function statusBadgeClass(status: string): string {
  const c = STATUS_COLORS[status] || "zinc";
  const map: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200 dark:border-rose-500/30",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400 border-sky-200 dark:border-sky-500/30",
    cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400 border-violet-200 dark:border-violet-500/30",
    zinc: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400 border-zinc-200 dark:border-zinc-500/30",
  };
  return map[c] || map.zinc;
}

export function priorityClass(priority: string): string {
  switch (priority) {
    case "P0": return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200 dark:border-rose-500/30";
    case "P1": return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-500/30";
    case "P2": return "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400 border-sky-200 dark:border-sky-500/30";
    case "P3": return "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400 border-zinc-200 dark:border-zinc-500/30";
    default: return "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400 border-zinc-200 dark:border-zinc-500/30";
  }
}

export function healthClass(score: number): string {
  if (score >= 75) return "emerald";
  if (score >= 50) return "amber";
  return "rose";
}

export function healthDot(score: number): string {
  const c = healthClass(score);
  const map: Record<string, string> = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };
  return map[c];
}

// Month helper
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// Recharts tooltip formatter
export const chartTooltipStyle = {
  contentStyle: {
    borderRadius: "0.5rem",
    border: "1px solid hsl(var(--border))",
    background: "hsl(var(--popover))",
    color: "hsl(var(--popover-foreground))",
    fontSize: "0.75rem",
  },
  labelStyle: { color: "hsl(var(--muted-foreground))", fontWeight: 600 },
};
