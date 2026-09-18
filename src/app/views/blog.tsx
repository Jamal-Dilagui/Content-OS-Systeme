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
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PageHeader,
  SectionHeader,
  StatusBadge,
  EmptyState,
  InfoLine,
} from "@/components/biz/layout";
import { StatCard, StatCardSkeleton } from "@/components/biz/stat-card";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDate,
  formatShortDate,
  statusBadgeClass,
  STATUS_COLORS,
} from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  FileText,
  Plus,
  Trash2,
  MoreHorizontal,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  Eye,
  Link as LinkIcon,
  Search,
  Pencil,
  ChevronRight,
  CalendarDays,
  Globe,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Types ----------
type Article = {
  id: string;
  websiteId: string;
  websiteName: string | null;
  websiteUrl: string | null;
  title: string;
  keyword: string | null;
  url: string | null;
  status: string;
  organicTraffic: number;
  clicks: number;
  affiliateClicks: number;
  productClicks: number;
  revenue: number;
  publishedDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type Stats = {
  kpis: {
    articlesPlanned: number;
    articlesCompleted: number;
    articlesPublished: number;
    totalArticles: number;
    totalOrganicTraffic: number;
    totalClicks: number;
    totalAffiliateClicks: number;
    totalProductClicks: number;
    totalRevenue: number;
    dailyTarget: number;
    weeklyTarget: number;
  };
  statusDistribution: Array<{ status: string; count: number }>;
  topPages: Array<{
    id: string;
    title: string;
    url: string | null;
    websiteName: string | null;
    organicTraffic: number;
    clicks: number;
    affiliateClicks: number;
    productClicks: number;
    revenue: number;
  }>;
  topKeywords: Array<{
    keyword: string;
    articles: number;
    traffic: number;
    clicks: number;
    revenue: number;
  }>;
  byWebsite: Array<{
    id: string;
    name: string;
    url: string | null;
    articles: number;
    published: number;
    inProduction: number;
    organicTraffic: number;
    clicks: number;
    affiliateClicks: number;
    productClicks: number;
    revenue: number;
  }>;
  weeks: Array<{ key: string; label: string; published: number; traffic: number }>;
  websites: Array<{ id: string; name: string; url: string | null }>;
};

const ARTICLE_STATUSES = [
  "IDEA",
  "KEYWORD",
  "BRIEF",
  "OUTLINE",
  "WRITING",
  "SEO",
  "IMAGE",
  "INTERNAL_LINKS",
  "REVIEW",
  "READY",
  "PUBLISHED",
  "PROMOTED",
];

// Solid background color classes for each status (used for progress bars).
const STATUS_BAR_COLOR: Record<string, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  cyan: "bg-cyan-500",
  violet: "bg-violet-500",
  zinc: "bg-zinc-400",
};

function statusBarClass(status: string): string {
  const c = STATUS_COLORS[status] || "zinc";
  return STATUS_BAR_COLOR[c] || "bg-zinc-400";
}

// Color palette for charts (NO indigo/blue)
const CHART_COLORS = ["#10b981", "#f59e0b", "#f43f5e", "#0ea5e9", "#8b5cf6", "#71717a", "#14b8a6", "#ec4899"];

// ---------- Main view ----------
export function BlogView() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [websiteFilter, setWebsiteFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [addOpen, setAddOpen] = React.useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["blog", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/blog/stats");
      if (!res.ok) throw new Error("Failed to load blog stats");
      return res.json();
    },
  });

  const { data: articles, isLoading: articlesLoading } = useQuery<Article[]>({
    queryKey: ["blog", "articles", websiteFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (websiteFilter !== "ALL") params.set("websiteId", websiteFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/blog?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load articles");
      return res.json();
    },
  });

  const updateArticle = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const deleteArticle = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/blog/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Article removed" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const createArticle = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Article created" });
      setAddOpen(false);
    },
    onError: (e: Error) =>
      toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const handleStatusChange = (article: Article, status: string) => {
    updateArticle.mutate({ id: article.id, data: { status } });
    toast({
      title: `${article.title.slice(0, 40)}${article.title.length > 40 ? "…" : ""}`,
      description: `Status → ${status.replace(/_/g, " ").toLowerCase()}`,
    });
  };

  const kpis = stats?.kpis;
  const weeks = stats?.weeks ?? [];
  const maxWeeksPublished = Math.max(1, ...weeks.map((w) => w.published));
  const weeklyPublishedThisWeek = weeks[weeks.length - 1]?.published ?? 0;
  const weeklyTargetPct = kpis
    ? Math.min(100, (weeklyPublishedThisWeek / kpis.weeklyTarget) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<FileText className="h-5 w-5" />}
        title="Blog"
        description={`Production target: ${kpis?.dailyTarget ?? 5} articles/day. Track articles from idea to promotion, monitor organic traffic and revenue. Multi-website support.`}
        actions={
          <AddArticleDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            websites={stats?.websites ?? []}
            onCreate={(data) => createArticle.mutate(data)}
            submitting={createArticle.isPending}
          />
        }
      />

      {/* KPI ROW */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {statsLoading || !kpis ? (
          Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Articles Planned"
              value={formatNumber(kpis.articlesPlanned)}
              hint={`${kpis.totalArticles} total`}
              icon={<Sparkles className="h-4 w-4" />}
              accent="violet"
            />
            <StatCard
              label="Articles Completed"
              value={formatNumber(kpis.articlesCompleted)}
              hint="READY + published"
              icon={<FileText className="h-4 w-4" />}
              accent="sky"
            />
            <StatCard
              label="Articles Published"
              value={formatNumber(kpis.articlesPublished)}
              hint="PUBLISHED + PROMOTED"
              icon={<TrendingUp className="h-4 w-4" />}
              accent="emerald"
            />
            <StatCard
              label="Organic Traffic"
              value={formatNumber(kpis.totalOrganicTraffic, { compact: true })}
              hint={`${formatNumber(kpis.totalClicks, { compact: true })} clicks`}
              icon={<Eye className="h-4 w-4" />}
              accent="amber"
            />
            <StatCard
              label="Affiliate Clicks"
              value={formatNumber(kpis.totalAffiliateClicks, { compact: true })}
              hint={`${formatNumber(kpis.totalProductClicks, { compact: true })} product clicks`}
              icon={<MousePointerClick className="h-4 w-4" />}
              accent="rose"
            />
            <StatCard
              label="Revenue"
              value={formatCurrency(kpis.totalRevenue)}
              hint="from articles"
              icon={<DollarSign className="h-4 w-4" />}
              accent="emerald"
            />
          </>
        )}
      </div>

      {/* Weekly production target progress */}
      <Card className="p-4 gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">This week&apos;s production</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{weeklyPublishedThisWeek}</span>
            <span className="mx-1">/</span>
            <span>{kpis?.weeklyTarget ?? 35} articles target</span>
            <span className="ml-2 font-medium">
              ({formatPercent(weeklyTargetPct, 0)})
            </span>
          </div>
        </div>
        <Progress value={weeklyTargetPct} className="h-2" />
      </Card>

      <Tabs defaultValue="pipeline" className="gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="pipeline" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Performance
          </TabsTrigger>
          <TabsTrigger value="websites" className="gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Websites
          </TabsTrigger>
        </TabsList>

        {/* ===================== PIPELINE TAB ===================== */}
        <TabsContent value="pipeline" className="flex flex-col gap-4">
          {/* Pipeline distribution (compact funnel) */}
          <Card className="p-4 gap-3">
            <SectionHeader
              title="Article Pipeline"
              description={`${kpis?.totalArticles ?? 0} articles across ${stats?.websites.length ?? 0} website(s)`}
              icon={<FileText className="h-4 w-4" />}
            />
            {statsLoading ? (
              <Skeleton className="h-10" />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {stats?.statusDistribution.map((s) => {
                  const total = kpis?.totalArticles ?? 1;
                  const pctVal = total > 0 ? (s.count / total) * 100 : 0;
                  return (
                    <div
                      key={s.status}
                      className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1"
                      title={`${s.status.replace(/_/g, " ")} — ${s.count} article(s)`}
                    >
                      <span className={cn("h-2 w-2 rounded-full", statusBarClass(s.status))} />
                      <span className="text-xs font-medium">{s.status.replace(/_/g, " ")}</span>
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                        {s.count}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {pctVal.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Article pipeline table */}
          <Card className="p-4 gap-3">
            <SectionHeader
              title="All Articles"
              description="Filter by website and/or status. Change status inline via the dropdown."
              icon={<FileText className="h-4 w-4" />}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={websiteFilter} onValueChange={setWebsiteFilter}>
                    <SelectTrigger className="h-8 w-[150px] sm:w-[180px]">
                      <Globe className="h-3.5 w-3.5 mr-1 shrink-0" />
                      <SelectValue placeholder="Website" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All websites</SelectItem>
                      {stats?.websites.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 w-[140px] sm:w-[160px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All statuses</SelectItem>
                      {ARTICLE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              }
            />

            {articlesLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : !articles || articles.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                title="No articles match these filters"
                description="Try changing the filters, or create a new article."
                action={
                  <AddArticleDialog
                    open={addOpen}
                    onOpenChange={setAddOpen}
                    websites={stats?.websites ?? []}
                    onCreate={(data) => createArticle.mutate(data)}
                    submitting={createArticle.isPending}
                  />
                }
              />
            ) : (
              <div className="max-h-[34rem] overflow-y-auto -mx-4 px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Title</TableHead>
                      <TableHead className="hidden md:table-cell">Website</TableHead>
                      <TableHead className="hidden lg:table-cell">Keyword</TableHead>
                      <TableHead className="min-w-[150px]">Status</TableHead>
                      <TableHead className="text-right">Traffic</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Aff. Clicks</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Revenue</TableHead>
                      <TableHead className="hidden xl:table-cell">Published</TableHead>
                      <TableHead className="w-[3rem] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="font-medium truncate max-w-[280px]" title={a.title}>
                            {a.title}
                          </div>
                          {a.url && (
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-0.5 truncate max-w-[280px]"
                            >
                              <LinkIcon className="h-3 w-3 shrink-0" />
                              <span className="truncate">{a.url}</span>
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {a.websiteName ?? "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {a.keyword ? (
                            <Badge variant="outline" className="font-normal">
                              {a.keyword}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={a.status}
                            onValueChange={(v) => handleStatusChange(a, v)}
                          >
                            <SelectTrigger className="h-8 w-[150px]">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full shrink-0 mr-1.5",
                                  statusBarClass(a.status)
                                )}
                              />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ARTICLE_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s.replace(/_/g, " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(a.organicTraffic, { compact: true })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums hidden sm:table-cell">
                          {formatNumber(a.affiliateClicks)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums hidden md:table-cell">
                          {formatCurrency(a.revenue)}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                          {a.publishedDate ? formatShortDate(a.publishedDate) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <EditArticleDialog
                                article={a}
                                websites={stats?.websites ?? []}
                                onEdit={(data) =>
                                  updateArticle.mutate({ id: a.id, data })
                                }
                                submitting={updateArticle.isPending}
                              />
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:dark:text-rose-400"
                                onClick={() => deleteArticle.mutate(a.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete article
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ===================== PERFORMANCE TAB ===================== */}
        <TabsContent value="performance" className="flex flex-col gap-4">
          {/* Articles published over last 12 weeks */}
          <Card className="p-4 gap-3">
            <SectionHeader
              title="Articles Published (last 12 weeks)"
              description="Weekly production volume. Target line at weekly target."
              icon={<TrendingUp className="h-4 w-4" />}
            />
            {statsLoading ? (
              <Skeleton className="h-64" />
            ) : weeks.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="h-8 w-8" />}
                title="No published articles yet"
                description="Once articles are published, weekly volume will appear here."
              />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeks} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      allowDecimals={false}
                    />
                    <Tooltip
                      {...{
                        contentStyle: {
                          borderRadius: "0.5rem",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--popover))",
                          color: "hsl(var(--popover-foreground))",
                          fontSize: "0.75rem",
                        },
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="published"
                      name="Articles published"
                      fill="#10b981"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Peak week: {maxWeeksPublished} published.{" "}
              {kpis && (
                <>
                  Weekly target: {kpis.weeklyTarget}. Trend over time informs production pacing.
                </>
              )}
            </p>
          </Card>

          {/* Top pages + top keywords (2 columns) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-4 gap-3">
              <SectionHeader
                title="Top Pages by Traffic"
                description="Best-performing published articles"
                icon={<Eye className="h-4 w-4" />}
              />
              {!stats || stats.topPages.length === 0 ? (
                <EmptyState
                  icon={<Eye className="h-8 w-8" />}
                  title="No traffic recorded yet"
                  description="Publish articles to see their organic traffic here."
                />
              ) : (
                <div className="max-h-96 overflow-y-auto -mx-4 px-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page</TableHead>
                        <TableHead className="text-right">Traffic</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Aff.</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.topPages.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="font-medium truncate max-w-[200px]" title={p.title}>
                              {p.title}
                            </div>
                            {p.websiteName && (
                              <div className="text-xs text-muted-foreground">{p.websiteName}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatNumber(p.organicTraffic, { compact: true })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums hidden sm:table-cell">
                            {formatNumber(p.affiliateClicks)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(p.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>

            <Card className="p-4 gap-3">
              <SectionHeader
                title="Top Keywords"
                description="Grouped by keyword — total traffic & articles"
                icon={<Search className="h-4 w-4" />}
              />
              {!stats || stats.topKeywords.length === 0 ? (
                <EmptyState
                  icon={<Search className="h-8 w-8" />}
                  title="No keywords tracked yet"
                  description="Add keywords to your articles to see topic clusters."
                />
              ) : (
                <div className="max-h-96 overflow-y-auto -mx-4 px-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Keyword</TableHead>
                        <TableHead className="text-center">Articles</TableHead>
                        <TableHead className="text-right">Traffic</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.topKeywords.map((k) => (
                        <TableRow key={k.keyword}>
                          <TableCell>
                            <Badge variant="outline" className="font-normal">
                              {k.keyword}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center tabular-nums">{k.articles}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatNumber(k.traffic, { compact: true })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums hidden sm:table-cell text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(k.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </div>

          {/* Traffic by website bar chart */}
          <Card className="p-4 gap-3">
            <SectionHeader
              title="Organic Traffic by Website"
              description="Compare performance across your websites"
              icon={<Globe className="h-4 w-4" />}
            />
            {statsLoading ? (
              <Skeleton className="h-64" />
            ) : !stats || stats.byWebsite.length === 0 ? (
              <EmptyState
                icon={<Globe className="h-8 w-8" />}
                title="No websites configured"
              />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.byWebsite}
                    margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      allowDecimals={false}
                    />
                    <Tooltip
                      {...{
                        contentStyle: {
                          borderRadius: "0.5rem",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--popover))",
                          color: "hsl(var(--popover-foreground))",
                          fontSize: "0.75rem",
                        },
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="organicTraffic"
                      name="Organic traffic"
                      fill="#f59e0b"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="clicks"
                      name="Clicks"
                      fill="#8b5cf6"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ===================== WEBSITES TAB ===================== */}
        <TabsContent value="websites" className="flex flex-col gap-4">
          <Card className="p-4 gap-3">
            <SectionHeader
              title="Multi-Website Breakdown"
              description="Per-website performance summary"
              icon={<Globe className="h-4 w-4" />}
            />
            {!stats || stats.byWebsite.length === 0 ? (
              <EmptyState
                icon={<Globe className="h-8 w-8" />}
                title="No websites yet"
                description="Websites are created in the Business module."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {stats.byWebsite.map((w) => (
                  <Card key={w.id} className="p-4 gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{w.name}</div>
                        {w.url && (
                          <a
                            href={w.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-0.5 truncate max-w-full"
                          >
                            <LinkIcon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{w.url}</span>
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <InfoLine label="Articles" value={formatNumber(w.articles)} />
                      <InfoLine
                        label="Published"
                        value={
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatNumber(w.published)}
                          </span>
                        }
                      />
                      <InfoLine
                        label="In production"
                        value={
                          <span className="text-amber-600 dark:text-amber-400">
                            {formatNumber(w.inProduction)}
                          </span>
                        }
                      />
                      <InfoLine
                        label="Traffic"
                        value={formatNumber(w.organicTraffic, { compact: true })}
                      />
                      <InfoLine
                        label="Aff. clicks"
                        value={formatNumber(w.affiliateClicks)}
                      />
                      <InfoLine
                        label="Product clicks"
                        value={formatNumber(w.productClicks)}
                      />
                    </div>
                    <div className="mt-1 rounded-md border bg-muted/30 p-2 text-right">
                      <div className="text-xs text-muted-foreground">Revenue</div>
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(w.revenue)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Add Article dialog ----------
function AddArticleDialog({
  open,
  onOpenChange,
  websites,
  onCreate,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  websites: Array<{ id: string; name: string }>;
  onCreate: (data: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = React.useState("");
  const [websiteId, setWebsiteId] = React.useState<string>("");
  const [keyword, setKeyword] = React.useState("");
  const [status, setStatus] = React.useState<string>("IDEA");

  // Reset form on close
  React.useEffect(() => {
    if (!open) {
      setTitle("");
      setWebsiteId(websites[0]?.id ?? "");
      setKeyword("");
      setStatus("IDEA");
    }
  }, [open, websites]);

  // Auto-select first website when list loads
  React.useEffect(() => {
    if (!websiteId && websites.length > 0) {
      setWebsiteId(websites[0].id);
    }
  }, [websites, websiteId]);

  const handleCreate = () => {
    if (!title.trim()) return;
    if (!websiteId) return;
    onCreate({
      title: title.trim(),
      websiteId,
      keyword: keyword.trim() || null,
      status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add Article
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Article</DialogTitle>
          <DialogDescription>
            Start a new article in the production pipeline. You can change status &amp; metrics later.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="art-title">Title *</Label>
            <Input
              id="art-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 10 Free Crochet Patterns for Beginners"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="art-website">Website *</Label>
              <Select value={websiteId} onValueChange={setWebsiteId}>
                <SelectTrigger id="art-website">
                  <SelectValue placeholder="Select website" />
                </SelectTrigger>
                <SelectContent>
                  {websites.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="art-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="art-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARTICLE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="art-keyword">Keyword (optional)</Label>
            <Input
              id="art-keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. crochet patterns for beginners"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={submitting || !title.trim() || !websiteId}>
            {submitting ? "Creating…" : "Create Article"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Edit Article dialog (rendered inside a dropdown) ----------
function EditArticleDialog({
  article,
  websites,
  onEdit,
  submitting,
}: {
  article: Article;
  websites: Array<{ id: string; name: string }>;
  onEdit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(article.title);
  const [websiteId, setWebsiteId] = React.useState(article.websiteId);
  const [keyword, setKeyword] = React.useState(article.keyword ?? "");
  const [url, setUrl] = React.useState(article.url ?? "");
  const [organicTraffic, setOrganicTraffic] = React.useState(String(article.organicTraffic));
  const [affiliateClicks, setAffiliateClicks] = React.useState(String(article.affiliateClicks));
  const [productClicks, setProductClicks] = React.useState(String(article.productClicks));
  const [revenue, setRevenue] = React.useState(String(article.revenue));

  // Resync when article changes
  React.useEffect(() => {
    if (open) {
      setTitle(article.title);
      setWebsiteId(article.websiteId);
      setKeyword(article.keyword ?? "");
      setUrl(article.url ?? "");
      setOrganicTraffic(String(article.organicTraffic));
      setAffiliateClicks(String(article.affiliateClicks));
      setProductClicks(String(article.productClicks));
      setRevenue(String(article.revenue));
    }
  }, [open, article]);

  const handleSave = () => {
    if (!title.trim() || !websiteId) return;
    onEdit({
      title: title.trim(),
      websiteId,
      keyword: keyword.trim() || null,
      url: url.trim() || null,
      organicTraffic: Number(organicTraffic) || 0,
      affiliateClicks: Number(affiliateClicks) || 0,
      productClicks: Number(productClicks) || 0,
      revenue: Number(revenue) || 0,
    });
    setOpen(false);
  };

  return (
    <>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit article
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Article</DialogTitle>
          <DialogDescription>
            Update content fields and performance metrics. Status is changed inline in the table.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-website">Website</Label>
              <Select value={websiteId} onValueChange={setWebsiteId}>
                <SelectTrigger id="edit-website">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {websites.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-keyword">Keyword</Label>
              <Input
                id="edit-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-url">URL</Label>
            <Input
              id="edit-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-traffic">Organic traffic</Label>
              <Input
                id="edit-traffic"
                type="number"
                min={0}
                value={organicTraffic}
                onChange={(e) => setOrganicTraffic(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-revenue">Revenue ($)</Label>
              <Input
                id="edit-revenue"
                type="number"
                min={0}
                step={0.01}
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-aff">Affiliate clicks</Label>
              <Input
                id="edit-aff"
                type="number"
                min={0}
                value={affiliateClicks}
                onChange={(e) => setAffiliateClicks(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-prod">Product clicks</Label>
              <Input
                id="edit-prod"
                type="number"
                min={0}
                value={productClicks}
                onChange={(e) => setProductClicks(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting || !title.trim() || !websiteId}>
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
