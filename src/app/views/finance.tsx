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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  PageHeader,
  SectionHeader,
  StatusBadge,
  EmptyState,
} from "@/components/biz/layout";
import { StatCard, StatCardSkeleton } from "@/components/biz/stat-card";
import {
  formatCurrency,
  formatPercent,
  formatDate,
  formatShortDate,
} from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  BarChart3,
  Receipt,
  CircleDollarSign,
  Trophy,
  AlertCircle,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Types ----------
type FinanceData = {
  now: string;
  isDemo: boolean;
  currentMonth: {
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
    revGrowth: number;
    expGrowth: number;
    profitGrowth: number;
  };
  prevMonth: {
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
  };
  months: Array<{
    key: string;
    label: string;
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
  }>;
  revenueBySource: Array<{ source: string; amount: number }>;
  expensesByCategory: Array<{ category: string; amount: number }>;
  revenueByChannel: Array<{ channel: string; amount: number }>;
  avgMonthlyRevenue: number;
  avgMonthlyProfit: number;
  bestMonth: { key: string; label: string; revenue: number; expenses: number; profit: number; margin: number } | null;
  worstMonth: { key: string; label: string; revenue: number; expenses: number; profit: number; margin: number } | null;
  goal: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    achievedPct: number;
    remaining: number;
    deadline: string;
    status: string;
  } | null;
  transactions: Array<{
    id: string;
    kind: "revenue" | "expense";
    date: string;
    amount: number;
    category: string;
    channel: string | null;
    description: string | null;
  }>;
  counts: { revenue: number; expenses: number };
};

const REV_SOURCES = ["AFFILIATE", "DIGITAL_PRODUCT", "ETSY", "PAYHIP", "OTHER"];
const EXP_CATEGORIES = ["AI_TOOLS", "HOSTING", "DOMAINS", "SAAS", "AUTOMATION", "ADS", "DESIGN", "OTHER"];
const CHANNELS = ["PINTEREST", "BLOG", "FACEBOOK"];

const PIE_COLORS = ["#10b981", "#f59e0b", "#f43f5e", "#0ea5e9", "#8b5cf6", "#71717a", "#14b8a6", "#ec4899"];

const tooltipStyle = {
  contentStyle: {
    borderRadius: "0.5rem",
    border: "1px solid hsl(var(--border))",
    background: "hsl(var(--popover))",
    color: "hsl(var(--popover-foreground))",
    fontSize: "0.75rem",
  },
  labelStyle: { color: "hsl(var(--muted-foreground))", fontWeight: 600 },
};

// ---------- Main view ----------
export function FinanceView() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<FinanceData>({
    queryKey: ["finance"],
    queryFn: async () => {
      const res = await fetch("/api/finance");
      if (!res.ok) throw new Error("Failed to load finance data");
      return res.json();
    },
  });

  // Delete transaction mutation
  const deleteTx = useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: "revenue" | "expense" }) => {
      const res = await fetch(`/api/finance/${id}?type=${kind}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast({ title: "Transaction deleted" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  // Add transaction mutation
  const addTx = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add entry");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast({ title: "Transaction added" });
    },
    onError: (e: Error) => toast({ title: "Add failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<DollarSign className="h-5 w-5" />}
        title="Finance Dashboard"
        description={
          data?.isDemo
            ? "Track revenue, expenses and profit. Currently showing demo data — add real transactions to replace it."
            : "Track revenue, expenses and profit across all sources and channels."
        }
        actions={<AddTransactionDialog onAdd={(b) => addTx.mutate(b)} loading={addTx.isPending} />}
      />

      {/* TOP STAT CARDS */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Month Revenue"
              value={formatCurrency(data.currentMonth.revenue)}
              trend={data.currentMonth.revGrowth}
              trendLabel="vs last month"
              icon={<TrendingUp className="h-4 w-4" />}
              accent="emerald"
            />
            <StatCard
              label="Month Expenses"
              value={formatCurrency(data.currentMonth.expenses)}
              trend={data.currentMonth.expGrowth}
              trendLabel="vs last month"
              icon={<TrendingDown className="h-4 w-4" />}
              accent="rose"
            />
            <StatCard
              label="Net Profit"
              value={formatCurrency(data.currentMonth.profit)}
              trend={data.currentMonth.profitGrowth}
              trendLabel="vs last month"
              icon={<Wallet className="h-4 w-4" />}
              accent={data.currentMonth.profit >= 0 ? "emerald" : "rose"}
            />
            <StatCard
              label="Profit Margin"
              value={formatPercent(data.currentMonth.margin)}
              trend={Number(((data.currentMonth.margin - data.prevMonth.margin)).toFixed(1))}
              trendLabel="pts vs last month"
              icon={<Activity className="h-4 w-4" />}
              accent="violet"
            />
          </>
        )}
      </section>

      {/* REVENUE GOAL PROGRESS CARD */}
      {!isLoading && data && data.goal && (
        <Card className="p-4 sm:p-6 gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">{data.goal.name}</h2>
                <p className="text-xs text-muted-foreground">
                  Deadline {formatDate(data.goal.deadline)} ·{" "}
                  <StatusBadge status={data.goal.status} />
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tracking-tight">
                {formatCurrency(data.goal.currentAmount)}{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  / {formatCurrency(data.goal.targetAmount)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatPercent(data.goal.achievedPct)} achieved · {formatCurrency(data.goal.remaining)} remaining
              </div>
            </div>
          </div>
          <Progress value={Math.min(100, data.goal.achievedPct)} className="h-3" />
        </Card>
      )}

      {/* MAIN CHARTS — Row 1: Monthly Revenue with goal line + Monthly Profit line */}
      <section className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4 gap-3">
          <SectionHeader
            title="Monthly Revenue"
            description={data?.isDemo ? "Last 6 months (demo data)" : "Last 6 months"}
            icon={<BarChart3 className="h-4 w-4" />}
          />
          {isLoading || !data ? (
            <Skeleton className="h-64" />
          ) : data.months.every((m) => m.revenue === 0) ? (
            <EmptyState icon={<BarChart3 className="h-8 w-8" />} title="No revenue yet" description="Add revenue entries to see your trend." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.months}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                  {data.goal && (
                    <ReferenceLine
                      y={data.goal.targetAmount}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{ value: "Goal", fontSize: 10, fill: "#f59e0b", position: "right" }}
                    />
                  )}
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-4 gap-3">
          <SectionHeader
            title="Monthly Profit"
            description={data?.isDemo ? "Last 6 months (demo data)" : "Last 6 months"}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          {isLoading || !data ? (
            <Skeleton className="h-64" />
          ) : data.months.every((m) => m.profit === 0 && m.revenue === 0) ? (
            <EmptyState icon={<TrendingUp className="h-8 w-8" />} title="No profit data" description="Add revenue and expenses to compute profit." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.months}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="profit" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </section>

      {/* Row 2: Revenue vs Goal + Expenses by Category (pie) */}
      <section className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4 gap-3">
          <SectionHeader
            title="Revenue vs Goal"
            description="Actual vs target per month"
            icon={<Target className="h-4 w-4" />}
          />
          {isLoading || !data ? (
            <Skeleton className="h-64" />
          ) : data.months.every((m) => m.revenue === 0) ? (
            <EmptyState icon={<Target className="h-8 w-8" />} title="No data" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.months.map((m) => ({
                    ...m,
                    target: data.goal?.targetAmount ?? 0,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Actual" />
                  {data.goal && (
                    <Bar dataKey="target" fill="#71717a" radius={[4, 4, 0, 0]} name="Target" />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-4 gap-3">
          <SectionHeader
            title="Expenses by Category"
            description={data?.isDemo ? "All time (demo data)" : "All time"}
            icon={<PieIcon className="h-4 w-4" />}
          />
          {isLoading || !data ? (
            <Skeleton className="h-64" />
          ) : data.expensesByCategory.every((e) => e.amount === 0) ? (
            <EmptyState icon={<PieIcon className="h-8 w-8" />} title="No expenses" description="Add expense entries to see the breakdown." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.expensesByCategory.filter((e) => e.amount > 0)}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(e: { category: string; amount: number }) => `${e.category} (${formatCurrency(e.amount, { compact: true })})`}
                    labelLine={false}
                  >
                    {data.expensesByCategory
                      .filter((e) => e.amount > 0)
                      .map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </section>

      {/* Row 3: Revenue by Source (pie) + Revenue by Channel (bar) */}
      <section className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4 gap-3">
          <SectionHeader
            title="Revenue by Source"
            description={data?.isDemo ? "All time (demo data)" : "All time"}
            icon={<PieIcon className="h-4 w-4" />}
          />
          {isLoading || !data ? (
            <Skeleton className="h-64" />
          ) : data.revenueBySource.every((r) => r.amount === 0) ? (
            <EmptyState icon={<PieIcon className="h-8 w-8" />} title="No revenue" description="Add revenue entries to see the breakdown." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.revenueBySource.filter((r) => r.amount > 0)}
                    dataKey="amount"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(e: { source: string; amount: number }) => `${e.source} (${formatCurrency(e.amount, { compact: true })})`}
                    labelLine={false}
                  >
                    {data.revenueBySource
                      .filter((r) => r.amount > 0)
                      .map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-4 gap-3">
          <SectionHeader
            title="Revenue by Channel"
            description={data?.isDemo ? "All time (demo data)" : "All time"}
            icon={<BarChart3 className="h-4 w-4" />}
          />
          {isLoading || !data ? (
            <Skeleton className="h-64" />
          ) : data.revenueByChannel.every((r) => r.amount === 0) ? (
            <EmptyState icon={<BarChart3 className="h-8 w-8" />} title="No revenue" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueByChannel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="channel" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={80} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]} name="Revenue">
                    {data.revenueByChannel.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </section>

      {/* Row 4: Profit Margin trend (line, full width) */}
      <section>
        <Card className="p-4 gap-3">
          <SectionHeader
            title="Profit Margin Trend"
            description={data?.isDemo ? "Last 6 months (demo data)" : "Last 6 months"}
            icon={<Activity className="h-4 w-4" />}
          />
          {isLoading || !data ? (
            <Skeleton className="h-56" />
          ) : data.months.every((m) => m.revenue === 0) ? (
            <EmptyState icon={<Activity className="h-8 w-8" />} title="No margin data" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.months}>
                  <defs>
                    <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v}%`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => formatPercent(v)} />
                  <Area type="monotone" dataKey="margin" stroke="#8b5cf6" strokeWidth={2} fill="url(#marginGrad)" name="Margin %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </section>

      {/* CALCULATED METRICS */}
      {!isLoading && data && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <MetricPill icon={<CircleDollarSign className="h-4 w-4" />} label="Avg Monthly Revenue" value={formatCurrency(data.avgMonthlyRevenue)} accent="emerald" />
          <MetricPill icon={<Wallet className="h-4 w-4" />} label="Avg Monthly Profit" value={formatCurrency(data.avgMonthlyProfit)} accent="sky" />
          <MetricPill icon={<TrendingUp className="h-4 w-4" />} label="Revenue Growth" value={formatPercent(data.currentMonth.revGrowth)} accent={data.currentMonth.revGrowth >= 0 ? "emerald" : "rose"} />
          <MetricPill icon={<Activity className="h-4 w-4" />} label="Profit Growth" value={formatPercent(data.currentMonth.profitGrowth)} accent={data.currentMonth.profitGrowth >= 0 ? "emerald" : "rose"} />
          <MetricPill icon={<Trophy className="h-4 w-4" />} label="Best Month" value={data.bestMonth ? `${data.bestMonth.label} · ${formatCurrency(data.bestMonth.revenue)}` : "—"} accent="amber" />
          <MetricPill icon={<AlertCircle className="h-4 w-4" />} label="Worst Month" value={data.worstMonth ? `${data.worstMonth.label} · ${formatCurrency(data.worstMonth.revenue)}` : "—"} accent="rose" />
        </section>
      )}

      {/* TRANSACTION LOG */}
      <section>
        <Card className="p-4 gap-3">
          <SectionHeader
            title="Transaction Log"
            description={
              data
                ? `${data.counts.revenue} revenue + ${data.counts.expenses} expense entries`
                : "Recent revenue and expense entries"
            }
            icon={<Receipt className="h-4 w-4" />}
            actions={
              <AddTransactionDialog onAdd={(b) => addTx.mutate(b)} loading={addTx.isPending} />
            }
          />
          {isLoading || !data ? (
            <Skeleton className="h-64" />
          ) : data.transactions.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-8 w-8" />}
              title="No transactions yet"
              description="Add your first revenue or expense entry to start tracking."
              action={<AddTransactionDialog onAdd={(b) => addTx.mutate(b)} loading={addTx.isPending} />}
            />
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead className="w-36">Category</TableHead>
                    <TableHead className="w-28">Channel</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transactions.map((t) => (
                    <TableRow key={`${t.kind}-${t.id}`}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium",
                            t.kind === "revenue"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30"
                              : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30"
                          )}
                        >
                          {t.kind === "revenue" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                          {t.kind}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatShortDate(t.date)}</TableCell>
                      <TableCell className="text-xs font-medium">{t.category}</TableCell>
                      <TableCell className="text-xs">{t.channel ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-xs">
                        {t.description ?? "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold tabular-nums",
                          t.kind === "revenue" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {t.kind === "revenue" ? "+" : "−"}
                        {formatCurrency(t.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                          onClick={() => deleteTx.mutate({ id: t.id, kind: t.kind })}
                          disabled={deleteTx.isPending}
                          aria-label="Delete entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

// ---------- Add Transaction Dialog ----------
function AddTransactionDialog({
  onAdd,
  loading,
}: {
  onAdd: (body: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<"revenue" | "expense">("revenue");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [source, setSource] = React.useState("AFFILIATE");
  const [category, setCategory] = React.useState("AI_TOOLS");
  const [channel, setChannel] = React.useState("PINTEREST");
  const [description, setDescription] = React.useState("");

  function reset() {
    setType("revenue");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setSource("AFFILIATE");
    setCategory("AI_TOOLS");
    setChannel("PINTEREST");
    setDescription("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    onAdd({
      type,
      date,
      amount: amt,
      source: type === "revenue" ? source : undefined,
      category: type === "expense" ? category : undefined,
      channel,
      description: description.trim() || undefined,
    });
    setOpen(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>Record a new revenue or expense entry.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "revenue" | "expense")}>
                <SelectTrigger id="tx-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-amount">Amount ($)</Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-date">Date</Label>
            <Input
              id="tx-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {type === "revenue" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tx-source">Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger id="tx-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REV_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tx-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="tx-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXP_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-channel">Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger id="tx-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-desc">Description (optional)</Label>
            <Input
              id="tx-desc"
              placeholder="e.g. Etsy sale — Boho Coaster Set"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- MetricPill ----------
function MetricPill({
  icon,
  label,
  value,
  accent = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: "default" | "emerald" | "amber" | "rose" | "sky" | "violet";
}) {
  const accentMap: Record<string, string> = {
    default: "text-foreground",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
    sky: "text-sky-600 dark:text-sky-400",
    violet: "text-violet-600 dark:text-violet-400",
  };
  return (
    <Card className="p-3 gap-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className={accentMap[accent]}>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className={cn("text-base font-bold tracking-tight", accentMap[accent])}>{value}</div>
    </Card>
  );
}
