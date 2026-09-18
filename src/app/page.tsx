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
  Bell, Target, Plus as PlusIcon, Trash2, X, Check, Lock, Settings, Pencil, RotateCcw, LogOut,
  Activity, TrendingUp, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { login, logout, getSession, type Session } from "@/lib/auth";

type Task = { id: string; title: string; done: boolean };
type Category = {
  id: string; name: string; dailyTarget: number; color: string; icon: string;
  doneCount: number; remaining: number; pct: number; tasks: Task[];
};
type Objective = {
  id: string; title: string; target: number; current: number; unit: string;
  deadline: string | null; category: string; achieved: boolean; achievedAt: string | null;
  pct: number; daysLeft: number | null;
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
  objectives: Objective[];
  streak: { current: number; longest: number; rewards: number; totalDays: number };
  history: Array<Record<string, unknown>>;
  monthlyHistory: Array<Record<string, unknown>>;
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
// Map category color name → hex (for chart lines)
const COLOR_HEX: Record<string, string> = {
  violet: "#8b5cf6",
  sky: "#0ea5e9",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  cyan: "#06b6d4",
};
const COLOR_OPTIONS = ["violet", "sky", "emerald", "amber", "rose", "cyan"];

export default function Home() {
  // Auth gate — show login screen if not authenticated
  const [session, setSession] = React.useState<Session | null>(null);
  const [authChecked, setAuthChecked] = React.useState(false);

  React.useEffect(() => {
    setSession(getSession());
    setAuthChecked(true);
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Sparkles className="h-8 w-8 text-violet-400 animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return <LoginScreen onLogin={() => setSession(getSession())} />;
  }

  return <AppContent session={session} onLogout={() => { logout(); setSession(null); }} />;
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      onLogin();
    } else {
      setError("Invalid username or password");
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30 mb-4">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Content OS</h1>
          <p className="text-xs text-zinc-500 mt-1">Sign in to your dashboard</p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username" className="text-xs text-zinc-400">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs text-zinc-400">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  {showPassword ? "hide" : "show"}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-xs text-rose-400 font-medium">{error}</p>
            )}
            <Button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white">
              Sign in
            </Button>
          </form>
        </Card>
        <p className="text-center text-[10px] text-zinc-600 mt-4">Content OS · Admin access only</p>
      </div>
    </div>
  );
}

function AppContent({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  // localStorage is the SOLE source of truth (Vercel serverless is stateless —
  // in-memory store resets on every cold start, so we can't rely on server).
  // Server is ONLY used for the very first visit (seed data). After that, all
  // reads come from localStorage, all writes go to localStorage.
  const CACHE_VERSION = "v9-smart-tasks";
  const STORAGE_KEY = `content-os-today-${CACHE_VERSION}`;

  // Check localStorage ONCE on mount — if we have data, never fetch from server
  const [hasCachedData] = React.useState(() => {
    if (typeof window === "undefined") return false;
    try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
  });

  const { data: queryData, isLoading } = useQuery<TodayData>({
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
    // Only fetch from server on the VERY FIRST visit (no localStorage yet).
    // After that, localStorage is the source of truth — never refetch.
    enabled: !hasCachedData,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const [addCatOpen, setAddCatOpen] = React.useState(false);
  const [manageAccOpen, setManageAccOpen] = React.useState(false);
  const [addObjOpen, setAddObjOpen] = React.useState(false);
  const [accSwitcherOpen, setAccSwitcherOpen] = React.useState(false);
  const [chartView, setChartView] = React.useState<"weekly" | "monthly">("weekly");
  // Smart Task Board state
  const [quickTaskText, setQuickTaskText] = React.useState("");
  const [quickTaskTag, setQuickTaskTag] = React.useState("");
  const [tagInput, setTagInput] = React.useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = React.useState(false);
  const [taskFilter, setTaskFilter] = React.useState<string>("all");
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = React.useState("");
  // localData is the SOLE source of truth for the UI (query is disabled after first load)
  const [localData, setLocalData] = React.useState<TodayData | undefined>(queryData);
  const data = localData;

  // Sync from query on first load (seed data)
  React.useEffect(() => { if (queryData) setLocalData(queryData); }, [queryData]);

  // Helper: update localData + localStorage + query cache (for mutations)
  const updateData = (updater: (prev: TodayData) => TodayData) => {
    setLocalData((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      qc.setQueryData(["today"], next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next; // triggers re-render → chart + daily states update live
    });
  };

  // Smart Task Board: quick add task with optional tag
  // If tag text typed doesn't match existing → creates new tag automatically
  const handleQuickAdd = () => {
    const title = quickTaskText.trim();
    if (!title) return;

    // Determine tag: selected categoryId, or typed tag name, or "General"
    let categoryId = quickTaskTag;
    const tagName = tagInput.trim();
    
    if (!categoryId && tagName) {
      // Check if tag already exists (case insensitive)
      const existing = (data?.categories ?? []).find((c) => c.name.toLowerCase() === tagName.toLowerCase());
      if (existing) {
        categoryId = existing.id;
      } else {
        // Create new tag locally (optimistic) with auto color
        const tagColors = ["violet", "sky", "emerald", "amber", "rose", "cyan"];
        const colorIdx = (data?.categories.length ?? 0) % tagColors.length;
        categoryId = `temp-cat-${Date.now()}`;
        const tempCat: Category = {
          id: categoryId, name: tagName, dailyTarget: 0,
          color: tagColors[colorIdx], icon: "FileText",
          doneCount: 0, remaining: 0, pct: 0, tasks: [],
        };
        updateData((prev) => recompute({ ...prev, categories: [...prev.categories, tempCat] }));
        // Create on server (background)
        fetch(`/api/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: tagName, color: tagColors[colorIdx] }) })
          .then((r) => r.json())
          .then((created) => {
            if (created.id) {
              updateData((prev) => ({
                ...prev,
                categories: prev.categories.map((c) => c.id === categoryId ? { ...c, id: created.id } : c),
              }));
            }
          })
          .catch(() => {});
      }
    } else if (!categoryId && !tagName) {
      // No tag selected and no tag typed → use first or create "General"
      const cats = data?.categories ?? [];
      if (cats.length > 0) {
        categoryId = cats[0].id;
      } else {
        categoryId = `temp-cat-${Date.now()}`;
        updateData((prev) => recompute({ ...prev, categories: [...prev.categories, { id: categoryId, name: "General", dailyTarget: 0, color: "violet", icon: "FileText", doneCount: 0, remaining: 0, pct: 0, tasks: [] }] }));
        fetch(`/api/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "General", color: "violet" }) }).then((r) => r.json()).then((created) => { if (created.id) { updateData((prev) => ({ ...prev, categories: prev.categories.map((c) => c.id === categoryId ? { ...c, id: created.id } : c) })); } }).catch(() => {});
      }
    }

    // Add task to local data (optimistic + instant)
    const tempTaskId = `temp-task-${Date.now()}`;
    updateData((prev) => {
      const cats = prev.categories.map((c) => {
        if (c.id !== categoryId) return c;
        const tasks = [...c.tasks, { id: tempTaskId, title, done: false }];
        const doneCount = tasks.filter((t) => t.done).length;
        return { ...c, tasks, doneCount, remaining: Math.max(0, tasks.length - doneCount), pct: tasks.length > 0 ? Math.min(100, Math.round((doneCount / tasks.length) * 100)) : 0, dailyTarget: tasks.length };
      });
      return recompute({ ...prev, categories: cats });
    });

    // Create on server (background)
    fetch(`/api/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId, title }) })
      .then((r) => r.json())
      .then((task) => {
        if (task.id) {
          updateData((prev) => recompute({
            ...prev,
            categories: prev.categories.map((c) => c.id === categoryId ? { ...c, tasks: c.tasks.map((t) => t.id === tempTaskId ? { id: task.id, title: task.title || t.title, done: false } : t) } : c),
          }));
        }
      })
      .catch(() => {});

    setQuickTaskText("");
    setTagInput("");
    setQuickTaskTag("");
  };

  const recompute = (d: TodayData): TodayData => {
    const pPct = d.pinterest.accountOfDay ? Math.min(100, (d.pinterest.accountOfDay.pinsCompleted / d.pinterest.accountOfDay.pinsPerBatch) * 100) : 0;
    // Recompute each category's pct based on done/total (no dailyTarget)
    const catsWithPct = d.categories.map((c) => {
      const total = c.tasks.length;
      const doneCount = c.tasks.filter((t) => t.done).length;
      const pct = total > 0 ? Math.min(100, Math.round((doneCount / total) * 100)) : 0;
      return { ...c, doneCount, remaining: Math.max(0, total - doneCount), pct, dailyTarget: total };
    });
    const cPcts = catsWithPct.map((c) => c.pct);
    const overall = Math.round((pPct + (cPcts.length > 0 ? cPcts.reduce((s, p) => s + p, 0) / cPcts.length : 0)) / (cPcts.length > 0 ? 2 : 1));
    const pinPct = Math.round(pPct);
    const updateToday = (arr: Array<Record<string, unknown>>) => arr.map((h, i) => {
      if (i !== arr.length - 1) return h;
      const next: Record<string, unknown> = { ...h, pinterest: pinPct };
      for (const c of catsWithPct) next[c.name] = c.pct;
      return next;
    });
    const objectives = d.objectives.map((o) => ({
      ...o,
      pct: o.target > 0 ? Math.min(100, Math.round((o.current / o.target) * 100)) : 0,
    }));
    return {
      ...d,
      overallPct: overall,
      pinterest: { ...d.pinterest, pct: pinPct },
      history: updateToday(d.history),
      monthlyHistory: updateToday(d.monthlyHistory),
      objectives,
      categories: catsWithPct,
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
          const pct = tasks.length > 0 ? Math.min(100, Math.round((doneCount / tasks.length) * 100)) : 0;
          return { ...c, tasks, doneCount, remaining: Math.max(0, tasks.length - doneCount), pct, dailyTarget: tasks.length };
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
          return { ...c, tasks };
        }),
      }));
      return {};
    },
  });

  const editTask = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) =>
      fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) }).then((r) => r.json()),
    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => recompute({
        ...prev,
        categories: prev.categories.map((c) => ({
          ...c,
          tasks: c.tasks.map((t) => t.id === id ? { ...t, title } : t),
        })),
      }));
      toast({ title: "Task updated" });
      return {};
    },
  });

  const addCategory = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      fetch(`/api/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onMutate: async (body) => {
      const tempId = `temp-cat-${Date.now()}`;
      const taskList = (body.tasks as string[]) || [];
      const tempTasks = taskList.map((title, i) => ({ id: `temp-task-${tempId}-${i}`, title, done: false }));
      const tempCat: Category = {
        id: tempId, name: body.name as string, dailyTarget: taskList.length,
        color: (body.color as string) || "violet", icon: "FileText",
        doneCount: 0, remaining: taskList.length, pct: 0, tasks: tempTasks,
      };
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => recompute({ ...prev, categories: [...prev.categories, tempCat] }));
      toast({ title: "Category added!" + (taskList.length > 0 ? ` (${taskList.length} tasks)` : "") });
      setAddCatOpen(false);
      return { tempId };
    },
    onSuccess: async (created: Category, body, ctx) => {
      if (!ctx?.tempId) return;
      // Create tasks on server if provided
      const taskList = (body.tasks as string[]) || [];
      // First update category in local state
      updateData((prev) => recompute({
        ...prev,
        categories: prev.categories.map((c) => c.id === ctx.tempId ? { ...created, tasks: c.tasks, doneCount: 0, remaining: c.tasks.length, pct: 0, dailyTarget: c.tasks.length } : c),
      }));
      // Then create each task on server (background, non-blocking)
      for (let i = 0; i < taskList.length; i++) {
        try {
          const res = await fetch(`/api/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId: created.id, title: taskList[i] }) });
          const task = await res.json();
          // Update temp task ID with real ID
          updateData((prev) => recompute({
            ...prev,
            categories: prev.categories.map((c) => c.id === ctx.tempId ? {
              ...c,
              tasks: c.tasks.map((t, ti) => ti === i ? { id: task.id, title: t.title, done: t.done } : t),
            } : c),
          }));
        } catch {}
      }
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => fetch(`/api/categories/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => recompute({ ...prev, categories: prev.categories.filter((c) => c.id !== id) }));
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
          history: prev.history.map((h) => ({ ...h, pinterest: 0, blog: 0, patterns: 0 })),
          monthlyHistory: prev.monthlyHistory.map((h) => ({ ...h, pinterest: 0, blog: 0, patterns: 0 })),
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

  // ---- Objectives CRUD ----
  const [rewardPopup, setRewardPopup] = React.useState<{ title: string; desc: string } | null>(null);
  const addObjective = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      fetch(`/api/objectives`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onMutate: async (body) => {
      const tempId = `temp-obj-${Date.now()}`;
      const tempObj: Objective = {
        id: tempId, title: body.title as string, target: (body.target as number) || 100, current: 0,
        unit: (body.unit as string) || "", deadline: (body.deadline as string) || null,
        category: (body.category as string) || "Pinterest", achieved: false, achievedAt: null,
        pct: 0, daysLeft: null,
      };
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => ({ ...prev, objectives: [...prev.objectives, tempObj] }));
      toast({ title: "Objective added!" });
      return { tempId };
    },
    onSuccess: (created: Objective, _v, ctx) => {
      if (!ctx?.tempId) return;
      updateData((prev) => ({
        ...prev,
        objectives: prev.objectives.map((o) => o.id === ctx.tempId ? {
          ...created,
          pct: created.target > 0 ? Math.min(100, Math.round((created.current / created.target) * 100)) : 0,
          daysLeft: created.deadline ? Math.ceil((new Date(created.deadline).getTime() - Date.now()) / 86400000) : null,
        } : o),
      }));
    },
  });

  const updateObjectiveProgress = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: number }) =>
      fetch(`/api/objectives/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current }) }).then((r) => r.json()),
    onMutate: async ({ id, current }) => {
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => {
        const objectives = prev.objectives.map((o) => {
          if (o.id !== id) return o;
          const wasAchieved = o.achieved;
          const nowAchieved = current >= o.target;
          const newObj = { ...o, current, achieved: nowAchieved, achievedAt: nowAchieved && !wasAchieved ? new Date().toISOString() : o.achievedAt, pct: o.target > 0 ? Math.min(100, Math.round((current / o.target) * 100)) : 0 };
          // Trigger reward popup if just achieved
          if (nowAchieved && !wasAchieved) {
            setTimeout(() => setRewardPopup({ title: `🎯 ${o.title}!`, desc: `You reached your goal of ${o.target} ${o.unit}! Keep going 🚀` }), 100);
          }
          return newObj;
        });
        return { ...prev, objectives };
      });
      return {};
    },
  });

  const deleteObjective = useMutation({
    mutationFn: async (id: string) => fetch(`/api/objectives/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["today"] });
      updateData((prev) => recompute({ ...prev, objectives: prev.objectives.filter((o) => o.id !== id) }));
      toast({ title: "Objective removed" });
      return {};
    },
  });

  // Pre-warm API routes on mount (no daily-reset server call — that causes data loss on refresh)
  // Daily reset is done CLIENT-SIDE: check lastResetDate in localStorage
  React.useEffect(() => {
    // Client-side daily reset: if new day, uncheck all tasks in localStorage
    try {
      const today = new Date().toISOString().split("T")[0];
      const lastReset = localStorage.getItem("content-os-last-reset");
      if (lastReset && lastReset !== today) {
        // New day — uncheck all tasks, save progress to history
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const d = JSON.parse(cached);
          // Save yesterday's progress to history
          if (d.history && d.history.length > 0) {
            // Already saved by server on last visit
          }
          // Uncheck all tasks
          d.categories = (d.categories || []).map((c) => ({
            ...c,
            tasks: (c.tasks || []).map((t) => ({ ...t, done: false })),
            doneCount: 0,
            remaining: (c.tasks || []).length,
            pct: 0,
          }));
          // Reset Pinterest pins (but keep doneThisCycle)
          if (d.pinterest) {
            d.pinterest.accounts = (d.pinterest.accounts || []).map((a) => ({
              ...a,
              pinsCompleted: a.done ? a.pinsCompleted : 0,
            }));
            if (d.pinterest.accountOfDay) {
              d.pinterest.accountOfDay.pinsCompleted = 0;
            }
            d.pinterest.pct = 0;
          }
          d.overallPct = 0;
          // Update history today point to 0
          if (d.history) d.history[d.history.length - 1] = { ...d.history[d.history.length - 1], pinterest: 0 };
          if (d.monthlyHistory) d.monthlyHistory[d.monthlyHistory.length - 1] = { ...d.monthlyHistory[d.monthlyHistory.length - 1], pinterest: 0 };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
          localStorage.setItem("content-os-last-reset", today);
          setLocalData(d);
        }
      } else if (!lastReset) {
        localStorage.setItem("content-os-last-reset", today);
      }
    } catch {}

    // Pre-warm API routes
    const warm = async () => {
      await Promise.allSettled([
        fetch("/api/today"),
        fetch("/api/categories"),
        fetch("/api/pinterest/accounts"),
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
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-zinc-700 bg-zinc-800 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 text-zinc-300 text-xs"
              onClick={onLogout}
              title="Sign out"
            >
              <LogOut className="h-3 w-3" /> Logout
            </Button>
          </div>
        </header>

        {/* ============ 1. HERO: TODAY'S SNAPSHOT ============ */}
        <Card className="mb-5 border-zinc-800 bg-gradient-to-br from-violet-500/15 via-zinc-900/60 to-zinc-900/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider text-violet-300">Today's Snapshot</p>
              <p className="text-xs text-zinc-500 mt-0.5">{data?.dateLabel ?? "Today"}</p>
            </div>
            <div className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold tabular-nums", overallPct >= 100 ? "bg-emerald-500/15 text-emerald-300" : overallPct >= 50 ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300")}>
              {overallPct}%
            </div>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className={cn("h-full rounded-full transition-all duration-500", overallPct >= 100 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : overallPct >= 50 ? "bg-gradient-to-r from-amber-500 to-orange-400" : "bg-gradient-to-r from-rose-500 to-pink-400")} style={{ width: `${overallPct}%` }} />
          </div>
          {/* Quick stats row */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-zinc-800/40 p-2.5">
              <p className="text-[10px] uppercase text-zinc-500 font-medium">Pins</p>
              <p className="text-lg font-bold text-violet-300 tabular-nums">{data?.pinterest.accountOfDay ? `${data.pinterest.accountOfDay.pinsCompleted}/${data.pinterest.accountOfDay.pinsPerBatch}` : "—"}</p>
            </div>
            <div className="rounded-lg bg-zinc-800/40 p-2.5">
              <p className="text-[10px] uppercase text-zinc-500 font-medium">Categories</p>
              <p className="text-lg font-bold text-sky-300 tabular-nums">{data?.categories.length ?? 0}</p>
            </div>
            <div className="rounded-lg bg-zinc-800/40 p-2.5">
              <p className="text-[10px] uppercase text-zinc-500 font-medium">Objectives</p>
              <p className="text-lg font-bold text-emerald-300 tabular-nums">{(data?.objectives ?? []).filter(o => o.achieved).length}/{(data?.objectives ?? []).length}</p>
            </div>
            <div className="rounded-lg bg-zinc-800/40 p-2.5">
              <p className="text-[10px] uppercase text-zinc-500 font-medium">Streak</p>
              <p className="text-lg font-bold text-amber-300 tabular-nums">{data?.streak.current ?? 0}d 🔥</p>
            </div>
          </div>
        </Card>

        {/* ============ 2. PINTEREST (50%) + EXECUTION STATES (50%) ============ */}
        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          {/* LEFT: Pinterest — ultra simple: account + checkbox */}
          <Card className="border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="h-5 w-5 text-violet-400" />
              <h2 className="text-sm font-bold">Pinterest</h2>
              <Badge variant="outline" className="ml-auto border-zinc-700 text-zinc-400 text-[10px]">{data?.pinterest.accountsDone ?? 0}/{data?.pinterest.totalAccounts ?? 0} done</Badge>
              <Button size="sm" variant="ghost" className="h-7 text-zinc-400 hover:text-zinc-200 px-2" onClick={() => setManageAccOpen(true)}><Settings className="h-3.5 w-3.5" /></Button>
            </div>
            {isLoading || !data ? <Skeleton className="h-24 bg-zinc-800" /> : (
              <div className="flex flex-col gap-3">
                {/* Account selector */}
                <div>
                  <Label className="text-[10px] uppercase text-zinc-500 font-medium mb-1.5 block">Account</Label>
                  {data.pinterest.accountOfDay ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-bold text-violet-200">{data.pinterest.accountOfDay.name}</span>
                      <button onClick={() => setAccSwitcherOpen(!accSwitcherOpen)} className="text-[10px] text-violet-300 hover:text-violet-100 underline shrink-0">change</button>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 py-2 text-center">All done! 🎉 Cycle resets tomorrow.</p>
                  )}
                  {accSwitcherOpen && (
                    <div className="mt-2 flex flex-col gap-1 rounded-lg border border-zinc-700 bg-zinc-800/80 p-1.5 max-h-32 overflow-y-auto">
                      {data.pinterest.accounts.filter((a) => !a.done).map((a) => (
                        <button key={a.id} onClick={() => { selectAccount.mutate(a.id); setAccSwitcherOpen(false); }} className="text-left text-xs text-zinc-300 hover:bg-violet-500/10 hover:text-violet-200 rounded px-2 py-1.5">{a.name}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Done checkbox — the ONLY action */}
                {data.pinterest.accountOfDay && (
                  <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-3 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors" onClick={() => doneAccount.mutate(data.pinterest.accountOfDay!.id)}>
                    <span className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-zinc-600 hover:border-emerald-500 transition-colors shrink-0">
                      <Check className="h-4 w-4 text-emerald-500 opacity-0 hover:opacity-100" />
                    </span>
                    <div>
                      <span className="text-sm font-medium text-zinc-200">Mark as done</span>
                      <p className="text-[10px] text-zinc-500">Account locks until cycle completes</p>
                    </div>
                  </label>
                )}

                {/* Completed accounts */}
                {data.pinterest.accounts.filter((a) => a.done).length > 0 && (
                  <div className="mt-1 pt-2 border-t border-zinc-800">
                    <p className="text-[10px] uppercase text-zinc-600 font-bold mb-1.5">Done ({data.pinterest.accounts.filter(a => a.done).length})</p>
                    <div className="flex flex-col gap-1">
                      {data.pinterest.accounts.filter((a) => a.done).map((a) => (
                        <div key={a.id} className="flex items-center gap-2 text-xs text-zinc-600 opacity-60">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" /><span className="line-through flex-1 truncate">{a.name}</span>
                          <button onClick={() => unlockAccount.mutate(a.id)} title="Unlock" className="hover:text-violet-400">🔓</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* RIGHT: Execution States — chart + daily states */}
          <Card className="border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-violet-400" />
                <h2 className="text-sm font-bold">Execution States</h2>
              </div>
              {!isLoading && data && (
                <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/50 p-0.5">
                  <button onClick={() => setChartView("weekly")} className={cn("px-2.5 py-1 text-[11px] font-medium rounded-md transition-all", chartView === "weekly" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-zinc-200")}>Weekly</button>
                  <button onClick={() => setChartView("monthly")} className={cn("px-2.5 py-1 text-[11px] font-medium rounded-md transition-all", chartView === "monthly" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-zinc-200")}>Monthly</button>
                </div>
              )}
            </div>
            {isLoading || !data ? <Skeleton className="h-48 bg-zinc-800" /> : data.categories.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center gap-2">
                <Activity className="h-8 w-8 text-zinc-700" />
                <p className="text-sm text-zinc-500">Add categories to see chart</p>
              </div>
            ) : (
              <DynamicChart data={chartView === "weekly" ? data.history : data.monthlyHistory} categories={data.categories} view={chartView} />
            )}
            {/* Daily states dots */}
            {!isLoading && data && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Last 7 days</span>
                  <div className="flex items-center gap-2 text-[9px] text-zinc-500">
                    <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> ok</span>
                    <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> mid</span>
                    <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-zinc-600" /> none</span>
                  </div>
                </div>
                <div key={"daily-" + JSON.stringify(data.history[data.history.length-1] || {})} className="flex items-center justify-between gap-1">
                  {data.history.map((h, i) => {
                    const values = [Number(h.pinterest) || 0, ...data.categories.map((c) => Number(h[c.name]) || 0)];
                    const avg = values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
                    const isToday = i === data.history.length - 1;
                    const state = avg >= 90 ? "perfect" : avg >= 30 ? "partial" : "none";
                    const dotColor = state === "perfect" ? "bg-emerald-500" : state === "partial" ? "bg-amber-500" : "bg-zinc-600";
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[9px] text-zinc-500">{String(h.label)}</span>
                        <span className={cn("h-7 w-7 rounded-full transition-all", dotColor, isToday && "ring-2 ring-violet-400 ring-offset-1 ring-offset-zinc-900")} />
                        <span className={cn("text-[9px] font-bold", state === "perfect" ? "text-emerald-400" : state === "partial" ? "text-amber-400" : "text-zinc-500")}>{avg}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ============ 3. SMART TASK BOARD ============ */}
        <Card className="mb-5 border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
          {/* Header with progress ring */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-sky-400" />
              <h2 className="text-sm font-bold">Today's Tasks</h2>
            </div>
            {(() => {
              const allTasks = (data?.categories ?? []).flatMap((c) => c.tasks);
              const doneCount = allTasks.filter((t) => t.done).length;
              const total = allTasks.length;
              const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
              return (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 tabular-nums">{doneCount}/{total}</span>
                  {/* Circular progress ring */}
                  <div className="relative h-9 w-9">
                    <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#27272a" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke={pct >= 100 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#f43f5e"} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 94.2} 94.2`} className="transition-all duration-500" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums text-zinc-300">{pct}%</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Quick Add Bar */}
          <div className="flex items-center gap-2 mb-3">
            {/* Task input */}
            <input
              value={quickTaskText}
              onChange={(e) => setQuickTaskText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && quickTaskText.trim()) { handleQuickAdd(); } }}
              placeholder="Add a task... + Enter"
              className="flex-1 h-10 text-sm bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 outline-none text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/40"
              autoFocus
            />
            {/* Tag input — type existing or new tag name */}
            <div className="relative shrink-0">
              <input
                value={tagInput}
                onChange={(e) => { setTagInput(e.target.value); setQuickTaskTag(""); setTagDropdownOpen(true); }}
                onFocus={() => setTagDropdownOpen(true)}
                onBlur={() => setTimeout(() => setTagDropdownOpen(false), 150)}
                onKeyDown={(e) => { if (e.key === "Enter" && quickTaskText.trim()) { handleQuickAdd(); } }}
                placeholder="tag..."
                className="h-10 w-24 text-xs bg-zinc-800/60 border border-zinc-700 rounded-lg px-2.5 outline-none text-zinc-300 placeholder:text-zinc-600 focus:border-violet-500/40"
              />
              {/* Dropdown of existing tags */}
              {tagDropdownOpen && (data?.categories ?? []).length > 0 && (
                <div className="absolute top-full right-0 mt-1 z-20 w-40 rounded-lg border border-zinc-700 bg-zinc-800/95 backdrop-blur p-1 max-h-40 overflow-y-auto shadow-xl">
                  {(data?.categories ?? []).filter((c) => !tagInput || c.name.toLowerCase().includes(tagInput.toLowerCase())).map((c) => {
                    const colors = COLOR_MAP[c.color] ?? COLOR_MAP.violet;
                    return (
                      <button
                        key={c.id}
                        onMouseDown={(e) => { e.preventDefault(); setTagInput(c.name); setQuickTaskTag(c.id); setTagDropdownOpen(false); }}
                        className="flex items-center gap-1.5 w-full text-left text-xs text-zinc-300 hover:bg-zinc-700/50 rounded px-2 py-1.5"
                      >
                        <span className={cn("h-2 w-2 rounded-full", colors.bar)} /> {c.name}
                      </button>
                    );
                  })}
                  {tagInput.trim() && !(data?.categories ?? []).some((c) => c.name.toLowerCase() === tagInput.trim().toLowerCase()) && (
                    <button
                      onMouseDown={(e) => { e.preventDefault(); setQuickTaskTag(""); setTagDropdownOpen(false); }}
                      className="flex items-center gap-1.5 w-full text-left text-xs text-violet-300 hover:bg-violet-500/10 rounded px-2 py-1.5 border-t border-zinc-700 mt-1"
                    >
                      <Plus className="h-3 w-3" /> Create "{tagInput.trim()}"
                    </button>
                  )}
                </div>
              )}
            </div>
            {quickTaskText.trim() && (
              <button onClick={handleQuickAdd} className="h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium shrink-0">Add</button>
            )}
          </div>

          {/* Tag filter pills */}
          {(data?.categories ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button onClick={() => setTaskFilter("all")} className={cn("rounded-full px-2.5 py-1 text-[10px] font-medium border transition-all", taskFilter === "all" ? "border-violet-500/50 bg-violet-500/15 text-violet-200" : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200")}>All</button>
              {(data?.categories ?? []).map((c) => {
                const colors = COLOR_MAP[c.color] ?? COLOR_MAP.violet;
                return (
                  <button key={c.id} onClick={() => setTaskFilter(taskFilter === c.id ? "all" : c.id)} className={cn("rounded-full px-2.5 py-1 text-[10px] font-medium border transition-all", taskFilter === c.id ? colors.chip : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200")}>
                    {c.name} ({c.tasks.filter((t) => !t.done).length})
                  </button>
                );
              })}
            </div>
          )}

          {/* Task list */}
          {isLoading ? <Skeleton className="h-32 bg-zinc-800" /> : (() => {
            const allTasks = (data?.categories ?? []).flatMap((c) => c.tasks.map((t) => ({ ...t, categoryId: c.id, categoryName: c.name, categoryColor: c.color })));
            const filtered = taskFilter === "all" ? allTasks : allTasks.filter((t) => t.categoryId === taskFilter);
            const undone = filtered.filter((t) => !t.done);
            const done = filtered.filter((t) => t.done);

            if (allTasks.length === 0) {
              return (
                <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">No tasks yet</p>
                  <p className="text-xs text-zinc-600 mt-1">Type above to add your first task — add a tag to organize (Blog, Pinterest, Gym, Food...)</p>
                </div>
              );
            }

            return (
              <div className="flex flex-col gap-0.5">
                {/* Undone tasks */}
                {undone.map((t) => {
                  const colors = COLOR_MAP[t.categoryColor] ?? COLOR_MAP.violet;
                  return (
                    <div key={t.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-zinc-800/40 transition-colors">
                      <button onClick={() => toggleTask.mutate(t.id)} className="shrink-0">
                        <Circle className="h-5 w-5 text-zinc-600 hover:text-emerald-400 transition-colors" />
                      </button>
                      <span onClick={() => { setEditingTaskId(t.id); setEditingTaskText(t.title); }} className="text-sm flex-1 cursor-pointer text-zinc-200 hover:text-white truncate">
                        {editingTaskId === t.id ? (
                          <input
                            autoFocus
                            value={editingTaskText}
                            onChange={(e) => setEditingTaskText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { editTask.mutate({ id: editingTaskId, title: editingTaskText }); setEditingTaskId(null); } if (e.key === "Escape") setEditingTaskId(null); }}
                            onBlur={() => { if (editingTaskId) { editTask.mutate({ id: editingTaskId, title: editingTaskText }); setEditingTaskId(null); } }}
                            className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 outline-none w-full"
                          />
                        ) : t.title}
                      </span>
                      <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border shrink-0", colors.chip)}>{t.categoryName}</span>
                      <button onClick={() => deleteTask.mutate(t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 shrink-0 transition-all"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  );
                })}
                {/* Done tasks */}
                {done.length > 0 && (
                  <>
                    <div className="text-[10px] uppercase text-zinc-600 font-bold pt-2 pb-1">✓ Completed ({done.length})</div>
                    {done.map((t) => {
                      const colors = COLOR_MAP[t.categoryColor] ?? COLOR_MAP.violet;
                      return (
                        <div key={t.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 opacity-50 hover:opacity-70 transition-opacity">
                          <button onClick={() => toggleTask.mutate(t.id)} className="shrink-0"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></button>
                          <span className="text-sm flex-1 line-through text-zinc-500 truncate">{t.title}</span>
                          <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border shrink-0", colors.chip)}>{t.categoryName}</span>
                          <button onClick={() => deleteTask.mutate(t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 shrink-0 transition-all"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })()}
        </Card>

        {/* ============ 4. OBJECTIVES (OBJECTIF STATES) ============ */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-violet-400" />
              <h2 className="text-sm font-bold">Objectives</h2>
              <span className="text-xs text-zinc-500">({data?.objectives.filter(o => o.achieved).length ?? 0}/{data?.objectives.length ?? 0} achieved)</span>
            </div>
            <Button size="sm" variant="outline" className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 h-8" onClick={() => setAddObjOpen(true)}><PlusIcon className="h-4 w-4" /> Add Objective</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {isLoading ? <Skeleton className="h-24 bg-zinc-800" /> : data?.objectives.length === 0 ? (
              <div className="sm:col-span-2 rounded-lg border border-dashed border-zinc-800 p-6 text-center">
                <Target className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">No objectives yet</p>
                <p className="text-xs text-zinc-600 mt-1">Add goals like "100 pins this month" — track progress and earn rewards 🎯</p>
              </div>
            ) : data?.objectives.map((o) => {
              const colors = COLOR_MAP[o.category.toLowerCase()] ?? COLOR_MAP.violet;
              return (
                <Card key={o.id} className={cn("border-zinc-800 backdrop-blur p-4 flex flex-col gap-2", o.achieved && "border-emerald-500/40 bg-emerald-500/5")}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {o.achieved && <span className="text-base">🏆</span>}
                      <span className="text-sm font-semibold text-zinc-100 truncate">{o.title}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {o.achieved ? <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px]">DONE</Badge>
                        : o.daysLeft !== null && o.daysLeft <= 3 && o.daysLeft >= 0 ? <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px]">{o.daysLeft}d</Badge> : null}
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-500 hover:text-rose-400" onClick={() => deleteObjective.mutate(o.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                      <div className={cn("h-full rounded-full transition-all", o.achieved ? "bg-emerald-500" : colors.bar)} style={{ width: `${o.pct}%` }} />
                    </div>
                    <span className={cn("text-sm font-bold tabular-nums", o.achieved ? "text-emerald-400" : colors.text)}>{o.pct}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{o.current} / {o.target} {o.unit}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateObjectiveProgress.mutate({ id: o.id, current: Math.max(0, o.current - 1) })} className="h-6 w-6 rounded border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200">−</button>
                      <button onClick={() => updateObjectiveProgress.mutate({ id: o.id, current: o.current + 1 })} className="h-6 w-6 rounded border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200">+</button>
                      <button onClick={() => updateObjectiveProgress.mutate({ id: o.id, current: o.current + 5 })} className="h-6 px-1.5 rounded border border-zinc-700 bg-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200">+5</button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ============ 5.5 TASKS NOT COMPLETED (board) ============ */}
        {!isLoading && data && data.categories.some((c) => c.tasks.some((t) => !t.done)) && (
          <Card className="mb-5 border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-amber-400" />
              <h2 className="text-sm font-bold">Tasks Not Completed</h2>
              <span className="text-xs text-zinc-500">({data.categories.reduce((s, c) => s + c.tasks.filter((t) => !t.done).length, 0)} remaining)</span>
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {data.categories.map((c) => {
                const undone = c.tasks.filter((t) => !t.done);
                if (undone.length === 0) return null;
                const colors = COLOR_MAP[c.color] ?? COLOR_MAP.violet;
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className={cn("inline-flex h-5 items-center rounded border px-1.5 text-[9px] font-bold uppercase shrink-0", colors.chip)}>{c.name}</span>
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      {undone.map((t) => (
                        <span key={t.id} className="inline-flex items-center gap-1 rounded-md bg-zinc-800/60 px-2 py-1 text-[11px] text-zinc-400">
                          <Circle className="h-2.5 w-2.5 text-zinc-600" /> {t.title}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ============ 6. REMINDERS + REWARDS ============ */}
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <Card className="border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-sky-400" />
              <span className="text-sm font-semibold">Reminders</span>
            </div>
            {isLoading ? <Skeleton className="h-32 bg-zinc-800" /> : (
              <div className="flex flex-col gap-2">
                {(data?.reminders ?? []).map((r, i) => (
                  <div key={i} className={cn("flex items-start gap-2 rounded-lg border p-2.5 text-sm",
                    r.severity === "good" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300" :
                    r.severity === "warn" ? "border-amber-500/30 bg-amber-500/5 text-amber-300" :
                    "border-zinc-700 bg-zinc-800/50 text-zinc-300")}>
                    <span className={cn("mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full", r.severity === "good" ? "bg-emerald-400" : r.severity === "warn" ? "bg-amber-400" : "bg-sky-400")} />
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
                {(data?.rewards ?? []).map((rw, i) => (
                  <div key={i} className={cn("flex items-center gap-3 rounded-lg border p-2.5", rw.unlocked ? "border-amber-500/30 bg-amber-500/5" : "border-zinc-800 bg-zinc-800/30 opacity-50")}>
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

        {/* ============ 7. HISTORIQUE (at bottom) ============ */}
        {!isLoading && data && (
          <Card className="mb-5 border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-violet-400" />
              <h2 className="text-sm font-bold">Historique · last 30 days</h2>
              <span className="ml-auto text-[10px] text-zinc-500">scroll →</span>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-800">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur">
                  <tr className="border-b border-zinc-800 text-left text-zinc-500">
                    <th className="py-2 px-3 font-medium">Date</th>
                    <th className="py-2 px-2 font-medium text-center">Pins</th>
                    {data.categories.map((c) => (
                      <th key={c.id} className="py-2 px-2 font-medium text-center" style={{ color: COLOR_HEX[c.color] ?? "#a1a1aa" }}>{c.name}</th>
                    ))}
                    <th className="py-2 px-2 font-medium text-center">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.monthlyHistory].reverse().map((h, idx) => {
                    const pin = Number(h.pinterest) || 0;
                    const catVals = data.categories.map((c) => Number(h[c.name]) || 0);
                    const allVals = [pin, ...catVals];
                    const avg = allVals.length > 0 ? Math.round(allVals.reduce((s, v) => s + v, 0) / allVals.length) : 0;
                    const isToday = idx === 0;
                    return (
                      <tr key={idx} className={cn("border-b border-zinc-800/50", isToday && "bg-violet-500/5")}>
                        <td className="py-1.5 px-3 text-zinc-400 font-medium">
                          {String(h.label)} {isToday && <span className="text-violet-300 text-[9px] ml-1">TODAY</span>}
                        </td>
                        <td className="py-1.5 px-2 text-center tabular-nums text-zinc-300">{pin}%</td>
                        {data.categories.map((c) => {
                          const v = Number(h[c.name]) || 0;
                          return <td key={c.id} className="py-1.5 px-2 text-center tabular-nums" style={{ color: v > 0 ? COLOR_HEX[c.color] : "#52525b" }}>{v}%</td>;
                        })}
                        <td className="py-1.5 px-2 text-center tabular-nums font-bold" style={{ color: avg >= 90 ? "#10b981" : avg >= 30 ? "#f59e0b" : "#71717a" }}>{avg}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}


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
      <AddObjectiveDialog open={addObjOpen} onOpenChange={setAddObjOpen} onSubmit={(b) => addObjective.mutate(b)} />
      {/* REWARD POPUP — confetti style when objective achieved */}
      {rewardPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in" onClick={() => setRewardPopup(null)}>
          <div className="relative mx-4 max-w-sm rounded-2xl border border-amber-500/40 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 text-center shadow-2xl shadow-amber-500/20" onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl mb-3 animate-bounce">🎉</div>
            <h3 className="text-xl font-bold text-amber-300 mb-1">{rewardPopup.title}</h3>
            <p className="text-sm text-zinc-300 mb-4">{rewardPopup.desc}</p>
            <div className="text-3xl mb-4">🏆⭐🎯</div>
            <Button className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold" onClick={() => setRewardPopup(null)}>
              Keep going! 🚀
            </Button>
            <button className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-300" onClick={() => setRewardPopup(null)}><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryCard({
  cat, onToggle, onAddTask, onDeleteTask, onEditTask, onDeleteCategory,
}: {
  cat: Category;
  onToggle: (id: string) => void;
  onAddTask: (title: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, title: string) => void;
  onDeleteCategory: () => void;
}) {
  const colors = COLOR_MAP[cat.color] ?? COLOR_MAP.violet;
  const [newTask, setNewTask] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState("");

  const submit = () => {
    if (!newTask.trim()) return;
    onAddTask(newTask.trim());
    setNewTask("");
  };

  const startEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditText(currentTitle);
  };

  const saveEdit = () => {
    if (!editingId || !editText.trim()) { setEditingId(null); return; }
    onEditTask(editingId, editText.trim());
    setEditingId(null);
    setEditText("");
  };

  return (
    <Card className={cn("border-zinc-800 backdrop-blur flex flex-col", colors.bg)}>
      {/* Header: title + progress + delete */}
      <div className="p-3.5 pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-sm font-bold", colors.text)}>{cat.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500 tabular-nums">{cat.doneCount}/{cat.tasks.length}</span>
            <span className={cn("text-xs font-bold tabular-nums", colors.text)}>{cat.pct}%</span>
            <button onClick={onDeleteCategory} className="text-zinc-600 hover:text-rose-400 transition-colors"><Trash2 className="h-3 w-3" /></button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className={cn("h-full rounded-full transition-all duration-300", colors.bar)} style={{ width: `${cat.pct}%` }} />
        </div>
      </div>

      {/* Tasks list */}
      <div className="flex-1 px-3.5 pb-2 min-h-[2rem]">
        <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
          {cat.tasks.length === 0 && <p className="text-[11px] text-zinc-600 py-1.5 text-center italic">No tasks — type below to add</p>}
          {cat.tasks.map((t) => (
            <div key={t.id} className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-zinc-800/40">
              <button onClick={() => onToggle(t.id)} className="shrink-0">
                {t.done
                  ? <CheckCircle2 className={cn("h-4 w-4", colors.text)} />
                  : <Circle className="h-4 w-4 text-zinc-600 hover:text-zinc-400" />}
              </button>
              {editingId === t.id ? (
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") { setEditingId(null); setEditText(""); } }}
                  onBlur={saveEdit}
                  className="flex-1 text-sm bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 outline-none text-zinc-100"
                />
              ) : (
                <span
                  onClick={() => startEdit(t.id, t.title)}
                  className={cn("text-sm flex-1 truncate cursor-pointer", t.done ? "line-through text-zinc-500" : "text-zinc-200")}
                >{t.title}</span>
              )}
              <button onClick={() => onDeleteTask(t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-all shrink-0">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Always-visible add task input */}
      <div className="p-2.5 border-t border-zinc-800/60">
        <div className="flex items-center gap-1.5">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newTask.trim()) { onAddTask(newTask.trim()); setNewTask(""); } }}
            placeholder="Add task + Enter"
            className="flex-1 h-8 text-sm bg-zinc-800/60 border border-zinc-700 rounded px-2.5 outline-none text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/40"
          />
          {newTask.trim() && (
            <button onClick={() => { onAddTask(newTask.trim()); setNewTask(""); }} className="h-8 w-8 rounded bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shrink-0"><Plus className="h-4 w-4" /></button>
          )}
        </div>
      </div>
    </Card>
  );
}

function AddCategoryDialog({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (b: Record<string, unknown>) => void }) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("violet");
  const [tasks, setTasks] = React.useState("");

  React.useEffect(() => { if (open) { setName(""); setColor("violet"); setTasks(""); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader><DialogTitle className="text-zinc-100">Add Category</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-zinc-400">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pinterest, Blog, Money, Gym, Food..." className="bg-zinc-800 border-zinc-700" autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-zinc-400">Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className={cn("h-8 w-8 rounded-full border-2 transition-all", COLOR_MAP[c].bar, color === c ? "border-white scale-110" : "border-transparent")} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-zinc-400">Tasks (one per line, optional)</Label>
            <textarea
              value={tasks}
              onChange={(e) => setTasks(e.target.value)}
              placeholder={"Write article\nSEO optimize\nAdd images\n..."}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none min-h-[80px] resize-y"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-700 bg-zinc-800 text-zinc-200" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-violet-600 hover:bg-violet-500 text-white" disabled={!name} onClick={() => {
            const taskList = tasks.split("\n").map(t => t.trim()).filter(Boolean);
            onSubmit({ name, color, tasks: taskList });
          }}>Add Category</Button>
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

// DYNAMIC CHART — renders area for pinterest + each category dynamically
// Each category uses its OWN color (chosen at creation), pinterest line = violet
function getColorForKey(key: string, categories: Category[]): string {
  if (key === "pinterest") return COLOR_HEX.violet; // pinterest (pins) line always violet
  const cat = categories.find((c) => c.name === key);
  return cat ? (COLOR_HEX[cat.color] ?? "#8b5cf6") : "#8b5cf6";
}
function DynamicChart({ data, categories, view }: { data: Array<Record<string, unknown>>; categories: Category[]; view: string }) {
  // Build keys: pinterest (pins) + categories, but skip any category named "Pinterest"/"pinterest" to avoid duplicates
  const filteredCats = categories.filter((c) => c.name.toLowerCase() !== "pinterest" && c.name.toLowerCase() !== "pins");
  const keys = ["pinterest", ...filteredCats.map((c) => c.name)];
  // Normalize data: ensure every point has all keys (default 0) so chart renders consistently
  const normalizedData = data.map((h) => {
    const next: Record<string, unknown> = { ...h };
    for (const k of keys) if (next[k] === undefined) next[k] = 0;
    return next;
  });
  const today = normalizedData[normalizedData.length - 1] || {};
  const keyStr = keys.map((k) => `${k}=${today[k] ?? 0}`).join("-");
  return (
    <div className="h-56" style={{ minHeight: 224 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart key={view + "-" + keyStr} data={normalizedData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <defs>
            {keys.map((k) => {
              const color = getColorForKey(k, categories);
              return (
                <linearGradient key={k} id={"g-" + k.replace(/[^a-zA-Z0-9]/g, "")} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a1a1aa" }} stroke="#3f3f46" interval={view === "monthly" ? 2 : 0} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#a1a1aa" }} stroke="#3f3f46" unit="%" />
          <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid #3f3f46", background: "#18181b", color: "#f4f4f5", fontSize: "0.75rem" }} />
          <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
          {keys.map((k) => {
            const color = getColorForKey(k, categories);
            return <Area key={k} type="monotone" dataKey={k} stroke={color} strokeWidth={2} fill={"url(#g-" + k.replace(/[^a-zA-Z0-9]/g, "") + ")"} name={k === "pinterest" ? "Pins (account)" : k} isAnimationActive={false} />;
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function AddObjectiveDialog({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (b: Record<string, unknown>) => void }) {
  const [title, setTitle] = React.useState("");
  const [target, setTarget] = React.useState("100");
  const [unit, setUnit] = React.useState("");
  const [category, setCategory] = React.useState("violet");
  const [deadline, setDeadline] = React.useState("");
  React.useEffect(() => { if (open) { setTitle(""); setTarget("100"); setUnit(""); setCategory("violet"); setDeadline(""); } }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader><DialogTitle className="text-zinc-100">Add Objective</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-zinc-400">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 100 pins this month, 500 revenue..." className="bg-zinc-800 border-zinc-700" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-zinc-400">Target</Label>
              <Input type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} className="bg-zinc-800 border-zinc-700" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-zinc-400">Unit (optional)</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pins, eur, articles..." className="bg-zinc-800 border-zinc-700" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-zinc-400">Category color</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(COLOR_MAP).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-zinc-400">Deadline (optional)</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="bg-zinc-800 border-zinc-700" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-700 bg-zinc-800 text-zinc-200" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-violet-600 hover:bg-violet-500 text-white" disabled={!title} onClick={() => onSubmit({ title, target: parseInt(target) || 100, unit, category, deadline: deadline || null })}>Add Objective</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
