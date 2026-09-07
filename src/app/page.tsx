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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  CheckCircle2, Circle, Plus, Minus, Image as ImageIcon, Sparkles, Flame, Trophy,
  Bell, Target, Plus as PlusIcon, Trash2, X, Check, Lock, Settings, Pencil, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Task = { id: string; title: string; done: boolean };
type Category = {
  id: string; name: string; dailyTarget: number; color: string; icon: string;
  doneCount: number; remaining: number; pct: number; tasks: Task[];
};
type Account = { id: string; name: string; done: boolean; selected: boolean; cycle: number; orderIndex: number; pinsCompleted: number; pinsPerBatch: number };
type Reminder = { text: string; severity: "info" | "warn" | "good" };
type Reward = { icon: string; title: string; desc: string; unlocked: boolean };
type TodayData = {
  dateLabel: string;
  pinterest: {
    accountOfDay: { id: string; name: string; pinsPerBatch: number; pinsCompleted: number; cycle: number } | null;
    accounts: Account[];
    accountsDone: number; totalAccounts: number; cycleNumber: number; pct: number;
  };
  categories: Category[];
  streak: { current: number; longest: number; rewards: number; totalDays: number };
  history: Array<{ label: string; date: string; pinterest: number; blog: number; patterns: number }>;
  monthlyHistory: Array<{ label: string; date: string; pinterest: number; blog: number; patterns: number }>;
  overallPct: number;
  reminders: Reminder[];
  rewards: Reward[];
};

const COLOR_MAP: Record<string, { bg: string; text: string; bar: string; chip: string }> = {
  violet: { bg: "bg-violet-500/10", text: "text-violet-300", bar: "bg-violet-500", chip: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  sky: { bg: "bg-sky-500/10", text: "text-sky-300", bar: "bg-sky-500", chip: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-300", bar: "bg-emerald-500", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-300", bar: "bg-amber-500", chip: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-300", bar: "bg-rose-500", chip: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-300", bar: "bg-cyan-500", chip: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
};
const CHART_COLOR: Record<string, string> = { pinterest: "#8b5cf6", blog: "#0ea5e9", patterns: "#10b981" };
const COLOR_OPTIONS = ["violet", "sky", "emerald", "amber", "rose", "cyan"];

export default function Home() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Always fetch fresh from server. localStorage is only a placeholder to avoid white screen
  // while the request is in-flight. We bump the CACHE_VERSION whenever the seed data changes
  // so old localStorage is automatically discarded.
  const CACHE_VERSION = "v3-unlock-monthly";
  const STORAGE_KEY = `content-os-today-${CACHE_VERSION}`;

  const { data, isLoading } = useQuery<TodayData>({
    queryKey: ["today"],
    queryFn: async () => {
      const res = await fetch("/api/today");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(json)); } catch {}
      return json;
    },
    initialData: () => {
      if (typeof window === "undefined") return undefined;
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        return cached ? JSON.parse(cached) : undefined;
      } catch { return undefined; }
    },
    // Always fetch from server on mount to get fresh data, but keep cached data visible meanwhile
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const [addCatOpen, setAddCatOpen] = React.useState(false);
  const [manageAccOpen, setManageAccOpen] = React.useState(false);
  const [chartView, setChartView] = React.useState<"weekly" | "monthly">("weekly");

  // Helper: recompute overallPct + persist to localStorage
  const updateData = (updater: (prev: TodayData) => TodayData) => {
    const prev = qc.getQueryData<TodayData>(["today"]);
    if (!prev) return;
    const next = updater(prev);
    qc.setQueryData(["today"], next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const recompute = (d: TodayData): TodayData => {
    const pPct = d.pinterest.accountOfDay ? Math.min(100, (d.pinterest.accountOfDay.pinsCompleted / d.pinterest.accountOfDay.pinsPerBatch) * 100) : 0;
    const cPcts = d.categories.map((c) => c.pct);
    const overall = Math.round((pPct + (cPcts.length > 0 ? cPcts.reduce((s, p) => s + p, 0) / cPcts.length : 0)) / (cPcts.length > 0 ? 2 : 1));
    // Update today's history point so the chart updates live with actions
    // Map categories to chart lines: blog, patterns (existing) + generic fallback
    const blogPct = d.categories.find((c) => c.name.toLowerCase() === "blog")?.pct ?? d.history[d.history.length-1]?.blog ?? 0;
    const patternsPct = d.categories.find((c) => c.name.toLowerCase() === "patterns")?.pct ?? d.history[d.history.length-1]?.patterns ?? 0;
    const pinPct = Math.round(pPct);
    const updateToday = (arr: typeof d.history) => arr.map((h, i) => {
      if (i !== arr.length - 1) return h; // only update today (last point)
      return { ...h, pinterest: pinPct, blog: blogPct, patterns: patternsPct };
    });
    return {
      ...d,
      overallPct: overall,
      pinterest: { ...d.pinterest, pct: pinPct },
      history: updateToday(d.history),
      monthlyHistory: updateToday(d.monthlyHistory),
    };
  };

  // ---- Optimistic mutations: UI updates INSTANTLY, NO background refetch (no flash) ----
  const addPin = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) =>
      fetch(`/api/pinterest/accounts/${id}/pins`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delta }) }).then((r) => r.json()),
    onMutate: async ({ id, delta }) => {
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => recompute({
        ...prev,
        pinterest: {
          ...prev.pinterest,
          accountOfDay: prev.pinterest.accountOfDay && prev.pinterest.accountOfDay.id === id
            ? { ...prev.pinterest.accountOfDay, pinsCompleted: Math.max(0, Math.min(prev.pinterest.accountOfDay.pinsPerBatch, prev.pinterest.accountOfDay.pinsCompleted + delta)) }
            : prev.pinterest.accountOfDay,
          accounts: prev.pinterest.accounts.map((a) => a.id === id ? { ...a, pinsCompleted: Math.max(0, Math.min(a.pinsPerBatch, a.pinsCompleted + delta)) } : a),
        },
      }));
      return {};
    },
  });

  const doneAccount = useMutation({
    mutationFn: async (id: string) => fetch(`/api/pinterest/accounts/${id}/done`, { method: "POST" }).then((r) => r.json()),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => {
        const accounts = prev.pinterest.accounts.map((a) => a.id === id ? { ...a, done: true, selected: false, pinsCompleted: a.pinsPerBatch } : a);
        const nextAcc = accounts.find((a) => !a.done) ?? null;
        return recompute({
          ...prev,
          pinterest: {
            ...prev.pinterest,
            accounts,
            accountsDone: accounts.filter((a) => a.done).length,
            accountOfDay: nextAcc ? { id: nextAcc.id, name: nextAcc.name, pinsPerBatch: nextAcc.pinsPerBatch, pinsCompleted: nextAcc.pinsCompleted, cycle: nextAcc.cycle } : null,
          },
        });
      });
      toast({ title: "Account done! 🎯", description: "Locked until the cycle completes." });
      return {};
    },
  });

  const selectAccount = useMutation({
    mutationFn: async (id: string) => fetch(`/api/pinterest/accounts/${id}/select`, { method: "POST" }).then((r) => r.json()),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => {
        const accounts = prev.pinterest.accounts.map((a) => ({ ...a, selected: a.id === id }));
        const sel = accounts.find((a) => a.id === id);
        return recompute({
          ...prev,
          pinterest: {
            ...prev.pinterest,
            accounts,
            accountOfDay: sel ? { id: sel.id, name: sel.name, pinsPerBatch: sel.pinsPerBatch, pinsCompleted: sel.pinsCompleted, cycle: sel.cycle } : prev.pinterest.accountOfDay,
          },
        });
      });
      return {};
    },
    onError: () => toast({ title: "Can't select a done account", variant: "destructive" }),
  });

  const toggleTask = useMutation({
    mutationFn: async (id: string) => fetch(`/api/tasks/${id}/toggle`, { method: "POST" }).then((r) => r.json()),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => recompute({
        ...prev,
        categories: prev.categories.map((c) => {
          const task = c.tasks.find((t) => t.id === id);
          if (!task) return c;
          const newDone = !task.done;
          const tasks = c.tasks.map((t) => t.id === id ? { ...t, done: newDone } : t);
          const doneCount = tasks.filter((t) => t.done).length;
          const pct = c.dailyTarget > 0 ? Math.min(100, Math.round((doneCount / c.dailyTarget) * 100)) : 0;
          return { ...c, tasks, doneCount, remaining: Math.max(0, c.dailyTarget - doneCount), pct };
        }),
      }));
      return {};
    },
  });

  const addTask = useMutation({
    mutationFn: async ({ categoryId, title }: { categoryId: string; title: string }) =>
      fetch(`/api/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId, title }) }).then((r) => r.json()),
    onMutate: async ({ categoryId, title }) => {
      const tempId = `temp-${Date.now()}`;
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) => c.id !== categoryId ? c : { ...c, tasks: [...c.tasks, { id: tempId, title, done: false }] }),
      }));
      return { tempId };
    },
    onSuccess: (created: { id: string }, _v, ctx) => {
      // Replace temp ID with real ID from server (no refetch needed)
      if (!ctx?.tempId) return;
      updateData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) => ({
          ...c,
          tasks: c.tasks.map((t) => t.id === ctx.tempId ? { id: created.id, title: t.title, done: t.done } : t),
        })),
      }));
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => fetch(`/api/tasks?id=${id}`, { method: "DELETE" }).then((r) => r.json()),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => recompute({
        ...prev,
        categories: prev.categories.map((c) => {
          const tasks = c.tasks.filter((t) => t.id !== id);
          if (tasks.length === c.tasks.length) return c;
          const doneCount = tasks.filter((t) => t.done).length;
          const pct = c.dailyTarget > 0 ? Math.min(100, Math.round((doneCount / c.dailyTarget) * 100)) : 0;
          return { ...c, tasks, doneCount, remaining: Math.max(0, c.dailyTarget - doneCount), pct };
        }),
      }));
      return {};
    },
  });

  const addCategory = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      fetch(`/api/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onMutate: async (body) => {
      const tempId = `temp-cat-${Date.now()}`;
      const tempCat: Category = {
        id: tempId, name: body.name as string, dailyTarget: (body.dailyTarget as number) || 5,
        color: (body.color as string) || "violet", icon: "FileText",
        doneCount: 0, remaining: (body.dailyTarget as number) || 5, pct: 0, tasks: [],
      };
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => ({ ...prev, categories: [...prev.categories, tempCat] }));
      toast({ title: "Category added!" });
      setAddCatOpen(false);
      return { tempId };
    },
    onSuccess: (created: Category, _v, ctx) => {
      if (!ctx?.tempId) return;
      updateData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) => c.id === ctx.tempId ? { ...created, tasks: [] } : c),
      }));
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => fetch(`/api/categories/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => ({ ...prev, categories: prev.categories.filter((c) => c.id !== id) }));
      toast({ title: "Category removed" });
      return {};
    },
  });

  // ---- Pinterest account CRUD ----
  const addAccount = useMutation({
    mutationFn: async ({ name, pinsPerBatch }: { name: string; pinsPerBatch: number }) =>
      fetch(`/api/pinterest/accounts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, pinsPerBatch }) }).then((r) => r.json()),
    onMutate: async ({ name, pinsPerBatch }) => {
      const tempId = `temp-acc-${Date.now()}`;
      const tempAcc: Account = { id: tempId, name, done: false, selected: false, cycle: 1, orderIndex: 999, pinsCompleted: 0, pinsPerBatch };
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => ({
        ...prev,
        pinterest: { ...prev.pinterest, accounts: [...prev.pinterest.accounts, tempAcc], totalAccounts: prev.pinterest.totalAccounts + 1 },
      }));
      toast({ title: "Account added!" });
      return { tempId };
    },
    onSuccess: (created: Account, _v, ctx) => {
      if (!ctx?.tempId) return;
      updateData((prev) => ({
        ...prev,
        pinterest: { ...prev.pinterest, accounts: prev.pinterest.accounts.map((a) => a.id === ctx.tempId ? { ...created, done: false, selected: false } : a) },
      }));
    },
  });

  const editAccount = useMutation({
    mutationFn: async ({ id, name, pinsPerBatch }: { id: string; name: string; pinsPerBatch: number }) =>
      fetch(`/api/pinterest/accounts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, pinsPerBatch }) }).then((r) => r.json()),
    onMutate: async ({ id, name, pinsPerBatch }) => {
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => ({
        ...prev,
        pinterest: {
          ...prev.pinterest,
          accounts: prev.pinterest.accounts.map((a) => a.id === id ? { ...a, name, pinsPerBatch } : a),
          accountOfDay: prev.pinterest.accountOfDay && prev.pinterest.accountOfDay.id === id ? { ...prev.pinterest.accountOfDay, name, pinsPerBatch } : prev.pinterest.accountOfDay,
        },
      }));
      toast({ title: "Account updated" });
      return {};
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => fetch(`/api/pinterest/accounts/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => {
        const accounts = prev.pinterest.accounts.filter((a) => a.id !== id);
        const accountOfDay = prev.pinterest.accountOfDay && prev.pinterest.accountOfDay.id === id
          ? (accounts.find((a) => !a.done) ? { id: accounts.find((a) => !a.done)!.id, name: accounts.find((a) => !a.done)!.name, pinsPerBatch: accounts.find((a) => !a.done)!.pinsPerBatch, pinsCompleted: accounts.find((a) => !a.done)!.pinsCompleted, cycle: accounts.find((a) => !a.done)!.cycle } : null)
          : prev.pinterest.accountOfDay;
        return recompute({
          ...prev,
          pinterest: { ...prev.pinterest, accounts, totalAccounts: accounts.length, accountsDone: accounts.filter((a) => a.done).length, accountOfDay },
        });
      });
      toast({ title: "Account removed" });
      return {};
    },
  });

  const unlockAccount = useMutation({
    mutationFn: async (id: string) => fetch(`/api/pinterest/accounts/${id}/unlock`, { method: "POST" }).then((r) => r.json()),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => {
        const accounts = prev.pinterest.accounts.map((a) => a.id === id ? { ...a, done: false, selected: false, pinsCompleted: 0 } : a);
        return recompute({
          ...prev,
          pinterest: { ...prev.pinterest, accounts, accountsDone: accounts.filter((a) => a.done).length, accountOfDay: prev.pinterest.accountOfDay },
        });
      });
      toast({ title: "Account unlocked! 🔓" });
      return {};
    },
  });

  const resetData = useMutation({
    mutationFn: async () => fetch(`/api/reset`, { method: "POST" }).then((r) => r.json()),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["today"] });
      const prev = qc.getQueryData<TodayData>(["today"]);
      // Optimistically wipe to blank state
      if (prev) {
        const blank: TodayData = {
          ...prev,
          pinterest: {
            ...prev.pinterest,
            accounts: prev.pinterest.accounts.map((a) => ({ ...a, done: false, selected: false, pinsCompleted: 0, cycle: 1 })),
            accountsDone: 0,
            accountOfDay: prev.pinterest.accounts[0] ? { id: prev.pinterest.accounts[0].id, name: prev.pinterest.accounts[0].name, pinsPerBatch: prev.pinterest.accounts[0].pinsPerBatch, pinsCompleted: 0, cycle: 1 } : null,
            pct: 0,
          },
          categories: [],
          streak: { current: 0, longest: 0, rewards: 0, totalDays: 0 },
          overallPct: 0,
          history: prev.history.map((h, i) => i === prev.history.length - 1 ? { ...h, pinterest: 0, blog: 0, patterns: 0 } : h),
          monthlyHistory: prev.monthlyHistory.map((h, i) => i === prev.monthlyHistory.length - 1 ? { ...h, pinterest: 0, blog: 0, patterns: 0 } : h),
          reminders: [{ text: "Fresh start! Add categories and tasks to begin. 🎉", severity: "good" }],
          rewards: prev.rewards.map((r) => ({ ...r, unlocked: false })),
        };
        qc.setQueryData(["today"], blank);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(blank)); } catch {}
      }
      toast({ title: "Data reset to blank slate!" });
      return {};
    },
  });

  // Pre-warm all API routes on mount so the first action doesn't trigger compilation
  React.useEffect(() => {
    const warm = async () => {
      await Promise.allSettled([
        fetch("/api/today"),
        fetch("/api/categories"),
        fetch("/api/pinterest/accounts"),
      ]);
      await Promise.allSettled([
        fetch("/api/pinterest/accounts/warm/pins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delta: 0 }) }).catch(() => {}),
        fetch("/api/pinterest/accounts/warm/done", { method: "POST" }).catch(() => {}),
        fetch("/api/pinterest/accounts/warm/select", { method: "POST" }).catch(() => {}),
        fetch("/api/pinterest/accounts/warm", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {}),
        fetch("/api/pinterest/accounts/warm", { method: "DELETE" }).catch(() => {}),
        fetch("/api/tasks/warm/toggle", { method: "POST" }).catch(() => {}),
        fetch("/api/tasks?warm=1", { method: "DELETE" }).catch(() => {}),
      ]);
    };
    warm();
  }, []);

  const overallPct = data?.overallPct ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Content OS</h1>
              <p className="text-xs text-zinc-400">{data?.dateLabel ?? "Today"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
              <Flame className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-300">{data?.streak.current ?? 0}</span>
              <span className="text-xs text-amber-300/70">day streak</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5">
              <Trophy className="h-4 w-4 text-violet-300" />
              <span className="text-sm font-bold text-violet-300">{data?.streak.rewards ?? 0}</span>
              <span className="text-xs text-violet-300/70">perfect days</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
              disabled={resetData.isPending}
              onClick={() => { if (confirm("Reset all data to fresh start? This will clear your current progress.")) resetData.mutate(); }}
              title="Reset all data to initial state"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>
        </header>

        {/* OVERALL PROGRESS */}
        <Card className="mb-6 border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-semibold">Today's Overall Progress</span>
            </div>
            <span className={cn("text-2xl font-bold tabular-nums", overallPct >= 100 ? "text-emerald-400" : overallPct >= 50 ? "text-amber-400" : "text-rose-400")}>{overallPct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={cn("h-full rounded-full transition-all duration-500", overallPct >= 100 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : overallPct >= 50 ? "bg-gradient-to-r from-amber-500 to-orange-400" : "bg-gradient-to-r from-rose-500 to-pink-400")}
              style={{ width: `${overallPct}%` }}
            />
          </div>
          {overallPct >= 100 && (
            <p className="mt-2 text-xs text-emerald-400 font-medium flex items-center gap-1">
              <Trophy className="h-3 w-3" /> Perfect day! All targets hit. 🎉
            </p>
          )}
        </Card>

        {/* PINTEREST — ACCOUNT OF THE DAY + SELECTABLE ACCOUNTS */}
        <Card className="mb-6 border-zinc-800 bg-gradient-to-br from-violet-500/10 via-zinc-900/60 to-zinc-900/60 p-5 backdrop-blur">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-violet-300">Pinterest · Working On</span>
            <Badge variant="outline" className="ml-auto border-zinc-700 text-zinc-400">Cycle {data?.pinterest.cycleNumber ?? 1} · {data?.pinterest.accountsDone ?? 0}/{data?.pinterest.totalAccounts ?? 0} done</Badge>
            <Button size="sm" variant="outline" className="h-7 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs" onClick={() => setManageAccOpen(true)}>
              <Settings className="h-3 w-3" /> Manage
            </Button>
          </div>
          {isLoading ? <Skeleton className="h-20 bg-zinc-800" /> : data?.pinterest.accountOfDay ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">{data.pinterest.accountOfDay.name}</h2>
                <p className="text-sm text-zinc-400 mt-0.5">Tap the number to add a pin · tap − to undo</p>
              </div>
              <div className="flex flex-col gap-2 sm:w-72">
                {/* Big clickable counter — tap to add a pin */}
                <button
                  onClick={() => addPin.mutate({ id: data.pinterest.accountOfDay!.id, delta: 1 })}
                  disabled={data.pinterest.accountOfDay.pinsCompleted >= data.pinterest.accountOfDay.pinsPerBatch}
                  className="group flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800/60 p-3 hover:border-violet-500/50 hover:bg-violet-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold tabular-nums text-violet-300 group-hover:scale-110 transition-transform">
                      {data.pinterest.accountOfDay.pinsCompleted}
                    </span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wide">/ {data.pinterest.accountOfDay.pinsPerBatch} pins</span>
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Progress value={data.pinterest.pct} className="h-2.5" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">{data.pinterest.pct}% done</span>
                      {data.pinterest.accountOfDay.pinsCompleted < data.pinterest.accountOfDay.pinsPerBatch ? (
                        <span className="text-[11px] text-violet-300 font-medium flex items-center gap-0.5">
                          <Plus className="h-3 w-3" /> tap
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-medium">complete! ✓</span>
                      )}
                    </div>
                  </div>
                  {/* Undo button — small, only if pins > 0 */}
                  {data.pinterest.accountOfDay.pinsCompleted > 0 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); addPin.mutate({ id: data.pinterest.accountOfDay!.id, delta: -1 }); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); addPin.mutate({ id: data.pinterest.accountOfDay!.id, delta: -1 }); } }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Undo last pin"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
                <Button
                  size="sm"
                  className="mt-1 bg-violet-600 hover:bg-violet-500 text-white"
                  disabled={doneAccount.isPending}
                  onClick={() => doneAccount.mutate(data.pinterest.accountOfDay!.id)}
                >
                  <CheckCircle2 className="h-4 w-4" /> Mark Done (Lock Account)
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-zinc-400">No account available.</p>
          )}

          {/* SELECTABLE ACCOUNTS — click to switch (only not-done ones) + unlock done ones */}
          {!isLoading && data && (
            <div className="mt-4">
              <p className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Accounts — click to work on · click 🔓 to unlock a locked one</p>
              <div className="flex flex-wrap gap-1.5">
                {data.pinterest.accounts.map((a) => {
                  const isCurrent = a.id === data.pinterest.accountOfDay?.id;
                  const isDone = a.done;
                  if (isDone) {
                    // Locked account — show with unlock button
                    return (
                      <div key={a.id} className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/30 px-2.5 py-1.5 text-[11px] font-medium text-zinc-500">
                        <Lock className="h-3 w-3" /> {a.name} ✓
                        <button
                          onClick={() => unlockAccount.mutate(a.id)}
                          title="Unlock this account"
                          className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-zinc-500 hover:text-violet-300 hover:bg-violet-500/20 transition-colors"
                        >
                          🔓
                        </button>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={a.id}
                      disabled={isCurrent}
                      onClick={() => selectAccount.mutate(a.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-medium border transition-all",
                        isCurrent
                          ? "border-violet-500/50 bg-violet-500/15 text-violet-200 cursor-default"
                          : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200 cursor-pointer"
                      )}
                    >
                      {isCurrent ? (
                        <><span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" /> {a.name}</>
                      ) : (
                        <><Circle className="h-2.5 w-2.5" /> {a.name}</>
                      )}
                    </button>
                  );
                })}
              </div>
              {data.pinterest.accountsDone === data.pinterest.totalAccounts && data.pinterest.totalAccounts > 0 && (
                <p className="mt-3 text-xs text-emerald-400 font-medium">🎉 All accounts done! Cycle will reset and unlock all accounts.</p>
              )}
            </div>
          )}
        </Card>

        {/* PROGRESS CHART — AREA (weekly/monthly toggle) */}
        <Card className="mb-6 border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-semibold">Progress (%)</span>
            </div>
            {!isLoading && data && (
              <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/50 p-0.5">
                <button
                  onClick={() => setChartView("weekly")}
                  className={cn("px-2.5 py-1 text-[11px] font-medium rounded-md transition-all", chartView === "weekly" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-zinc-200")}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setChartView("monthly")}
                  className={cn("px-2.5 py-1 text-[11px] font-medium rounded-md transition-all", chartView === "monthly" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-zinc-200")}
                >
                  Monthly
                </button>
              </div>
            )}
          </div>
          {isLoading || !data ? <Skeleton className="h-56 bg-zinc-800" /> : (
            <div className="h-56" style={{ minHeight: 224 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartView === "weekly" ? data.history : data.monthlyHistory} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <defs>
                    <linearGradient id="gPin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gBlog" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gPat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a1a1aa" }} stroke="#3f3f46" interval={chartView === "monthly" ? 2 : 0} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#a1a1aa" }} stroke="#3f3f46" unit="%" />
                  <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid #3f3f46", background: "#18181b", color: "#f4f4f5", fontSize: "0.75rem" }} />
                  <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                  <Area type="monotone" dataKey="pinterest" stroke="#8b5cf6" strokeWidth={2} fill="url(#gPin)" name="Pinterest" isAnimationActive={false} />
                  <Area type="monotone" dataKey="blog" stroke="#0ea5e9" strokeWidth={2} fill="url(#gBlog)" name="Blog" isAnimationActive={false} />
                  <Area type="monotone" dataKey="patterns" stroke="#10b981" strokeWidth={2} fill="url(#gPat)" name="Patterns" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* CATEGORIES */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-violet-400" /> Daily Categories
          </h2>
          <Button size="sm" variant="outline" className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200" onClick={() => setAddCatOpen(true)}>
            <PlusIcon className="h-4 w-4" /> Add Category
          </Button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 bg-zinc-800" />)
            : data?.categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  onToggle={(id) => toggleTask.mutate(id)}
                  onAddTask={(title) => addTask.mutate({ categoryId: cat.id, title })}
                  onDeleteTask={(id) => deleteTask.mutate(id)}
                  onDeleteCategory={() => deleteCategory.mutate(cat.id)}
                />
              ))}
        </div>

        {/* REMINDERS + REWARDS */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-sky-400" />
              <span className="text-sm font-semibold">Reminders</span>
            </div>
            {isLoading ? <Skeleton className="h-32 bg-zinc-800" /> : (
              <div className="flex flex-col gap-2">
                {data!.reminders.map((r, i) => (
                  <div key={i} className={cn("flex items-start gap-2 rounded-lg border p-2.5 text-sm",
                    r.severity === "good" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300" :
                    r.severity === "warn" ? "border-amber-500/30 bg-amber-500/5 text-amber-300" :
                    "border-zinc-700 bg-zinc-800/50 text-zinc-300")}>
                    <span className={cn("mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full",
                      r.severity === "good" ? "bg-emerald-400" : r.severity === "warn" ? "bg-amber-400" : "bg-sky-400")} />
                    <span>{r.text}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold">Rewards</span>
            </div>
            {isLoading ? <Skeleton className="h-32 bg-zinc-800" /> : (
              <div className="grid grid-cols-1 gap-2">
                {data!.rewards.map((rw, i) => (
                  <div key={i} className={cn("flex items-center gap-3 rounded-lg border p-2.5",
                    rw.unlocked ? "border-amber-500/30 bg-amber-500/5" : "border-zinc-800 bg-zinc-800/30 opacity-50")}>
                    <span className="text-xl">{rw.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", rw.unlocked ? "text-amber-300" : "text-zinc-400")}>{rw.title}</p>
                      <p className="text-[11px] text-zinc-500">{rw.desc}</p>
                    </div>
                    {rw.unlocked && <Check className="h-4 w-4 text-amber-400" />}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <footer className="mt-8 pb-4 text-center text-xs text-zinc-600">
          Content OS · Single-page process tracker · Stay consistent, ship every day
        </footer>
      </div>

      <AddCategoryDialog open={addCatOpen} onOpenChange={setAddCatOpen} onSubmit={(b) => addCategory.mutate(b)} />
      <ManageAccountsDialog
        open={manageAccOpen}
        onOpenChange={setManageAccOpen}
        accounts={data?.pinterest.accounts ?? []}
        onAdd={(name, pinsPerBatch) => addAccount.mutate({ name, pinsPerBatch })}
        onEdit={(id, name, pinsPerBatch) => editAccount.mutate({ id, name, pinsPerBatch })}
        onDelete={(id) => deleteAccount.mutate(id)}
      />
    </div>
  );
}

function CategoryCard({
  cat, onToggle, onAddTask, onDeleteTask, onDeleteCategory,
}: {
  cat: Category;
  onToggle: (id: string) => void;
  onAddTask: (title: string) => void;
  onDeleteTask: (id: string) => void;
  onDeleteCategory: () => void;
}) {
  const colors = COLOR_MAP[cat.color] ?? COLOR_MAP.violet;
  const [newTask, setNewTask] = React.useState("");
  const [showInput, setShowInput] = React.useState(false);

  const submit = () => {
    if (!newTask.trim()) return;
    onAddTask(newTask.trim());
    setNewTask("");
    setShowInput(false);
  };

  return (
    <Card className={cn("border-zinc-800 backdrop-blur flex flex-col", colors.bg)}>
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-bold uppercase", colors.chip)}>{cat.name}</span>
            <span className="text-xs text-zinc-400">{cat.doneCount}/{cat.dailyTarget} done</span>
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-500 hover:text-rose-400" onClick={onDeleteCategory}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div className={cn("h-full rounded-full transition-all", colors.bar)} style={{ width: `${cat.pct}%` }} />
          </div>
          <span className={cn("text-sm font-bold tabular-nums", colors.text)}>{cat.pct}%</span>
        </div>
      </div>

      <div className="flex-1 px-4 pb-2">
        <div className="flex flex-col gap-1 max-h-44 overflow-y-auto">
          {cat.tasks.length === 0 && <p className="text-xs text-zinc-500 py-2 text-center">No tasks yet</p>}
          {cat.tasks.map((t) => (
            <div key={t.id} className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-zinc-800/50">
              <button onClick={() => onToggle(t.id)} className="shrink-0">
                {t.done ? <CheckCircle2 className={cn("h-4 w-4", colors.text)} /> : <Circle className="h-4 w-4 text-zinc-600 hover:text-zinc-400" />}
              </button>
              <span className={cn("text-sm flex-1 truncate", t.done ? "line-through text-zinc-500" : "text-zinc-200")}>{t.title}</span>
              <button onClick={() => onDeleteTask(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3 w-3 text-zinc-500 hover:text-rose-400" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-zinc-800/60">
        {showInput ? (
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setShowInput(false); setNewTask(""); } }}
              placeholder="Task title..."
              className="h-8 border-zinc-700 bg-zinc-800 text-sm"
            />
            <Button size="sm" className="h-8 px-2" onClick={submit}><Check className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" className="h-8 px-2 text-zinc-400" onClick={() => { setShowInput(false); setNewTask(""); }}><X className="h-3.5 w-3.5" /></Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="w-full text-zinc-400 hover:text-zinc-200" onClick={() => setShowInput(true)}>
            <Plus className="h-3.5 w-3.5" /> Add task
          </Button>
        )}
      </div>
    </Card>
  );
}

function AddCategoryDialog({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (b: Record<string, unknown>) => void }) {
  const [name, setName] = React.useState("");
  const [target, setTarget] = React.useState("5");
  const [color, setColor] = React.useState("violet");

  React.useEffect(() => { if (open) { setName(""); setTarget("5"); setColor("violet"); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader><DialogTitle className="text-zinc-100">Add Category</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-zinc-400">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. YouTube, Newsletter..." className="bg-zinc-800 border-zinc-700" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-zinc-400">Daily target (tasks per day)</Label>
            <Input type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} className="bg-zinc-800 border-zinc-700" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-zinc-400">Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className={cn("h-8 w-8 rounded-full border-2 transition-all", COLOR_MAP[c].bar, color === c ? "border-white scale-110" : "border-transparent")} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-700 bg-zinc-800 text-zinc-200" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-violet-600 hover:bg-violet-500 text-white" disabled={!name} onClick={() => onSubmit({ name, dailyTarget: parseInt(target) || 5, color })}>Add Category</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManageAccountsDialog({
  open, onOpenChange, accounts, onAdd, onEdit, onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accounts: Account[];
  onAdd: (name: string, pinsPerBatch: number) => void;
  onEdit: (id: string, name: string, pinsPerBatch: number) => void;
  onDelete: (id: string) => void;
}) {
  const [newName, setNewName] = React.useState("");
  const [newPins, setNewPins] = React.useState("30");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editPins, setEditPins] = React.useState("30");

  React.useEffect(() => {
    if (open) { setNewName(""); setNewPins("30"); setEditId(null); }
  }, [open]);

  const startEdit = (a: Account) => { setEditId(a.id); setEditName(a.name); setEditPins(String(a.pinsPerBatch)); };
  const saveEdit = () => {
    if (!editId || !editName.trim()) return;
    onEdit(editId, editName.trim(), parseInt(editPins) || 30);
    setEditId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-800">
        <DialogHeader><DialogTitle className="text-zinc-100 flex items-center gap-2"><ImageIcon className="h-4 w-4 text-violet-400" /> Manage Pinterest Accounts</DialogTitle></DialogHeader>

        {/* Add new account */}
        <div className="flex items-center gap-2 py-2 border-b border-zinc-800 pb-3">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Account name..." className="bg-zinc-800 border-zinc-700 flex-1" />
          <Input type="number" min={1} value={newPins} onChange={(e) => setNewPins(e.target.value)} className="bg-zinc-800 border-zinc-700 w-20" />
          <Button className="bg-violet-600 hover:bg-violet-500 text-white" disabled={!newName.trim()} onClick={() => { onAdd(newName.trim(), parseInt(newPins) || 30); setNewName(""); setNewPins("30"); }}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* List of accounts */}
        <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto py-2">
          {accounts.length === 0 && <p className="text-xs text-zinc-500 py-4 text-center">No accounts yet. Add one above.</p>}
          {accounts.map((a, i) => (
            <div key={a.id} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/30 p-2">
              <span className="text-xs font-mono text-zinc-500 w-6 text-center">{i + 1}</span>
              {editId === a.id ? (
                <>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-zinc-800 border-zinc-700 h-8 flex-1 text-sm" autoFocus />
                  <Input type="number" min={1} value={editPins} onChange={(e) => setEditPins(e.target.value)} className="bg-zinc-800 border-zinc-700 h-8 w-16 text-sm" />
                  <Button size="sm" className="h-8 px-2 bg-emerald-600 hover:bg-emerald-500 text-white" onClick={saveEdit}><Check className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-zinc-400" onClick={() => setEditId(null)}><X className="h-3.5 w-3.5" /></Button>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-zinc-200 flex-1 truncate">{a.name}</span>
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">{a.pinsPerBatch} pins</Badge>
                  {a.done && <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px]">done</Badge>}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-200" onClick={() => startEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-400" onClick={() => { if (confirm(`Delete "${a.name}"?`)) onDelete(a.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" className="border-zinc-700 bg-zinc-800 text-zinc-200" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
