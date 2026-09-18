import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

// Pipeline definitions — the clear "states" each content type moves through
export const PIN_STATES = ["IDEA", "BRIEF", "DESIGN", "READY", "SCHEDULED", "PUBLISHED", "FAILED", "REVISE"];
export const ARTICLE_STATES = ["IDEA", "KEYWORD", "BRIEF", "OUTLINE", "WRITING", "SEO", "REVIEW", "READY", "PUBLISHED", "PROMOTED"];
export const PRODUCT_STATES = ["IDEA", "VALIDATION", "CREATION", "DESIGN", "PDF", "LISTING", "SEO", "PUBLISH", "LIVE", "OPTIMIZATION"];
export const POST_STATES = ["IDEA", "SCHEDULED", "PUBLISHED", "FAILED"];

export async function GET() {
  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);

  const pins = await db.pinterestPin.findMany();
  const articles = await db.blogArticle.findMany();
  const products = await db.digitalProduct.findMany();
  const posts = await db.facebookPost.findMany();
  const accounts = await db.pinterestAccount.findMany({ orderBy: { orderIndex: "asc" } });
  const tasks = await db.task.findMany();

  // ---- Pipeline state counts ----
  const pinPipeline = PIN_STATES.map((s) => ({ state: s, count: pins.filter((p) => p.status === s).length }));
  const articlePipeline = ARTICLE_STATES.map((s) => ({ state: s, count: articles.filter((a) => a.status === s).length }));
  const productPipeline = PRODUCT_STATES.map((s) => ({ state: s, count: products.filter((p) => p.status === s).length }));
  const postPipeline = POST_STATES.map((s) => ({ state: s, count: posts.filter((p) => p.status === s).length }));

  // ---- This month published counts ----
  const monthPinsPublished = pins.filter((p) => p.status === "PUBLISHED" && p.publishedDate && p.publishedDate >= mStart && p.publishedDate <= mEnd).length;
  const monthArticlesPublished = articles.filter((a) => (a.status === "PUBLISHED" || a.status === "PROMOTED") && a.publishedDate && a.publishedDate >= mStart && a.publishedDate <= mEnd).length;
  const monthProductsLaunched = products.filter((p) => p.status === "LIVE" && p.publishedDate && p.publishedDate >= mStart && p.publishedDate <= mEnd).length;
  const monthPostsPublished = posts.filter((p) => p.status === "PUBLISHED" && p.publishedDate && p.publishedDate >= mStart && p.publishedDate <= mEnd).length;

  // ---- Pinterest account of the day (rotation) ----
  const activeAccounts = accounts.filter((a) => a.status === "ACTIVE");
  const accountOfDay = activeAccounts.length > 0 ? activeAccounts[0] : null;
  const pinsRemaining = accountOfDay ? Math.max(0, accountOfDay.pinsPerBatch - accountOfDay.pinsCompleted) : 0;

  // ---- Tasks ----
  const overdueTasks = tasks.filter((t) => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < now);
  const todayTasks = tasks
    .filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS")
    .sort((a, b) => {
      const po = { P0: 0, P1: 1, P2: 2, P3: 3 }[a.priority] ?? 2;
      const pb = { P0: 0, P1: 1, P2: 2, P3: 3 }[b.priority] ?? 2;
      if (po !== pb) return po - pb;
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return ad - bd;
    })
    .slice(0, 6);

  // ---- Alerts (process-focused, no finance) ----
  const alerts: Array<{ type: string; severity: "high" | "medium" | "low"; message: string; action?: string }> = [];
  if (overdueTasks.length > 0) alerts.push({ type: "overdue", severity: "high", message: `${overdueTasks.length} overdue task(s)`, action: "Review in Tasks" });
  const failedPins = pins.filter((p) => p.status === "FAILED").length;
  if (failedPins > 0) alerts.push({ type: "failed", severity: "high", message: `${failedPins} pin(s) failed to publish`, action: "Review in Pinterest" });
  const failedPosts = posts.filter((p) => p.status === "FAILED").length;
  if (failedPosts > 0) alerts.push({ type: "failed", severity: "medium", message: `${failedPosts} Facebook post(s) failed`, action: "Review in Facebook" });
  const blockedTasks = tasks.filter((t) => t.status === "BLOCKED").length;
  if (blockedTasks > 0) alerts.push({ type: "blocked", severity: "medium", message: `${blockedTasks} blocked task(s)`, action: "Review in Tasks" });
  if (accountOfDay && pinsRemaining > 0) alerts.push({ type: "today", severity: "low", message: `${pinsRemaining} pins remaining for ${accountOfDay.name} today`, action: "Open Pinterest" });

  // ---- Next account ----
  const nextAccount = activeAccounts.length > 1 ? activeAccounts[1] : activeAccounts[0] ?? null;

  // ---- 6-month production trend (content volume, not finance) ----
  const months: Array<{ label: string; pins: number; articles: number; products: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    months.push({
      label: d.toLocaleDateString("en-US", { month: "short" }),
      pins: pins.filter((p) => p.status === "PUBLISHED" && p.publishedDate && p.publishedDate >= d && p.publishedDate <= e).length,
      articles: articles.filter((a) => (a.status === "PUBLISHED" || a.status === "PROMOTED") && a.publishedDate && a.publishedDate >= d && a.publishedDate <= e).length,
      products: products.filter((p) => p.status === "LIVE" && p.publishedDate && p.publishedDate >= d && p.publishedDate <= e).length,
    });
  }

  // ---- Counts summary ----
  const counts = {
    accounts: accounts.length,
    activeAccounts: activeAccounts.length,
    totalPins: pins.length,
    publishedPins: pins.filter((p) => p.status === "PUBLISHED").length,
    scheduledPins: pins.filter((p) => p.status === "SCHEDULED").length,
    readyPins: pins.filter((p) => p.status === "READY").length,
    totalArticles: articles.length,
    publishedArticles: articles.filter((a) => a.status === "PUBLISHED" || a.status === "PROMOTED").length,
    totalProducts: products.length,
    liveProducts: products.filter((p) => p.status === "LIVE").length,
    totalPosts: posts.length,
    publishedPosts: posts.filter((p) => p.status === "PUBLISHED").length,
    openTasks: tasks.filter((t) => t.status !== "DONE").length,
    overdueTasks: overdueTasks.length,
  };

  return NextResponse.json({
    now: now.toISOString(),
    pipelines: {
      pins: pinPipeline,
      articles: articlePipeline,
      products: productPipeline,
      posts: postPipeline,
    },
    month: {
      pinsPublished: monthPinsPublished,
      articlesPublished: monthArticlesPublished,
      productsLaunched: monthProductsLaunched,
      postsPublished: monthPostsPublished,
    },
    today: {
      accountOfDay: accountOfDay
        ? { id: accountOfDay.id, name: accountOfDay.name, pinsPerBatch: accountOfDay.pinsPerBatch, pinsCompleted: accountOfDay.pinsCompleted, pinsRemaining, cycle: accountOfDay.currentCycle }
        : null,
      nextAccount: nextAccount ? { id: nextAccount.id, name: nextAccount.name } : null,
      tasks: todayTasks.map((t) => ({ id: t.id, title: t.title, priority: t.priority, status: t.status, category: t.category, dueDate: t.dueDate })),
    },
    alerts,
    months,
    counts,
  });
}
