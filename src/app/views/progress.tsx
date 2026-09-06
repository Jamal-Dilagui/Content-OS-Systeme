"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, SectionHeader, EmptyState } from "@/components/biz/layout";
import { formatNumber, statusBadgeClass } from "@/lib/format";
import { useNav } from "@/lib/nav-store";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Image, FileText, Package, Facebook, ArrowRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

type Pipeline = Array<{ state: string; count: number }>;
type DashData = {
  pipelines: { pins: Pipeline; articles: Pipeline; products: Pipeline; posts: Pipeline };
  month: { pinsPublished: number; articlesPublished: number; productsLaunched: number; postsPublished: number };
  months: Array<{ label: string; pins: number; articles: number; products: number }>;
  counts: Record<string, number>;
};

export function ProgressView() {
  const { setView } = useNav();
  const { data, isLoading } = useQuery<DashData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<TrendingUp className="h-5 w-5" />}
        title="Progress"
        description="See your production growth over time and where each channel stands."
      />

      {/* THIS MONTH OUTPUT */}
      <section>
        <Card className="p-4 gap-3">
          <SectionHeader title="This Month — Shipped" description="What you've produced this month" icon={<Layers className="h-4 w-4" />} />
          {isLoading ? <Skeleton className="h-24" /> : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ShippedCard icon={<Image className="h-4 w-4" />} label="Pins" value={data!.month.pinsPublished} total={data?.counts.publishedPins} accent="violet" onClick={() => setView("pinterest")} />
              <ShippedCard icon={<FileText className="h-4 w-4" />} label="Articles" value={data!.month.articlesPublished} total={data?.counts.publishedArticles} accent="sky" onClick={() => setView("blog")} />
              <ShippedCard icon={<Package className="h-4 w-4" />} label="Patterns" value={data!.month.productsLaunched} total={data?.counts.liveProducts} accent="emerald" onClick={() => setView("products")} />
              <ShippedCard icon={<Facebook className="h-4 w-4" />} label="Posts" value={data!.month.postsPublished} total={data?.counts.publishedPosts} accent="amber" onClick={() => setView("facebook")} />
            </div>
          )}
        </Card>
      </section>

      {/* PRODUCTION TREND */}
      <section>
        <Card className="p-4 gap-3">
          <SectionHeader title="Production Trend" description="Content published per month (last 6 months)" icon={<TrendingUp className="h-4 w-4" />} />
          {isLoading ? <Skeleton className="h-64" /> : (
            <div className="h-64">
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
      </section>

      {/* PIPELINE PROGRESS BARS — completion % per channel */}
      <section className="grid gap-3 lg:grid-cols-2">
        <PipelineProgress title="Pinterest" icon={<Image className="h-4 w-4" />} pipeline={data?.pipelines.pins} isLoading={isLoading} finalState="PUBLISHED" onOpen={() => setView("pinterest")} />
        <PipelineProgress title="Blog" icon={<FileText className="h-4 w-4" />} pipeline={data?.pipelines.articles} isLoading={isLoading} finalState="PUBLISHED" onOpen={() => setView("blog")} />
        <PipelineProgress title="PDF Patterns" icon={<Package className="h-4 w-4" />} pipeline={data?.pipelines.products} isLoading={isLoading} finalState="LIVE" onOpen={() => setView("products")} />
        <PipelineProgress title="Facebook" icon={<Facebook className="h-4 w-4" />} pipeline={data?.pipelines.posts} isLoading={isLoading} finalState="PUBLISHED" onOpen={() => setView("facebook")} />
      </section>
    </div>
  );
}

function ShippedCard({ icon, label, value, total, accent, onClick }: { icon: React.ReactNode; label: string; value: number; total?: number; accent: string; onClick: () => void }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    sky: "text-sky-600 dark:text-sky-400",
    violet: "text-violet-600 dark:text-violet-400",
  };
  return (
    <button onClick={onClick} className="text-left rounded-lg border p-4 hover:bg-accent/50 transition-colors">
      <div className={cn("flex items-center gap-1.5", colorMap[accent])}>
        {icon}
        <span className="text-xs font-medium uppercase">{label}</span>
      </div>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {total != null && <p className="text-xs text-muted-foreground mt-0.5">{total} total published</p>}
    </button>
  );
}

function PipelineProgress({ title, icon, pipeline, isLoading, finalState, onOpen }: { title: string; icon: React.ReactNode; pipeline?: Pipeline; isLoading: boolean; finalState: string; onOpen: () => void }) {
  const total = pipeline?.reduce((s, p) => s + p.count, 0) ?? 0;
  const done = pipeline?.find((p) => p.state === finalState)?.count ?? 0;
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <Card className="p-4 gap-3">
      <SectionHeader title={title} description={`${done} of ${total} reached ${finalState}`} icon={icon} actions={
        <button onClick={onOpen} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">Open <ArrowRight className="h-3 w-3" /></button>
      } />
      {isLoading ? <Skeleton className="h-20" /> : total === 0 ? (
        <EmptyState title="Empty pipeline" description="No items yet." />
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {pipeline!.filter((d) => d.count > 0).map((d) => (
              <Badge key={d.state} variant="outline" className={cn("py-1 px-2", statusBadgeClass(d.state))}>
                <span className="font-mono font-bold mr-1">{d.count}</span>
                <span className="text-[10px]">{d.state}</span>
              </Badge>
            ))}
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-bold">{pct.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
