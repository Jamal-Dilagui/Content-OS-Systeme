"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, SectionHeader, EmptyState, PriorityBadge } from "@/components/biz/layout";
import { formatRelative, statusBadgeClass } from "@/lib/format";
import { useNav } from "@/lib/nav-store";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Image, FileText, Package, Facebook, CheckCircle2, Circle, ArrowRight, Zap, Sun, Layers } from "lucide-react";

type DashData = {
  today: {
    accountOfDay: { id: string; name: string; pinsPerBatch: number; pinsCompleted: number; pinsRemaining: number; cycle: number } | null;
    nextAccount: { id: string; name: string } | null;
    tasks: Array<{ id: string; title: string; priority: string; status: string; category: string | null; dueDate: string | null }>;
  };
  month: { pinsPublished: number; articlesPublished: number; productsLaunched: number; postsPublished: number };
  counts: Record<string, number>;
};

export function TodayView() {
  const { setView } = useNav();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<DashData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const toggleTask = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}/toggle`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task updated" });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<CalendarDays className="h-5 w-5" />}
        title="Today"
        description="A focused, limited view of what to do right now. Not a hundred tasks."
      />

      {/* HERO: Focus of the day */}
      <Card className="p-5 gap-3 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Focus of the Day</span>
        </div>
        {isLoading ? <Skeleton className="h-24" /> : data?.today.accountOfDay ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pinterest Account</p>
              <h2 className="text-2xl font-bold">{data.today.accountOfDay.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">Cycle #{data.today.accountOfDay.cycle}</p>
            </div>
            <div className="flex flex-col gap-2 sm:w-64">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pins remaining</span>
                <span className="font-bold text-lg">{data.today.accountOfDay.pinsRemaining}</span>
              </div>
              <Progress value={(data.today.accountOfDay.pinsCompleted / data.today.accountOfDay.pinsPerBatch) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">{data.today.accountOfDay.pinsCompleted} / {data.today.accountOfDay.pinsPerBatch} done</p>
              <Button size="sm" onClick={() => setView("pinterest")} className="mt-1">
                Open Pinterest <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState title="No active account" description="Add a Pinterest account to generate today's focus." />
        )}
      </Card>

      {/* TODAY'S PRODUCTION TARGETS */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TargetCard icon={<Image className="h-4 w-4" />} label="Pins Today" value={isLoading ? "—" : data?.today.accountOfDay?.pinsRemaining ?? 0} sub="to publish" onClick={() => setView("pinterest")} accent="violet" />
        <TargetCard icon={<FileText className="h-4 w-4" />} label="Articles" value={5} sub="target / day" onClick={() => setView("blog")} accent="sky" />
        <TargetCard icon={<Package className="h-4 w-4" />} label="Pattern" value={1} sub="advance today" onClick={() => setView("products")} accent="emerald" />
        <TargetCard icon={<Facebook className="h-4 w-4" />} label="FB Post" value={1} sub="schedule" onClick={() => setView("facebook")} accent="amber" />
      </section>

      {/* THIS MONTH SHIPPED */}
      <Card className="p-4 gap-3">
        <SectionHeader title="This Month — Shipped" description="What you've already produced" icon={<Layers className="h-4 w-4" />} />
        {isLoading ? <Skeleton className="h-20" /> : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ShippedStat icon={<Image className="h-4 w-4" />} label="Pins" value={data!.month.pinsPublished} accent="violet" />
            <ShippedStat icon={<FileText className="h-4 w-4" />} label="Articles" value={data!.month.articlesPublished} accent="sky" />
            <ShippedStat icon={<Package className="h-4 w-4" />} label="Patterns" value={data!.month.productsLaunched} accent="emerald" />
            <ShippedStat icon={<Facebook className="h-4 w-4" />} label="Posts" value={data!.month.postsPublished} accent="amber" />
          </div>
        )}
      </Card>

      {/* PRIORITY TASKS */}
      <Card className="p-4 gap-3">
        <SectionHeader
          title="Priority Tasks"
          description="Highest-impact work — limited to keep you focused"
          icon={<Zap className="h-4 w-4" />}
          actions={<Button size="sm" variant="ghost" onClick={() => setView("tasks")}>All tasks <ArrowRight className="h-3.5 w-3.5" /></Button>}
        />
        {isLoading ? (
          <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : data?.today.tasks.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="h-8 w-8" />} title="No active tasks" description="You're all caught up. Plan tomorrow's work." />
        ) : (
          <div className="flex flex-col gap-1.5">
            {data!.today.tasks.map((t) => {
              const done = t.status === "DONE";
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-accent/50 transition-colors">
                  <button onClick={() => toggleTask.mutate(t.id)} className="shrink-0" disabled={toggleTask.isPending}>
                    {done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${done ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <PriorityBadge priority={t.priority} />
                      {t.category && <span className="text-[10px] text-muted-foreground uppercase">{t.category}</span>}
                      {t.dueDate && (
                        <span className={`text-[10px] ${new Date(t.dueDate) < new Date() ? "text-rose-600 font-medium" : "text-muted-foreground"}`}>
                          {formatRelative(t.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* NEXT */}
      <Card className="p-4 gap-3">
        <SectionHeader title="Tomorrow" description="So you can start fast" icon={<ArrowRight className="h-4 w-4" />} />
        {isLoading ? <Skeleton className="h-16" /> : (
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Image className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Next Pinterest account: <span className="font-semibold">{data?.today.nextAccount?.name ?? "—"}</span></span>
          </div>
        )}
      </Card>
    </div>
  );
}

function TargetCard({ icon, label, value, sub, onClick, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub: string; onClick: () => void; accent: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    sky: "text-sky-600 dark:text-sky-400",
    violet: "text-violet-600 dark:text-violet-400",
  };
  return (
    <button onClick={onClick} className="text-left rounded-lg border p-4 hover:bg-accent/50 transition-colors">
      <div className={`flex items-center gap-1.5 ${colorMap[accent]}`}>
        {icon}
        <span className="text-xs font-medium uppercase">{label}</span>
      </div>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </button>
  );
}

function ShippedStat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    sky: "text-sky-600 dark:text-sky-400",
    violet: "text-violet-600 dark:text-violet-400",
  };
  return (
    <div className="rounded-lg border p-3">
      <div className={`flex items-center gap-1.5 ${colorMap[accent]}`}>
        {icon}
        <span className="text-xs font-medium uppercase">{label}</span>
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
