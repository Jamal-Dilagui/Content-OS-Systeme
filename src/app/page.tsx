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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import {
  CheckCircle2, Circle, Plus, Minus, Image as ImageIcon, Sparkles, Flame, Trophy,
  Bell, Target, Plus as PlusIcon, Trash2, X, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Task = { id: string; title: string; done: boolean };
type Category = {
  id: string; name: string; dailyTarget: number; color: string; icon: string;
  doneCount: number; remaining: number; pct: number; tasks: Task[];
};
type Account = { id: string; name: string; done: boolean; cycle: number; orderIndex: number; pinsCompleted: number; pinsPerBatch: number };
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
  history: Array<{ label: string; date: string; pinterest: number; blog: number; patterns: number; other: number }>;
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
const CHART_COLOR: Record<string, string> = { violet: "#8b5cf6", sky: "#0ea5e9", emerald: "#10b981", amber: "#f59e0b", rose: "#f43f5e", cyan: "#06b6d4" };
const COLOR_OPTIONS = ["violet", "sky", "emerald", "amber", "rose", "cyan"];

export default function Home() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<TodayData>({
    queryKey: ["today"],
    queryFn: async () => {
      const res = await fetch("/api/today");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const [addCatOpen, setAddCatOpen] = React.useState(false);

  const addPin = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) =>
      fetch(`/api/pinterest/accounts/${id}/pins`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delta }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["today"] }),
  });
  const doneAccount = useMutation({
    mutationFn: async (id: string) => fetch(`/api/pinterest/accounts/${id}/done`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["today"] }); toast({ title: "Account done! 🎯", description: "Moving to the next account tomorrow." }); },
  });
  const toggleTask = useMutation({
    mutationFn: async (id: string) => fetch(`/api/tasks/${id}/toggle`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["today"] }),
  });
  const addTask = useMutation({
    mutationFn: async ({ categoryId, title }: { categoryId: string; title: string }) =>
      fetch(`/api/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId, title }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["today"] }),
  });
  const deleteTask = useMutation({
    mutationFn: async (id: string) => fetch(`/api/tasks?id=${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["today"] }),
  });
  const addCategory = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      fetch(`/api/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["today"] }); toast({ title: "Category added!" }); setAddCatOpen(false); },
  });
  const deleteCategory = useMutation({
    mutationFn: async (id: string) => fetch(`/api/categories/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["today"] }); toast({ title: "Category removed" }); },
  });

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
          {/* Streak + rewards summary */}
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
          </div>
        </header>

        {/* OVERALL PROGRESS BAR */}
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

        {/* PINTEREST ACCOUNT OF THE DAY */}
        <Card className="mb-6 border-zinc-800 bg-gradient-to-br from-violet-500/10 via-zinc-900/60 to-zinc-900/60 p-5 backdrop-blur">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-violet-300">Pinterest · Account of the Day</span>
            <Badge variant="outline" className="ml-auto border-zinc-700 text-zinc-400">Cycle {data?.pinterest.cycleNumber ?? 1}</Badge>
          </div>
          {isLoading ? <Skeleton className="h-20 bg-zinc-800" /> : data?.pinterest.accountOfDay ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">{data.pinterest.accountOfDay.name}</h2>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {data.pinterest.accountsDone} / {data.pinterest.totalAccounts} accounts done this cycle
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:w-72">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Pins today</span>
                  <span className="font-bold text-lg tabular-nums">{data.pinterest.accountOfDay.pinsCompleted} / {data.pinterest.accountOfDay.pinsPerBatch}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-zinc-700 bg-zinc-800 hover:bg-zinc-700" onClick={() => addPin.mutate({ id: data.pinterest.accountOfDay!.id, delta: -1 })}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Progress value={data.pinterest.pct} className="h-2.5 flex-1" />
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-zinc-700 bg-zinc-800 hover:bg-zinc-700" onClick={() => addPin.mutate({ id: data.pinterest.accountOfDay!.id, delta: 1 })}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  className="mt-1 bg-violet-600 hover:bg-violet-500 text-white"
                  disabled={doneAccount.isPending}
                  onClick={() => doneAccount.mutate(data.pinterest.accountOfDay!.id)}
                >
                  <CheckCircle2 className="h-4 w-4" /> Mark Done & Rotate
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-zinc-400">No account available.</p>
          )}

          {/* Account rotation strip */}
          {!isLoading && data && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {data.pinterest.accounts.map((a) => (
                <span key={a.id} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border", a.done ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : a.id === data.pinterest.accountOfDay?.id ? "border-violet-500/50 bg-violet-500/15 text-violet-200" : "border-zinc-700 bg-zinc-800/50 text-zinc-400")}>
                  {a.done ? <Check className="h-3 w-3" /> : a.id === data.pinterest.accountOfDay?.id ? <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" /> : <Circle className="h-2.5 w-2.5" />}
                  {a.name}
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* 7-DAY PROGRESS CHART */}
        <Card className="mb-6 border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur">
          <div className="flex items-center gap-2 mb-3">
            <BarChart className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold">7-Day Progress (%)</span>
          </div>
          {isLoading ? <Skeleton className="h-56 bg-zinc-800" /> : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data!.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a1a1aa" }} stroke="#3f3f46" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#a1a1aa" }} stroke="#3f3f46" unit="%" />
                  <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid #3f3f46", background: "#18181b", color: "#f4f4f5", fontSize: "0.75rem" }} />
                  <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                  <Bar dataKey="pinterest" fill="#8b5cf6" name="Pinterest" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="blog" fill="#0ea5e9" name="Blog" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="patterns" fill="#10b981" name="Patterns" radius={[3, 3, 0, 0]} />
                </BarChart>
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
          {/* Reminders */}
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

          {/* Rewards */}
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

        {/* FOOTER */}
        <footer className="mt-8 pb-4 text-center text-xs text-zinc-600">
          Content OS · Single-page process tracker · Stay consistent, ship every day
        </footer>
      </div>

      {/* ADD CATEGORY DIALOG */}
      <AddCategoryDialog open={addCatOpen} onOpenChange={setAddCatOpen} onSubmit={(b) => addCategory.mutate(b)} />
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
