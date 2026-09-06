"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/biz/stat-card";
import { PageHeader, SectionHeader, StatusBadge, EmptyState } from "@/components/biz/layout";
import { formatNumber, statusBadgeClass } from "@/lib/format";
import { useNav } from "@/lib/nav-store";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  Image, FileText, Package, Facebook, AlertTriangle, ArrowRight, Activity,
  CheckCircle2, LayoutDashboard, ListTodo, Layers,
} from "lucide-react";

type Pipeline = Array<{ state: string; count: number }>;
type DashData = {
  now: string;
  pipelines: { pins: Pipeline; articles: Pipeline; products: Pipeline; posts: Pipeline };
  month: { pinsPublished: number; articlesPublished: number; productsLaunched: number; postsPublished: number };
  today: {
    accountOfDay: { id: string; name: string; pinsPerBatch: number; pinsCompleted: number; pinsRemaining: number; cycle: number } | null;
    nextAccount: { id: string; name: string } | null;
    tasks: Array<{ id: string; title: string; priority: string; status: string; category: string | null; dueDate: string | null }>;
  };
  alerts: Array<{ type: string; severity: string; message: string; action?: string }>;
  months: Array<{ label: string; pins: number; articles: number; products: number }>;
  counts: Record<string, number>;
};

export function CommandCenterView() {
  const { setView } = useNav();
  const { data, isLoading } = useQuery<DashData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Command Center"
        description="See exactly where every piece of content sits in your process — and what to work on next."
      />

      {/* ACCOUNT OF THE DAY + THIS MONTH */}
      <section className="grid gap-3 lg:grid-cols-3">
        {/* Account of the day */}
        <Card className="p-5 gap-3 lg:col-span-1 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pinterest Account of the Day</span>
          </div>
          {isLoading ? <Skeleton className="h-20" /> : data?.today.accountOfDay ? (
            <div>
              <h2 className="text-2xl font-bold">{data.today.accountOfDay.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Cycle #{data.today.accountOfDay.cycle}</p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Today's pins</span>
                  <span className="font-bold">{data.today.accountOfDay.pinsCompleted} / {data.today.accountOfDay.pinsPerBatch}</span>
                </div>
                <Progress value={(data.today.accountOfDay.pinsCompleted / data.today.accountOfDay.pinsPerBatch) * 100} className="h-2.5" />
                <p className="text-xs text-muted-foreground mt-1.5">{data.today.accountOfDay.pinsRemaining} remaining</p>
              </div>
              <Button size="sm" className="mt-3 w-full" onClick={() => setView("pinterest")}>
                Open Pinterest <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <EmptyState title="No active account" description="Add a Pinterest account to start." />
          )}
        </Card>

        {/* This month production */}
        <Card className="p-5 gap-3 lg:col-span-2">
          <SectionHeader title="This Month's Output" description="What you've shipped" icon={<Activity className="h-4 w-4" />} />
          {isLoading ? <Skeleton className="h-24" /> : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat icon={<Image className="h-4 w-4" />} label="Pins Published" value={data!.month.pinsPublished} accent="violet" onClick={() => setView("pinterest")} />
              <MiniStat icon={<FileText className="h-4 w-4" />} label="Articles Published" value={data!.month.articlesPublished} accent="sky" onClick={() => setView("blog")} />
              <MiniStat icon={<Package className="h-4 w-4" />} label="Patterns Launched" value={data!.month.productsLaunched} accent="emerald" onClick={() => setView("products")} />
              <MiniStat icon={<Facebook className="h-4 w-4" />} label="Posts Published" value={data!.month.postsPublished} accent="amber" onClick={() => setView("facebook")} />
            </div>
          )}
        </Card>
      </section>

      {/* PIPELINE OVERVIEWS — the core "state tracker" */}
      <section className="grid gap-3 lg:grid-cols-2">
        <PipelineCard
          title="Pinterest Pipeline"
          icon={<Image className="h-4 w-4" />}
          data={data?.pipelines.pins}
          isLoading={isLoading}
          total={data?.counts.totalPins}
          onOpen={() => setView("pinterest")}
        />
        <PipelineCard
          title="Blog Pipeline"
          icon={<FileText className="h-4 w-4" />}
          data={data?.pipelines.articles}
          isLoading={isLoading}
          total={data?.counts.totalArticles}
          onOpen={() => setView("blog")}
        />
        <PipelineCard
          title="PDF Patterns Pipeline"
          icon={<Package className="h-4 w-4" />}
          data={data?.pipelines.products}
          isLoading={isLoading}
          total={data?.counts.totalProducts}
          onOpen={() => setView("products")}
        />
        <PipelineCard
          title="Facebook Pipeline"
          icon={<Facebook className="h-4 w-4" />}
          data={data?.pipelines.posts}
          isLoading={isLoading}
          total={data?.counts.totalPosts}
          onOpen={() => setView("facebook")}
        />
      </section>

      {/* PRODUCTION TREND + ALERTS */}
      <section className="grid gap-3 lg:grid-cols-3">
        <Card className="p-4 gap-3 lg:col-span-2">
          <SectionHeader title="Production Trend" description="Content published per month (last 6 months)" icon={<Layers className="h-4 w-4" />} />
          {isLoading ? <Skeleton className="h-56" /> : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data!.months}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", fontSize: "0.75rem" }} />
                  <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                  <Bar dataKey="pins" fill="#8b5cf6" name="Pins" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="articles" fill="#0ea5e9" name="Articles" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="products" fill="#10b981" name="Patterns" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-4 gap-3">
          <SectionHeader title="Alerts" description="Needs your attention" icon={<AlertTriangle className="h-4 w-4" />} />
          {isLoading ? <Skeleton className="h-56" /> : data!.alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-medium">All clear</p>
              <p className="text-xs text-muted-foreground">No alerts right now</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
              {data!.alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border p-2.5">
                  <span className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${a.severity === "high" ? "bg-rose-500" : a.severity === "medium" ? "bg-amber-500" : "bg-sky-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{a.message}</p>
                    {a.action && <p className="text-xs text-muted-foreground mt-0.5">{a.action}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* TODAY'S TASKS */}
      <section>
        <Card className="p-4 gap-3">
          <SectionHeader
            title="Today's Priority Tasks"
            description="Limited to keep you focused"
            icon={<ListTodo className="h-4 w-4" />}
            actions={<Button size="sm" variant="ghost" onClick={() => setView("today")}>Open Today <ArrowRight className="h-3.5 w-3.5" /></Button>}
          />
          {isLoading ? <Skeleton className="h-32" /> : data!.today.tasks.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="h-8 w-8" />} title="No active tasks" description="You're all caught up." />
          ) : (
            <div className="flex flex-col gap-1.5">
              {data!.today.tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <Badge variant="outline" className={`font-mono text-[10px] ${statusBadgeClass(t.priority)}`}>{t.priority}</Badge>
                  <span className="text-sm truncate flex-1">{t.title}</span>
                  {t.status === "IN_PROGRESS" && <Badge variant="outline" className="text-sky-600 border-sky-200 text-[10px]">In Progress</Badge>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

function MiniStat({ icon, label, value, accent, onClick }: { icon: React.ReactNode; label: string; value: number; accent: string; onClick?: () => void }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
    sky: "text-sky-600 dark:text-sky-400",
    violet: "text-violet-600 dark:text-violet-400",
  };
  return (
    <button onClick={onClick} className="rounded-lg border p-3 text-left hover:bg-accent/50 transition-colors">
      <div className={`flex items-center gap-1.5 ${colorMap[accent]}`}>
        {icon}
        <span className="text-xs font-medium uppercase">{label}</span>
      </div>
      <p className="text-2xl font-bold mt-1">{formatNumber(value)}</p>
    </button>
  );
}

function PipelineCard({
  title, icon, data, isLoading, total, onOpen,
}: {
  title: string;
  icon: React.ReactNode;
  data?: Pipeline;
  isLoading: boolean;
  total?: number;
  onOpen: () => void;
}) {
  return (
    <Card className="p-4 gap-3">
      <SectionHeader
        title={title}
        description={total != null ? `${total} total` : undefined}
        icon={icon}
        actions={<Button size="sm" variant="ghost" onClick={onOpen}>Open <ArrowRight className="h-3.5 w-3.5" /></Button>}
      />
      {isLoading ? <Skeleton className="h-20" /> : !data || data.every((d) => d.count === 0) ? (
        <EmptyState title="Nothing in the pipeline" description="Add your first item to start tracking." />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {data.filter((d) => d.count > 0).map((d) => (
            <Badge key={d.state} variant="outline" className={`py-1 px-2 ${statusBadgeClass(d.state)}`}>
              <span className="font-mono font-bold mr-1">{d.count}</span>
              <span className="text-[10px]">{d.state}</span>
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
