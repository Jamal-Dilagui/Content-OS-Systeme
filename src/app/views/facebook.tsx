"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  formatShortDate,
  statusBadgeClass,
} from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import {
  Facebook,
  Plus,
  Trash2,
  MoreHorizontal,
  Users,
  MessageSquare,
  Eye,
  MousePointerClick,
  Heart,
  CalendarClock,
  Sparkles,
  Rocket,
  AlertTriangle,
  Link as LinkIcon,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Types ----------
type FbPost = {
  id: string;
  pageId: string;
  caption: string | null;
  cta: string | null;
  url: string | null;
  imageUrl: string | null;
  status: string;
  scheduledDate: string | null;
  publishedDate: string | null;
  impressions: number;
  clicks: number;
  engagement: number;
  createdAt: string;
};

type FbPage = {
  id: string;
  name: string;
  nicheId: string | null;
  nicheName: string | null;
  websiteId: string | null;
  websiteName: string | null;
  websiteUrl: string | null;
  status: string;
  followers: number;
  postCount: number;
  posts: FbPost[];
  createdAt: string;
};

type FbData = {
  pages: FbPage[];
  niches: Array<{ id: string; name: string }>;
  websites: Array<{ id: string; name: string; url: string | null }>;
};

const POST_STATUSES = ["IDEA", "SCHEDULED", "PUBLISHED", "FAILED"];
const PAGE_STATUSES = ["ACTIVE", "PAUSED", "ARCHIVED"];

// ---------- Main view ----------
export function FacebookView() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addPageOpen, setAddPageOpen] = React.useState(false);
  const [selectedPageId, setSelectedPageId] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery<FbData>({
    queryKey: ["facebook"],
    queryFn: async () => {
      const res = await fetch("/api/facebook");
      if (!res.ok) throw new Error("Failed to load Facebook data");
      return res.json();
    },
  });

  // Auto-select first page when data loads
  React.useEffect(() => {
    if (data?.pages?.length && !selectedPageId) {
      setSelectedPageId(data.pages[0].id);
    }
    if (data?.pages?.length === 0) {
      setSelectedPageId(null);
    }
    // If selected page no longer exists, reset
    if (selectedPageId && data?.pages && !data.pages.some((p) => p.id === selectedPageId)) {
      setSelectedPageId(data.pages[0]?.id ?? null);
    }
  }, [data, selectedPageId]);

  const createPage = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, kind: "page" }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Failed to create page");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facebook"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Facebook page added" });
      setAddPageOpen(false);
    },
    onError: (e: Error) =>
      toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const createPost = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, kind: "post" }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Failed to create post");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facebook"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Post added to queue" });
    },
    onError: (e: Error) =>
      toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const updatePost = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/facebook/${id}?type=post`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facebook"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const updatePage = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/facebook/${id}?type=page`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facebook"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const deletePage = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/facebook/${id}?type=page`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facebook"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Page removed" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/facebook/${id}?type=post`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facebook"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Post removed" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const pages = data?.pages ?? [];
  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null;

  // Aggregate KPIs
  const totalFollowers = pages.reduce((s, p) => s + p.followers, 0);
  const totalPosts = pages.reduce((s, p) => s + p.posts.length, 0);
  const totalPublished = pages.reduce(
    (s, p) => s + p.posts.filter((post) => post.status === "PUBLISHED").length,
    0
  );
  const totalScheduled = pages.reduce(
    (s, p) => s + p.posts.filter((post) => post.status === "SCHEDULED").length,
    0
  );
  const totalImpressions = pages.reduce(
    (s, p) => s + p.posts.reduce((ss, post) => ss + post.impressions, 0),
    0
  );
  const totalClicks = pages.reduce(
    (s, p) => s + p.posts.reduce((ss, post) => ss + post.clicks, 0),
    0
  );
  const avgEngagement =
    totalPublished > 0
      ? pages.reduce(
          (s, p) =>
            s +
            p.posts
              .filter((post) => post.status === "PUBLISHED")
              .reduce((ss, post) => ss + post.engagement, 0),
          0
        ) / Math.max(1, totalPublished)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Facebook className="h-5 w-5" />}
        title="Facebook"
        description="Optional / future channel. Manage Facebook pages and a per-page post queue with scheduled publishing and performance tracking."
        actions={
          <AddPageDialog
            open={addPageOpen}
            onOpenChange={setAddPageOpen}
            niches={data?.niches ?? []}
            websites={data?.websites ?? []}
            onCreate={(d) => createPage.mutate(d)}
            submitting={createPage.isPending}
          />
        }
      />

      {/* Future-channel note */}
      <Card className="p-4 gap-2 border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Optional / Future Channel
              </span>
              <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-500/30 dark:text-amber-400">
                <Rocket className="h-3 w-3 mr-1" />
                Expansion
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Facebook organic reach is currently limited in this business. This module is provided for
              future growth experiments. Per the most recent monthly review, Facebook posting frequency
              was reduced. Treat this as a planning surface — track pages, queue posts, and capture
              performance when you decide to invest here.
            </p>
          </div>
        </div>
      </Card>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Pages"
              value={formatNumber(pages.length)}
              hint={`${pages.filter((p) => p.status === "ACTIVE").length} active`}
              icon={<Facebook className="h-4 w-4" />}
              accent="sky"
            />
            <StatCard
              label="Followers"
              value={formatNumber(totalFollowers, { compact: true })}
              hint="across all pages"
              icon={<Users className="h-4 w-4" />}
              accent="violet"
            />
            <StatCard
              label="Posts Queued"
              value={formatNumber(totalPosts)}
              hint={`${totalScheduled} scheduled`}
              icon={<MessageSquare className="h-4 w-4" />}
              accent="amber"
            />
            <StatCard
              label="Posts Published"
              value={formatNumber(totalPublished)}
              hint="all-time"
              icon={<Sparkles className="h-4 w-4" />}
              accent="emerald"
            />
            <StatCard
              label="Impressions"
              value={formatNumber(totalImpressions, { compact: true })}
              hint={`${formatNumber(totalClicks, { compact: true })} clicks`}
              icon={<Eye className="h-4 w-4" />}
              accent="rose"
            />
            <StatCard
              label="Avg Engagement"
              value={formatPercent(avgEngagement * 100, 2)}
              hint="per published post"
              icon={<Heart className="h-4 w-4" />}
              accent="amber"
            />
          </>
        )}
      </div>

      {/* Pages list */}
      <Card className="p-4 gap-3">
        <SectionHeader
          title="Facebook Pages"
          description={`${pages.length} page(s) — click to view the post queue`}
          icon={<Facebook className="h-4 w-4" />}
        />
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : pages.length === 0 ? (
          <EmptyState
            icon={<Facebook className="h-8 w-8" />}
            title="No Facebook pages yet"
            description="Add a page to start planning posts. This is an optional channel — only invest here if your audience is on Facebook."
            action={
              <AddPageDialog
                open={addPageOpen}
                onOpenChange={setAddPageOpen}
                niches={data?.niches ?? []}
                websites={data?.websites ?? []}
                onCreate={(d) => createPage.mutate(d)}
                submitting={createPage.isPending}
              />
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((p) => {
              const isSelected = selectedPageId === p.id;
              return (
                <Card
                  key={p.id}
                  className={cn(
                    "p-4 gap-2 cursor-pointer transition-all hover:border-primary/40",
                    isSelected && "border-primary ring-1 ring-primary/20"
                  )}
                  onClick={() => setSelectedPageId(p.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{p.name}</h3>
                        <StatusBadge status={p.status} />
                      </div>
                      {p.websiteName && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {p.websiteName}
                        </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-52"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EditPageDialog
                          page={p}
                          niches={data?.niches ?? []}
                          websites={data?.websites ?? []}
                          onEdit={(d) => updatePage.mutate({ id: p.id, data: d })}
                          submitting={updatePage.isPending}
                        />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:dark:text-rose-400"
                          onSelect={() => {
                            if (
                              confirm(
                                `Remove "${p.name}"? This also deletes its ${p.postCount} post(s).`
                              )
                            ) {
                              deletePage.mutate(p.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete page
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <InfoLine
                      label="Followers"
                      value={formatNumber(p.followers, { compact: true })}
                    />
                    <InfoLine label="Posts" value={formatNumber(p.postCount)} />
                    <InfoLine
                      label="Published"
                      value={
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {p.posts.filter((post) => post.status === "PUBLISHED").length}
                        </span>
                      }
                    />
                  </div>
                  {p.nicheName && (
                    <Badge variant="outline" className="font-normal w-fit">
                      {p.nicheName}
                    </Badge>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* Selected page post queue */}
      {selectedPage && (
        <Card className="p-4 gap-3">
          <SectionHeader
            title={`Post Queue — ${selectedPage.name}`}
            description={`${selectedPage.posts.length} post(s). Statuses: IDEA → SCHEDULED → PUBLISHED → FAILED`}
            icon={<MessageSquare className="h-4 w-4" />}
            actions={
              <AddPostDialog
                pageId={selectedPage.id}
                onPageCreate={(d) => createPost.mutate(d)}
                submitting={createPost.isPending}
              />
            }
          />
          {selectedPage.posts.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-8 w-8" />}
              title="No posts queued"
              description="Capture post ideas and schedule them here. The queue supports idea → scheduled → published → failed."
              action={
                <AddPostDialog
                  pageId={selectedPage.id}
                  onPageCreate={(d) => createPost.mutate(d)}
                  submitting={createPost.isPending}
                />
              }
            />
          ) : (
            <div className="max-h-[34rem] overflow-y-auto -mx-4 px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Caption</TableHead>
                    <TableHead className="min-w-[140px]">Status</TableHead>
                    <TableHead className="hidden md:table-cell">CTA</TableHead>
                    <TableHead className="hidden lg:table-cell">Scheduled</TableHead>
                    <TableHead className="hidden xl:table-cell">Published</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Clicks</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Engagement</TableHead>
                    <TableHead className="w-[3rem] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPage.posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="font-medium truncate max-w-[260px]" title={post.caption ?? ""}>
                          {post.caption || (
                            <span className="text-muted-foreground italic">No caption</span>
                          )}
                        </div>
                        {post.url && (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-0.5 truncate max-w-[260px]"
                          >
                            <LinkIcon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{post.url}</span>
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={post.status}
                          onValueChange={(v) =>
                            updatePost.mutate({ id: post.id, data: { status: v } })
                          }
                        >
                          <SelectTrigger className="h-8 w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {POST_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s.toLowerCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {post.cta ? (
                          <Badge variant="outline" className="font-normal">
                            {post.cta}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {post.scheduledDate ? formatShortDate(post.scheduledDate) : "—"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {post.publishedDate ? formatShortDate(post.publishedDate) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(post.impressions, { compact: true })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums hidden sm:table-cell">
                        {formatNumber(post.clicks)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums hidden md:table-cell">
                        {formatPercent(post.engagement * 100, 2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <EditPostDialog
                              post={post}
                              onEdit={(d) => updatePost.mutate({ id: post.id, data: d })}
                              submitting={updatePost.isPending}
                            />
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:dark:text-rose-400"
                              onSelect={() => {
                                if (confirm("Remove this post?")) deletePost.mutate(post.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete post
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
      )}
    </div>
  );
}

// ---------- Add Page dialog ----------
function AddPageDialog({
  open,
  onOpenChange,
  niches,
  websites,
  onCreate,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  niches: Array<{ id: string; name: string }>;
  websites: Array<{ id: string; name: string; url: string | null }>;
  onCreate: (data: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [name, setName] = React.useState("");
  const [nicheId, setNicheId] = React.useState("");
  const [websiteId, setWebsiteId] = React.useState("");
  const [status, setStatus] = React.useState("ACTIVE");
  const [followers, setFollowers] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setName("");
      setNicheId("");
      setWebsiteId("");
      setStatus("ACTIVE");
      setFollowers("");
    }
  }, [open]);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      nicheId: nicheId || null,
      websiteId: websiteId || null,
      status,
      followers: Number(followers) || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add Page
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Facebook Page</DialogTitle>
          <DialogDescription>
            Track a Facebook page (optional / future channel). You can add posts to its queue next.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fb-name">Page name *</Label>
            <Input
              id="fb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Crochet Daily"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fb-niche">Niche</Label>
              <Select value={nicheId} onValueChange={setNicheId}>
                <SelectTrigger id="fb-niche">
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
              <Label htmlFor="fb-website">Website</Label>
              <Select value={websiteId} onValueChange={setWebsiteId}>
                <SelectTrigger id="fb-website">
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
              <Label htmlFor="fb-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="fb-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fb-followers">Followers</Label>
              <Input
                id="fb-followers"
                type="number"
                min={0}
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={submitting || !name.trim()}>
            {submitting ? "Creating…" : "Create Page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Edit Page dialog (rendered inside dropdown) ----------
function EditPageDialog({
  page,
  niches,
  websites,
  onEdit,
  submitting,
}: {
  page: FbPage;
  niches: Array<{ id: string; name: string }>;
  websites: Array<{ id: string; name: string; url: string | null }>;
  onEdit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(page.name);
  const [nicheId, setNicheId] = React.useState(page.nicheId ?? "");
  const [websiteId, setWebsiteId] = React.useState(page.websiteId ?? "");
  const [status, setStatus] = React.useState(page.status);
  const [followers, setFollowers] = React.useState(String(page.followers));

  React.useEffect(() => {
    if (open) {
      setName(page.name);
      setNicheId(page.nicheId ?? "");
      setWebsiteId(page.websiteId ?? "");
      setStatus(page.status);
      setFollowers(String(page.followers));
    }
  }, [open, page]);

  const handleSave = () => {
    if (!name.trim()) return;
    onEdit({
      name: name.trim(),
      nicheId: nicheId || null,
      websiteId: websiteId || null,
      status,
      followers: Number(followers) || 0,
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
        Edit page
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Facebook Page</DialogTitle>
            <DialogDescription>Update page name, niche, website, status, and followers.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ep-name">Page name</Label>
              <Input id="ep-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <Label htmlFor="ep-website">Website</Label>
                <Select value={websiteId} onValueChange={setWebsiteId}>
                  <SelectTrigger id="ep-website">
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
                <Label htmlFor="ep-status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="ep-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ep-followers">Followers</Label>
                <Input
                  id="ep-followers"
                  type="number"
                  min={0}
                  value={followers}
                  onChange={(e) => setFollowers(e.target.value)}
                />
              </div>
            </div>
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

// ---------- Add Post dialog ----------
function AddPostDialog({
  pageId,
  onPageCreate,
  submitting,
}: {
  pageId: string;
  onPageCreate: (data: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [caption, setCaption] = React.useState("");
  const [cta, setCta] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [status, setStatus] = React.useState("IDEA");
  const [scheduledDate, setScheduledDate] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setCaption("");
      setCta("");
      setUrl("");
      setImageUrl("");
      setStatus("IDEA");
      setScheduledDate("");
    }
  }, [open]);

  const handleCreate = () => {
    if (!caption.trim() && !url.trim()) return;
    onPageCreate({
      pageId,
      caption: caption.trim() || null,
      cta: cta.trim() || null,
      url: url.trim() || null,
      imageUrl: imageUrl.trim() || null,
      status,
      scheduledDate: scheduledDate || null,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" />
          Add Post
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Facebook Post</DialogTitle>
          <DialogDescription>
            Queue a new post for this page. Status can be idea, scheduled, published, or failed.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fp-caption">Caption</Label>
            <Textarea
              id="fp-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write the post caption…"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fp-cta">CTA</Label>
              <Input
                id="fp-cta"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="e.g. Shop now"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fp-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="fp-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fp-url">URL</Label>
            <Input
              id="fp-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fp-image">Image URL (optional)</Label>
              <Input
                id="fp-image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fp-scheduled">Scheduled date</Label>
              <Input
                id="fp-scheduled"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={submitting || (!caption.trim() && !url.trim())}>
            {submitting ? "Creating…" : "Add to queue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Edit Post dialog (rendered inside dropdown) ----------
function EditPostDialog({
  post,
  onEdit,
  submitting,
}: {
  post: FbPost;
  onEdit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [caption, setCaption] = React.useState(post.caption ?? "");
  const [cta, setCta] = React.useState(post.cta ?? "");
  const [url, setUrl] = React.useState(post.url ?? "");
  const [imageUrl, setImageUrl] = React.useState(post.imageUrl ?? "");
  const [status, setStatus] = React.useState(post.status);
  const [scheduledDate, setScheduledDate] = React.useState(
    post.scheduledDate ? toLocalInput(post.scheduledDate) : ""
  );
  const [impressions, setImpressions] = React.useState(String(post.impressions));
  const [clicks, setClicks] = React.useState(String(post.clicks));
  const [engagement, setEngagement] = React.useState(String(post.engagement));

  React.useEffect(() => {
    if (open) {
      setCaption(post.caption ?? "");
      setCta(post.cta ?? "");
      setUrl(post.url ?? "");
      setImageUrl(post.imageUrl ?? "");
      setStatus(post.status);
      setScheduledDate(post.scheduledDate ? toLocalInput(post.scheduledDate) : "");
      setImpressions(String(post.impressions));
      setClicks(String(post.clicks));
      setEngagement(String(post.engagement));
    }
  }, [open, post]);

  const handleSave = () => {
    onEdit({
      caption: caption.trim() || null,
      cta: cta.trim() || null,
      url: url.trim() || null,
      imageUrl: imageUrl.trim() || null,
      status,
      scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : null,
      impressions: Number(impressions) || 0,
      clicks: Number(clicks) || 0,
      engagement: Number(engagement) || 0,
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
        Edit post
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>
              Update caption, CTA, URL, scheduling, and performance metrics.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ep-caption">Caption</Label>
              <Textarea
                id="ep-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ep-cta">CTA</Label>
                <Input id="ep-cta" value={cta} onChange={(e) => setCta(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ep-status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="ep-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POST_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ep-url">URL</Label>
              <Input id="ep-url" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ep-image">Image URL</Label>
                <Input
                  id="ep-image"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ep-scheduled">Scheduled date</Label>
                <Input
                  id="ep-scheduled"
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ep-imp">Impressions</Label>
                <Input
                  id="ep-imp"
                  type="number"
                  min={0}
                  value={impressions}
                  onChange={(e) => setImpressions(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ep-clicks">Clicks</Label>
                <Input
                  id="ep-clicks"
                  type="number"
                  min={0}
                  value={clicks}
                  onChange={(e) => setClicks(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ep-eng">Engagement (0–1)</Label>
                <Input
                  id="ep-eng"
                  type="number"
                  min={0}
                  max={1}
                  step={0.001}
                  value={engagement}
                  onChange={(e) => setEngagement(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Convert an ISO date to a value suitable for an <input type="datetime-local">.
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
