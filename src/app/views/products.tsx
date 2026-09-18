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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Package,
  Plus,
  Trash2,
  MoreHorizontal,
  TrendingUp,
  DollarSign,
  Trophy,
  Pencil,
  ChevronDown,
  ChevronRight,
  ShoppingBag,
  Layers,
  Target,
  Percent,
  Sparkles,
  Scissors,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Types ----------
type Product = {
  id: string;
  name: string;
  type: string;
  nicheId: string | null;
  nicheName: string | null;
  status: string;
  platform: string | null;
  price: number;
  unitsSold: number;
  revenue: number;
  conversionRate: number;
  difficulty: string | null;
  materials: string | null;
  sizes: string | null;
  gauge: string | null;
  stitches: string | null;
  publishedDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type Stats = {
  kpis: {
    productsCreated: number;
    productsPublished: number;
    productsLive: number;
    totalUnitsSold: number;
    totalRevenue: number;
    avgConversionRate: number;
  };
  bestSeller: {
    id: string;
    name: string;
    type: string;
    platform: string | null;
    unitsSold: number;
    revenue: number;
    conversionRate: number;
  } | null;
  revenueByPlatform: Array<{
    platform: string;
    revenue: number;
    unitsSold: number;
    products: number;
  }>;
  revenueByType: Array<{
    type: string;
    revenue: number;
    unitsSold: number;
    products: number;
  }>;
  statusDistribution: Array<{ status: string; count: number }>;
  niches: Array<{ id: string; name: string }>;
  platforms: Array<{ id: string; name: string; fee: number }>;
};

const PRODUCT_STATUSES = [
  "IDEA",
  "VALIDATION",
  "RESEARCH",
  "CREATION",
  "DESIGN",
  "PROOFREADING",
  "PDF",
  "COVER",
  "LISTING",
  "PRODUCT_IMAGES",
  "SEO",
  "PUBLISH",
  "PROMOTION",
  "LIVE",
  "OPTIMIZATION",
];

const PRODUCT_TYPES = ["PDF", "CROCHET_PATTERN", "PRINTABLE", "TEMPLATE", "EBOOK", "BUNDLE"];

const PLATFORM_OPTIONS = ["Etsy", "Payhip", "Gumroad", "Shopify", "Own site", "Other"];

const DIFFICULTY_OPTIONS = ["Beginner", "Easy", "Intermediate", "Advanced", "Expert"];

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
const PIE_COLORS = ["#10b981", "#f59e0b", "#f43f5e", "#0ea5e9", "#8b5cf6", "#71717a", "#14b8a6", "#ec4899"];

function colorForIndex(i: number): string {
  return PIE_COLORS[i % PIE_COLORS.length];
}

// ---------- Main view ----------
export function ProductsView() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [addOpen, setAddOpen] = React.useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["products", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/products/stats");
      if (!res.ok) throw new Error("Failed to load product stats");
      return res.json();
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["products", "list", statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Product removed" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const createProduct = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/products", {
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
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Product created" });
      setAddOpen(false);
    },
    onError: (e: Error) =>
      toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const handleStatusChange = (product: Product, status: string) => {
    updateProduct.mutate({ id: product.id, data: { status } });
    toast({
      title: `${product.name.slice(0, 40)}${product.name.length > 40 ? "…" : ""}`,
      description: `Status → ${status.replace(/_/g, " ").toLowerCase()}`,
    });
  };

  const kpis = stats?.kpis;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Package className="h-5 w-5" />}
        title="PDF Patterns"
        description="Build & launch PDF patterns and crochet patterns. Move each one through the pipeline: idea → creation → PDF → listing → live."
        actions={
          <AddProductDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            niches={stats?.niches ?? []}
            platforms={stats?.platforms ?? []}
            onCreate={(data) => createProduct.mutate(data)}
            submitting={createProduct.isPending}
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
              label="Products Created"
              value={formatNumber(kpis.productsCreated)}
              hint="total in pipeline"
              icon={<Sparkles className="h-4 w-4" />}
              accent="violet"
            />
            <StatCard
              label="Products Published"
              value={formatNumber(kpis.productsPublished)}
              hint="publish or later"
              icon={<Package className="h-4 w-4" />}
              accent="sky"
            />
            <StatCard
              label="Products Live"
              value={formatNumber(kpis.productsLive)}
              hint="LIVE + optimization"
              icon={<TrendingUp className="h-4 w-4" />}
              accent="emerald"
            />
            <StatCard
              label="Units Sold"
              value={formatNumber(kpis.totalUnitsSold, { compact: true })}
              hint="all-time"
              icon={<ShoppingBag className="h-4 w-4" />}
              accent="amber"
            />
            <StatCard
              label="Revenue"
              value={formatCurrency(kpis.totalRevenue)}
              hint="all-time"
              icon={<DollarSign className="h-4 w-4" />}
              accent="emerald"
            />
            <StatCard
              label="Avg Conversion"
              value={formatPercent(kpis.avgConversionRate, 2)}
              hint="live products avg"
              icon={<Percent className="h-4 w-4" />}
              accent="rose"
            />
          </>
        )}
      </div>

      {/* Best seller highlight */}
      {stats?.bestSeller && (
        <Card className="p-4 gap-2 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent border-emerald-500/30">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Best-selling product
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold">{stats.bestSeller.name}</h3>
                <Badge variant="outline" className="font-normal">
                  {stats.bestSeller.type.replace(/_/g, " ").toLowerCase()}
                </Badge>
                {stats.bestSeller.platform && (
                  <Badge variant="secondary">{stats.bestSeller.platform}</Badge>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {formatNumber(stats.bestSeller.unitsSold)} units sold ·{" "}
                {formatCurrency(stats.bestSeller.revenue)} revenue ·{" "}
                {formatPercent(stats.bestSeller.conversionRate * 100, 2)} conversion
              </div>
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="pipeline" className="gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="pipeline" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Performance
          </TabsTrigger>
        </TabsList>

        {/* ===================== PIPELINE TAB ===================== */}
        <TabsContent value="pipeline" className="flex flex-col gap-4">
          {/* Pipeline distribution */}
          <Card className="p-4 gap-3">
            <SectionHeader
              title="Product Pipeline"
              description={`${kpis?.productsCreated ?? 0} products across 15 stages — from idea to optimization`}
              icon={<Layers className="h-4 w-4" />}
            />
            {statsLoading ? (
              <Skeleton className="h-10" />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {stats?.statusDistribution.map((s) => {
                  const total = kpis?.productsCreated ?? 1;
                  const pctVal = total > 0 ? (s.count / total) * 100 : 0;
                  return (
                    <div
                      key={s.status}
                      className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1"
                      title={`${s.status.replace(/_/g, " ")} — ${s.count} product(s)`}
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

          {/* Products table */}
          <Card className="p-4 gap-3">
            <SectionHeader
              title="All Products"
              description="Filter by status or type. Expand a row for crochet pattern details."
              icon={<Package className="h-4 w-4" />}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-8 w-[140px] sm:w-[170px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All types</SelectItem>
                      {PRODUCT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace(/_/g, " ").toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 w-[140px] sm:w-[170px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All statuses</SelectItem>
                      {PRODUCT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              }
            />

            {productsLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : !products || products.length === 0 ? (
              <EmptyState
                icon={<Package className="h-8 w-8" />}
                title="No products match these filters"
                description="Try changing the filters, or create a new product."
                action={
                  <AddProductDialog
                    open={addOpen}
                    onOpenChange={setAddOpen}
                    niches={stats?.niches ?? []}
                    platforms={stats?.platforms ?? []}
                    onCreate={(data) => createProduct.mutate(data)}
                    submitting={createProduct.isPending}
                  />
                }
              />
            ) : (
              <div className="max-h-[40rem] overflow-y-auto -mx-4 px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[2rem]" />
                      <TableHead className="min-w-[200px]">Product</TableHead>
                      <TableHead className="hidden md:table-cell">Type</TableHead>
                      <TableHead className="hidden lg:table-cell">Niche</TableHead>
                      <TableHead className="min-w-[160px]">Status</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Sold</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Revenue</TableHead>
                      <TableHead className="hidden xl:table-cell">Platform</TableHead>
                      <TableHead className="w-[3rem] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => (
                      <ProductRow
                        key={p.id}
                        product={p}
                        websites={[]}
                        niches={stats?.niches ?? []}
                        onStatusChange={(status) => handleStatusChange(p, status)}
                        onEdit={(data) => updateProduct.mutate({ id: p.id, data })}
                        onDelete={() => deleteProduct.mutate(p.id)}
                        submitting={updateProduct.isPending}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ===================== PERFORMANCE TAB ===================== */}
        <TabsContent value="performance" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Revenue by platform */}
            <Card className="p-4 gap-3">
              <SectionHeader
                title="Revenue by Platform"
                description="Total revenue, units, and product count per platform"
                icon={<Layers className="h-4 w-4" />}
              />
              {statsLoading ? (
                <Skeleton className="h-64" />
              ) : !stats || stats.revenueByPlatform.length === 0 ? (
                <EmptyState
                  icon={<Layers className="h-8 w-8" />}
                  title="No platform data"
                  description="Set a platform on your products to see this breakdown."
                />
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.revenueByPlatform}
                          dataKey="revenue"
                          nameKey="platform"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                          paddingAngle={2}
                        >
                          {stats.revenueByPlatform.map((_, i) => (
                            <Cell key={i} fill={colorForIndex(i)} />
                          ))}
                        </Pie>
                        <Tooltip
                          {...{
                            contentStyle: {
                              borderRadius: "0.5rem",
                              border: "1px solid hsl(var(--border))",
                              background: "hsl(var(--popover))",
                              color: "hsl(var(--popover-foreground))",
                              fontSize: "0.75rem",
                            },
                            formatter: (v: number) => formatCurrency(v),
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="max-h-48 overflow-y-auto -mx-4 px-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Platform</TableHead>
                          <TableHead className="text-center">Products</TableHead>
                          <TableHead className="text-right">Units</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.revenueByPlatform.map((p, i) => (
                          <TableRow key={p.platform}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ background: colorForIndex(i) }}
                                />
                                <span className="font-medium">{p.platform}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center tabular-nums">{p.products}</TableCell>
                            <TableCell className="text-right tabular-nums">{p.unitsSold}</TableCell>
                            <TableCell className="text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(p.revenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </Card>

            {/* Revenue by type */}
            <Card className="p-4 gap-3">
              <SectionHeader
                title="Revenue by Type"
                description="Performance broken down by product type"
                icon={<Package className="h-4 w-4" />}
              />
              {statsLoading ? (
                <Skeleton className="h-64" />
              ) : !stats || stats.revenueByType.length === 0 ? (
                <EmptyState
                  icon={<Package className="h-8 w-8" />}
                  title="No type data"
                />
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.revenueByType.map((t) => ({
                          ...t,
                          label: t.type.replace(/_/g, " ").toLowerCase(),
                        }))}
                        layout="vertical"
                        margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11 }}
                          className="text-muted-foreground"
                          tickFormatter={(v) => `$${v}`}
                        />
                        <YAxis
                          type="category"
                          dataKey="label"
                          tick={{ fontSize: 11 }}
                          className="text-muted-foreground"
                          width={110}
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
                            formatter: (v: number) => formatCurrency(v),
                          }}
                        />
                        <Bar
                          dataKey="revenue"
                          name="Revenue"
                          fill="#8b5cf6"
                          radius={[0, 3, 3, 0]}
                          maxBarSize={26}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {stats.revenueByType.map((t, i) => (
                      <div
                        key={t.type}
                        className="rounded-md border bg-card px-2 py-1.5 flex items-center justify-between"
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ background: colorForIndex(i) }}
                          />
                          <span className="truncate">{t.type.replace(/_/g, " ").toLowerCase()}</span>
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatCurrency(t.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Status distribution bar chart */}
          <Card className="p-4 gap-3">
            <SectionHeader
              title="Pipeline Status Distribution"
              description="Number of products at each stage of production"
              icon={<Layers className="h-4 w-4" />}
            />
            {statsLoading ? (
              <Skeleton className="h-64" />
            ) : !stats || stats.statusDistribution.every((s) => s.count === 0) ? (
              <EmptyState
                icon={<Layers className="h-8 w-8" />}
                title="No products in pipeline"
              />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.statusDistribution.map((s) => ({
                      ...s,
                      label: s.status.replace(/_/g, " "),
                    }))}
                    margin={{ top: 6, right: 8, left: 0, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
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
                    <Bar
                      dataKey="count"
                      name="Products"
                      fill="#f59e0b"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Product row (with expandable crochet detail) ----------
function ProductRow({
  product,
  niches,
  onStatusChange,
  onEdit,
  onDelete,
  submitting,
}: {
  product: Product;
  websites: Array<{ id: string; name: string }>;
  niches: Array<{ id: string; name: string }>;
  onStatusChange: (status: string) => void;
  onEdit: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  submitting: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const isCrochet = product.type === "CROCHET_PATTERN";
  const hasDetail =
    isCrochet &&
    (product.difficulty ||
      product.materials ||
      product.sizes ||
      product.gauge ||
      product.stitches);

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen} asChild>
        <TableRow>
          <TableCell className="w-[2rem]">
            {hasDetail ? (
              <CollapsibleTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  {open ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </Button>
              </CollapsibleTrigger>
            ) : isCrochet ? (
              <Scissors className="h-3.5 w-3.5 text-muted-foreground/60" />
            ) : null}
          </TableCell>
          <TableCell>
            <div className="font-medium truncate max-w-[240px]" title={product.name}>
              {product.name}
            </div>
            {product.nicheName && (
              <div className="text-xs text-muted-foreground truncate">
                {product.nicheName}
              </div>
            )}
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <Badge variant="outline" className="font-normal">
              {product.type.replace(/_/g, " ").toLowerCase()}
            </Badge>
          </TableCell>
          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
            {product.nicheName ?? "—"}
          </TableCell>
          <TableCell>
            <Select value={product.status} onValueChange={onStatusChange}>
              <SelectTrigger className="h-8 w-[150px]">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0 mr-1.5",
                    statusBarClass(product.status)
                  )}
                />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatCurrency(product.price)}
          </TableCell>
          <TableCell className="text-right tabular-nums hidden sm:table-cell">
            {formatNumber(product.unitsSold)}
          </TableCell>
          <TableCell className="text-right tabular-nums hidden md:table-cell text-emerald-600 dark:text-emerald-400">
            {formatCurrency(product.revenue)}
          </TableCell>
          <TableCell className="hidden xl:table-cell">
            {product.platform ? (
              <Badge variant="secondary">{product.platform}</Badge>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </TableCell>
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <EditProductDialog
                  product={product}
                  niches={niches}
                  onEdit={onEdit}
                  submitting={submitting}
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:dark:text-rose-400"
                  onSelect={() => {
                    if (confirm(`Remove "${product.name}"?`)) onDelete();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete product
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      </Collapsible>
      {hasDetail && (
        <Collapsible open={open} onOpenChange={setOpen} asChild>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableCell colSpan={10} className="p-0">
              <CollapsibleContent>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Scissors className="h-4 w-4 text-violet-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Crochet pattern details
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <DetailField label="Difficulty" value={product.difficulty} />
                    <DetailField label="Sizes" value={product.sizes} />
                    <DetailField label="Gauge" value={product.gauge} />
                    <DetailField
                      label="Materials"
                      value={product.materials}
                      full
                    />
                    <DetailField
                      label="Stitches"
                      value={product.stitches}
                      full
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </TableCell>
          </TableRow>
        </Collapsible>
      )}
    </>
  );
}

function DetailField({
  label,
  value,
  full,
}: {
  label: string;
  value: string | null | undefined;
  full?: boolean;
}) {
  return (
    <div className={cn("rounded-md border bg-card p-2.5", full && "sm:col-span-2 lg:col-span-3")}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm mt-0.5 whitespace-pre-wrap">
        {value ? (
          value
        ) : (
          <span className="text-muted-foreground">Not specified</span>
        )}
      </div>
    </div>
  );
}

// ---------- Add Product dialog ----------
function AddProductDialog({
  open,
  onOpenChange,
  niches,
  platforms,
  onCreate,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  niches: Array<{ id: string; name: string }>;
  platforms: Array<{ id: string; name: string; fee: number }>;
  onCreate: (data: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<string>("PDF");
  const [nicheId, setNicheId] = React.useState<string>("");
  const [platform, setPlatform] = React.useState<string>("Etsy");
  const [price, setPrice] = React.useState<string>("");
  const [status, setStatus] = React.useState<string>("IDEA");
  // Crochet-specific fields
  const [difficulty, setDifficulty] = React.useState<string>("");
  const [materials, setMaterials] = React.useState<string>("");
  const [sizes, setSizes] = React.useState<string>("");
  const [gauge, setGauge] = React.useState<string>("");
  const [stitches, setStitches] = React.useState<string>("");

  const isCrochet = type === "CROCHET_PATTERN";

  React.useEffect(() => {
    if (!open) {
      setName("");
      setType("PDF");
      setNicheId("");
      setPlatform("Etsy");
      setPrice("");
      setStatus("IDEA");
      setDifficulty("");
      setMaterials("");
      setSizes("");
      setGauge("");
      setStitches("");
    }
  }, [open]);

  React.useEffect(() => {
    if (!nicheId && niches.length > 0) setNicheId(niches[0].id);
  }, [niches, nicheId]);

  const handleCreate = () => {
    if (!name.trim()) return;
    const data: Record<string, unknown> = {
      name: name.trim(),
      type,
      nicheId: nicheId || null,
      platform,
      price: Number(price) || 0,
      status,
    };
    if (isCrochet) {
      data.difficulty = difficulty || null;
      data.materials = materials || null;
      data.sizes = sizes || null;
      data.gauge = gauge || null;
      data.stitches = stitches || null;
    }
    onCreate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Digital Product</DialogTitle>
          <DialogDescription>
            Start a new product in the pipeline. Crochet patterns include extra fields for materials,
            sizes, gauge, and stitches.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prod-name">Name *</Label>
            <Input
              id="prod-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Easy Granny Square Pattern"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prod-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="prod-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ").toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prod-niche">Niche</Label>
              <Select value={nicheId} onValueChange={setNicheId}>
                <SelectTrigger id="prod-niche">
                  <SelectValue placeholder="Select niche" />
                </SelectTrigger>
                <SelectContent>
                  {niches.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prod-platform">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="prod-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prod-price">Price ($)</Label>
              <Input
                id="prod-price"
                type="number"
                min={0}
                step={0.5}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="prod-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="prod-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isCrochet && (
            <div className="rounded-md border border-violet-200 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/5 p-3 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-violet-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                  Crochet pattern details
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prod-diff">Difficulty</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger id="prod-diff">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_OPTIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prod-sizes">Sizes</Label>
                  <Input
                    id="prod-sizes"
                    value={sizes}
                    onChange={(e) => setSizes(e.target.value)}
                    placeholder="e.g. S, M, L"
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="prod-gauge">Gauge</Label>
                  <Input
                    id="prod-gauge"
                    value={gauge}
                    onChange={(e) => setGauge(e.target.value)}
                    placeholder="e.g. 12 dc x 8 rows = 10cm"
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="prod-materials">Materials</Label>
                  <Textarea
                    id="prod-materials"
                    value={materials}
                    onChange={(e) => setMaterials(e.target.value)}
                    placeholder="Yarn weight, hook size, tapestry needle, etc."
                    rows={2}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="prod-stitches">Stitches</Label>
                  <Textarea
                    id="prod-stitches"
                    value={stitches}
                    onChange={(e) => setStitches(e.target.value)}
                    placeholder="ch, sl st, sc, hdc, dc, …"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={submitting || !name.trim()}>
            {submitting ? "Creating…" : "Create Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Edit Product dialog ----------
function EditProductDialog({
  product,
  niches,
  onEdit,
  submitting,
}: {
  product: Product;
  niches: Array<{ id: string; name: string }>;
  onEdit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(product.name);
  const [type, setType] = React.useState(product.type);
  const [nicheId, setNicheId] = React.useState(product.nicheId ?? "");
  const [platform, setPlatform] = React.useState(product.platform ?? "Etsy");
  const [price, setPrice] = React.useState(String(product.price));
  const [unitsSold, setUnitsSold] = React.useState(String(product.unitsSold));
  const [revenue, setRevenue] = React.useState(String(product.revenue));
  const [conversionRate, setConversionRate] = React.useState(String(product.conversionRate));
  const [difficulty, setDifficulty] = React.useState(product.difficulty ?? "");
  const [materials, setMaterials] = React.useState(product.materials ?? "");
  const [sizes, setSizes] = React.useState(product.sizes ?? "");
  const [gauge, setGauge] = React.useState(product.gauge ?? "");
  const [stitches, setStitches] = React.useState(product.stitches ?? "");

  React.useEffect(() => {
    if (open) {
      setName(product.name);
      setType(product.type);
      setNicheId(product.nicheId ?? "");
      setPlatform(product.platform ?? "Etsy");
      setPrice(String(product.price));
      setUnitsSold(String(product.unitsSold));
      setRevenue(String(product.revenue));
      setConversionRate(String(product.conversionRate));
      setDifficulty(product.difficulty ?? "");
      setMaterials(product.materials ?? "");
      setSizes(product.sizes ?? "");
      setGauge(product.gauge ?? "");
      setStitches(product.stitches ?? "");
    }
  }, [open, product]);

  const isCrochet = type === "CROCHET_PATTERN";

  const handleSave = () => {
    if (!name.trim()) return;
    const data: Record<string, unknown> = {
      name: name.trim(),
      type,
      nicheId: nicheId || null,
      platform,
      price: Number(price) || 0,
      unitsSold: Number(unitsSold) || 0,
      revenue: Number(revenue) || 0,
      conversionRate: Number(conversionRate) || 0,
    };
    if (isCrochet) {
      data.difficulty = difficulty || null;
      data.materials = materials || null;
      data.sizes = sizes || null;
      data.gauge = gauge || null;
      data.stitches = stitches || null;
    }
    onEdit(data);
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
        Edit product
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product details, pricing, performance, and crochet pattern fields.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ep-name">Name</Label>
              <Input id="ep-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ep-type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="ep-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ").toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ep-niche">Niche</Label>
                <Select value={nicheId} onValueChange={setNicheId}>
                  <SelectTrigger id="ep-niche">
                    <SelectValue placeholder="Select niche" />
                  </SelectTrigger>
                  <SelectContent>
                    {niches.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ep-platform">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger id="ep-platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ep-price">Price ($)</Label>
                <Input
                  id="ep-price"
                  type="number"
                  min={0}
                  step={0.5}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ep-units">Units sold</Label>
                <Input
                  id="ep-units"
                  type="number"
                  min={0}
                  value={unitsSold}
                  onChange={(e) => setUnitsSold(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ep-revenue">Revenue ($)</Label>
                <Input
                  id="ep-revenue"
                  type="number"
                  min={0}
                  step={0.01}
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="ep-conv">Conversion rate (0–1)</Label>
                <Input
                  id="ep-conv"
                  type="number"
                  min={0}
                  max={1}
                  step={0.001}
                  value={conversionRate}
                  onChange={(e) => setConversionRate(e.target.value)}
                />
              </div>
            </div>

            {isCrochet && (
              <div className="rounded-md border border-violet-200 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/5 p-3 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-violet-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                    Crochet pattern details
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ep-diff">Difficulty</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger id="ep-diff">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {DIFFICULTY_OPTIONS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ep-sizes">Sizes</Label>
                    <Input
                      id="ep-sizes"
                      value={sizes}
                      onChange={(e) => setSizes(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="ep-gauge">Gauge</Label>
                    <Input
                      id="ep-gauge"
                      value={gauge}
                      onChange={(e) => setGauge(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="ep-materials">Materials</Label>
                    <Textarea
                      id="ep-materials"
                      value={materials}
                      onChange={(e) => setMaterials(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="ep-stitches">Stitches</Label>
                    <Textarea
                      id="ep-stitches"
                      value={stitches}
                      onChange={(e) => setStitches(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting || !name.trim()}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
