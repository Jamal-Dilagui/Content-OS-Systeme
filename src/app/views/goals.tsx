"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PageHeader,
  SectionHeader,
  StatusBadge,
  EmptyState,
  InfoLine,
} from "@/components/biz/layout";
import { StatCard, StatCardSkeleton } from "@/components/biz/stat-card";
import {
  formatNumber,
  formatPercent,
  formatDate,
} from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import {
  Target,
  Trophy,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Gauge,
  Flag,
  CheckCircle2,
  AlertTriangle,
  Circle,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarDays,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Types ----------
type Goal = {
  id: string;
  name: string;
  type: string; // MONTHLY | QUARTERLY | YEARLY | LONG_TERM
  category: string; // FINANCIAL | TRAFFIC | CONTENT | PINTEREST | PRODUCT | BUSINESS | PERSONAL
  metric: string;
  targetAmount: number;
  currentAmount: number;
  progressPct: number;
  remaining: number;
  startDate: string;
  deadline: string;
  daysRemaining: number;
  weeksRemaining: number;
  monthsRemaining: number;
  requiredMonthly: number;
  requiredWeekly: number;
  status: string;
  computedStatus: string;
  pace: number;
  paceLabel: "ahead" | "on-pace" | "behind" | "achieved" | "missed";
  createdAt: string;
  updatedAt: string;
};

type GoalsData = {
  goals: Goal[];
  summary: Record<string, number>;
  total: number;
};

const GOAL_TYPES = ["MONTHLY", "QUARTERLY", "YEARLY", "LONG_TERM"];
const GOAL_CATEGORIES = ["FINANCIAL", "TRAFFIC", "CONTENT", "PINTEREST", "PRODUCT", "BUSINESS", "PERSONAL"];
const GOAL_METRICS = ["REVENUE", "PROFIT", "TRAFFIC", "PINS", "ARTICLES", "PRODUCTS", "FOLLOWERS", "CONVERSIONS", "OTHER"];
const STATUS_LIST = ["NOT_STARTED", "ON_TRACK", "AT_RISK", "ACHIEVED", "MISSED"];

// Map category → tailwind color class for the badge
const CATEGORY_COLOR: Record<string, string> = {
  FINANCIAL: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  TRAFFIC: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30",
  CONTENT: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30",
  PINTEREST: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30",
  PRODUCT: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  BUSINESS: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-400 dark:border-teal-500/30",
  PERSONAL: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/30",
};

const TYPE_COLOR: Record<string, string> = {
  MONTHLY: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30",
  QUARTERLY: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  YEARLY: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30",
  LONG_TERM: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
};

const SUMMARY_CARDS: Array<{ key: string; label: string; icon: React.ReactNode; accent: "default" | "emerald" | "amber" | "rose" | "sky" | "violet" }> = [
  { key: "NOT_STARTED", label: "Not Started", icon: <Circle className="h-4 w-4" />, accent: "default" },
  { key: "ON_TRACK", label: "On Track", icon: <CheckCircle2 className="h-4 w-4" />, accent: "emerald" },
  { key: "AT_RISK", label: "At Risk", icon: <AlertTriangle className="h-4 w-4" />, accent: "amber" },
  { key: "ACHIEVED", label: "Achieved", icon: <Trophy className="h-4 w-4" />, accent: "violet" },
  { key: "MISSED", label: "Missed", icon: <TrendingDown className="h-4 w-4" />, accent: "rose" },
];

// ---------- Main view ----------
export function GoalsView() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");

  const { data, isLoading } = useQuery<GoalsData>({
    queryKey: ["goals"],
    queryFn: async () => {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Failed to load goals");
      return res.json();
    },
  });

  // Create goal mutation
  const createGoal = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create goal");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      toast({ title: "Goal created" });
    },
    onError: (e: Error) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  // Update goal mutation (full PATCH)
  const updateGoal = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const res = await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update goal");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      toast({ title: "Goal updated" });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  // Update progress mutation (sets currentAmount and recomputes status)
  const updateProgress = useMutation({
    mutationFn: async ({ id, currentAmount }: { id: string; currentAmount: number }) => {
      const res = await fetch(`/api/goals/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentAmount }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update progress");
      }
      return res.json();
    },
    onSuccess: (g: Goal) => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      toast({ title: "Progress updated", description: `Status: ${g.computedStatus.replace(/_/g, " ")}` });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  // Delete goal mutation
  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete goal");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      toast({ title: "Goal deleted" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  // Apply filter + group by type
  const goals = React.useMemo(() => {
    if (!data) return [];
    const filtered = categoryFilter === "ALL"
      ? data.goals
      : data.goals.filter((g) => g.category === categoryFilter);
    return filtered;
  }, [data, categoryFilter]);

  const grouped = React.useMemo(() => {
    const map: Record<string, Goal[]> = {};
    for (const g of goals) {
      if (!map[g.type]) map[g.type] = [];
      map[g.type].push(g);
    }
    return GOAL_TYPES.map((t) => ({ type: t, goals: map[t] ?? [] })).filter((g) => g.goals.length > 0);
  }, [goals]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Target className="h-5 w-5" />}
        title="Goals"
        description="Track every business goal — financial, traffic, content, Pinterest, products, and more."
        actions={<AddGoalDialog onCreate={(b) => createGoal.mutate(b)} loading={createGoal.isPending} />}
      />

      {/* SUMMARY CARDS */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {isLoading || !data
          ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          : SUMMARY_CARDS.map((s) => (
              <StatCard
                key={s.key}
                label={s.label}
                value={data.summary[s.key] ?? 0}
                hint={`of ${data.total} goals`}
                icon={s.icon}
                accent={s.accent}
              />
            ))}
      </section>

      {/* CATEGORY FILTER */}
      <section className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Flag className="h-3.5 w-3.5" /> Filter by category:
        </div>
        <Button
          size="sm"
          variant={categoryFilter === "ALL" ? "default" : "outline"}
          className="h-7"
          onClick={() => setCategoryFilter("ALL")}
        >
          All
        </Button>
        {GOAL_CATEGORIES.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={categoryFilter === c ? "default" : "outline"}
            className="h-7"
            onClick={() => setCategoryFilter(c)}
          >
            {c.replace(/_/g, " ")}
          </Button>
        ))}
      </section>

      {/* GOALS GROUPED BY TYPE */}
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-8 w-8" />}
          title={categoryFilter === "ALL" ? "No goals yet" : `No ${categoryFilter.toLowerCase()} goals`}
          description={categoryFilter === "ALL" ? "Create your first goal to start tracking progress." : "Try a different category filter or create a new goal."}
          action={<AddGoalDialog onCreate={(b) => createGoal.mutate(b)} loading={createGoal.isPending} />}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(({ type, goals: gs }) => (
            <section key={type} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("font-semibold", TYPE_COLOR[type])}>
                    {type.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{gs.length} goal{gs.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {gs.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onUpdate={(b) => updateGoal.mutate({ id: g.id, body: b })}
                    onProgress={(amt) => updateProgress.mutate({ id: g.id, currentAmount: amt })}
                    onDelete={() => deleteGoal.mutate(g.id)}
                    loading={updateGoal.isPending || updateProgress.isPending || deleteGoal.isPending}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Goal Card ----------
function GoalCard({
  goal,
  onUpdate,
  onProgress,
  onDelete,
  loading,
}: {
  goal: Goal;
  onUpdate: (body: Record<string, unknown>) => void;
  onProgress: (currentAmount: number) => void;
  onDelete: () => void;
  loading: boolean;
}) {
  const paceColor =
    goal.paceLabel === "ahead" || goal.paceLabel === "achieved"
      ? "text-emerald-600 dark:text-emerald-400"
      : goal.paceLabel === "on-pace"
      ? "text-sky-600 dark:text-sky-400"
      : goal.paceLabel === "missed"
      ? "text-rose-600 dark:text-rose-400"
      : "text-amber-600 dark:text-amber-400";

  const PaceIcon = goal.paceLabel === "ahead" || goal.paceLabel === "achieved"
    ? TrendingUp
    : goal.paceLabel === "on-pace"
    ? Minus
    : goal.paceLabel === "missed"
    ? AlertTriangle
    : TrendingDown;

  const paceText =
    goal.paceLabel === "achieved"
      ? "Goal achieved — well done!"
      : goal.paceLabel === "missed"
      ? "Deadline passed — goal missed"
      : goal.paceLabel === "ahead"
      ? "At current pace, you are ahead of your target"
      : goal.paceLabel === "on-pace"
      ? "At current pace, you are on track"
      : "At current pace, you are behind your target";

  return (
    <Card className="p-4 gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold truncate">{goal.name}</h3>
            <StatusBadge status={goal.computedStatus} />
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px] font-medium", CATEGORY_COLOR[goal.category] || CATEGORY_COLOR.PERSONAL)}>
              {goal.category.replace(/_/g, " ")}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
              {goal.metric}
            </Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" disabled={loading}>
            <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <UpdateProgressDialog onProgress={onProgress} loading={loading}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Gauge className="h-3.5 w-3.5 mr-2" /> Update Progress
              </DropdownMenuItem>
            </UpdateProgressDialog>
            <EditGoalDialog goal={goal} onSave={onUpdate} loading={loading}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
            </EditGoalDialog>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={onDelete} disabled={loading}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Amounts */}
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="text-2xl font-bold tracking-tight">
            {formatNumber(goal.currentAmount, { compact: true })}
          </span>
          <span className="text-sm text-muted-foreground ml-1">
            / {formatNumber(goal.targetAmount, { compact: true })}
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">{formatPercent(goal.progressPct)}</div>
          <div className="text-xs text-muted-foreground">{formatNumber(goal.remaining, { compact: true })} left</div>
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={Math.min(100, goal.progressPct)} className="h-2.5" />

      {/* Dates + days remaining */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3 w-3" /> {formatDate(goal.startDate)} → {formatDate(goal.deadline)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> {goal.daysRemaining > 0 ? `${goal.daysRemaining} days left` : "Past deadline"}
        </span>
      </div>

      {/* Required pace metrics */}
      <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3">
        <InfoLine label="Required / month" value={<span className="font-semibold">{formatNumber(goal.requiredMonthly, { compact: true })}</span>} />
        <InfoLine label="Required / week" value={<span className="font-semibold">{formatNumber(goal.requiredWeekly, { compact: true })}</span>} />
      </div>

      {/* Pace indicator */}
      <div className={cn("flex items-center gap-1.5 text-xs font-medium", paceColor)}>
        <PaceIcon className="h-3.5 w-3.5" />
        <span>{paceText}</span>
        <span className="ml-auto text-muted-foreground">Pace {goal.pace.toFixed(2)}×</span>
      </div>

      {/* Quick action */}
      <div className="flex items-center gap-2">
        <UpdateProgressDialog onProgress={onProgress} loading={loading}>
          <Button size="sm" variant="outline" className="h-7">
            <Gauge className="h-3.5 w-3.5" /> Update Progress
          </Button>
        </UpdateProgressDialog>
        <EditGoalDialog goal={goal} onSave={onUpdate} loading={loading}>
          <Button size="sm" variant="ghost" className="h-7">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </EditGoalDialog>
      </div>
    </Card>
  );
}

// ---------- Add Goal Dialog ----------
function AddGoalDialog({
  onCreate,
  loading,
  children,
}: {
  onCreate: (body: Record<string, unknown>) => void;
  loading: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("MONTHLY");
  const [category, setCategory] = React.useState("FINANCIAL");
  const [metric, setMetric] = React.useState("REVENUE");
  const [targetAmount, setTargetAmount] = React.useState("");
  const [currentAmount, setCurrentAmount] = React.useState("0");
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [startDate, setStartDate] = React.useState(todayStr);
  const [deadline, setDeadline] = React.useState(endOfMonth);

  function reset() {
    setName("");
    setType("MONTHLY");
    setCategory("FINANCIAL");
    setMetric("REVENUE");
    setTargetAmount("");
    setCurrentAmount("0");
    setStartDate(todayStr);
    setDeadline(endOfMonth);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = Number(targetAmount);
    const c = Number(currentAmount) || 0;
    if (!name.trim() || !t || t <= 0) return;
    onCreate({
      name: name.trim(),
      type,
      category,
      metric,
      targetAmount: t,
      currentAmount: c,
      startDate,
      deadline,
    });
    setOpen(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {children ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add Goal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Goal</DialogTitle>
          <DialogDescription>Define a new business goal with a measurable target and deadline.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="g-name">Goal Name</Label>
            <Input id="g-name" placeholder="e.g. Monthly Revenue Goal" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="g-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="g-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-metric">Metric</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger id="g-metric"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOAL_METRICS.map((m) => (
                    <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-target">Target Amount</Label>
              <Input id="g-target" type="number" step="0.01" min="0" placeholder="0" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="g-current">Current Amount (optional)</Label>
            <Input id="g-current" type="number" step="0.01" min="0" placeholder="0" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-start">Start Date</Label>
              <Input id="g-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-deadline">Deadline</Label>
              <Input id="g-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Create Goal"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Edit Goal Dialog ----------
function EditGoalDialog({
  goal,
  onSave,
  loading,
  children,
}: {
  goal: Goal;
  onSave: (body: Record<string, unknown>) => void;
  loading: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(goal.name);
  const [type, setType] = React.useState(goal.type);
  const [category, setCategory] = React.useState(goal.category);
  const [metric, setMetric] = React.useState(goal.metric);
  const [targetAmount, setTargetAmount] = React.useState(String(goal.targetAmount));
  const [currentAmount, setCurrentAmount] = React.useState(String(goal.currentAmount));
  const [startDate, setStartDate] = React.useState(goal.startDate.slice(0, 10));
  const [deadline, setDeadline] = React.useState(goal.deadline.slice(0, 10));
  const [status, setStatus] = React.useState(goal.status);

  // re-sync state when goal changes (e.g. after progress update)
  React.useEffect(() => {
    if (open) {
      setName(goal.name);
      setType(goal.type);
      setCategory(goal.category);
      setMetric(goal.metric);
      setTargetAmount(String(goal.targetAmount));
      setCurrentAmount(String(goal.currentAmount));
      setStartDate(goal.startDate.slice(0, 10));
      setDeadline(goal.deadline.slice(0, 10));
      setStatus(goal.status);
    }
  }, [goal, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = Number(targetAmount);
    const c = Number(currentAmount) || 0;
    if (!name.trim() || !t || t <= 0) return;
    onSave({
      name: name.trim(),
      type,
      category,
      metric,
      targetAmount: t,
      currentAmount: c,
      startDate,
      deadline,
      status,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
          <DialogDescription>Update the goal details, target, or status.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="e-name">Goal Name</Label>
            <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="e-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="e-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-metric">Metric</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger id="e-metric"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOAL_METRICS.map((m) => (
                    <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="e-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_LIST.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-target">Target Amount</Label>
              <Input id="e-target" type="number" step="0.01" min="0" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-current">Current Amount</Label>
              <Input id="e-current" type="number" step="0.01" min="0" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-start">Start Date</Label>
              <Input id="e-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-deadline">Deadline</Label>
              <Input id="e-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Update Progress Dialog ----------
function UpdateProgressDialog({
  onProgress,
  loading,
  children,
}: {
  onProgress: (currentAmount: number) => void;
  loading: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(amount);
    if (isNaN(v) || v < 0) return;
    onProgress(v);
    setOpen(false);
    setAmount("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Progress</DialogTitle>
          <DialogDescription>Set the current amount. Status will recompute automatically based on pace.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-amount">Current Amount</Label>
            <Input id="p-amount" type="number" step="0.01" min="0" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
