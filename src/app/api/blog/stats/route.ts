import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Aggregated blog KPIs: articles by stage, traffic, clicks, revenue,
// top pages, top keywords, multi-website breakdown, and articles published
// over the last 12 weeks (for the trend chart).
export async function GET() {
  const articles = await db.blogArticle.findMany({
    include: {
      website: { select: { id: true, name: true, url: true } },
    },
  });

  const websites = await db.website.findMany({
    select: { id: true, name: true, url: true },
    orderBy: { name: "asc" },
  });

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

  // Articles planned = anything that is not yet PUBLISHED/PROMOTED (i.e. "in production")
  const publishedSet = new Set(["PUBLISHED", "PROMOTED"]);
  const articlesPlanned = articles.filter((a) => !publishedSet.has(a.status)).length;
  // Articles "Completed" = READY + PUBLISHED + PROMOTED (ready for primetime)
  const completedSet = new Set(["READY", "PUBLISHED", "PROMOTED"]);
  const articlesCompleted = articles.filter((a) => completedSet.has(a.status)).length;
  const articlesPublished = articles.filter((a) => publishedSet.has(a.status)).length;

  const totalOrganicTraffic = articles.reduce((s, a) => s + a.organicTraffic, 0);
  const totalClicks = articles.reduce((s, a) => s + a.clicks, 0);
  const totalAffiliateClicks = articles.reduce((s, a) => s + a.affiliateClicks, 0);
  const totalProductClicks = articles.reduce((s, a) => s + a.productClicks, 0);
  const totalRevenue = articles.reduce((s, a) => s + a.revenue, 0);

  // Production target: 5 articles/day → ~35/week
  const dailyTarget = 5;

  // Status distribution (pipeline)
  const statusDistribution = ARTICLE_STATUSES.map((s) => ({
    status: s,
    count: articles.filter((a) => a.status === s).length,
  }));

  // Top pages by traffic
  const topPages = articles
    .filter((a) => a.organicTraffic > 0)
    .sort((a, b) => b.organicTraffic - a.organicTraffic)
    .slice(0, 8)
    .map((a) => ({
      id: a.id,
      title: a.title,
      url: a.url,
      websiteName: a.website?.name ?? null,
      organicTraffic: a.organicTraffic,
      clicks: a.clicks,
      affiliateClicks: a.affiliateClicks,
      productClicks: a.productClicks,
      revenue: a.revenue,
    }));

  // Top keywords by traffic (group by keyword)
  const keywordMap = new Map<
    string,
    { keyword: string; articles: number; traffic: number; clicks: number; revenue: number }
  >();
  for (const a of articles) {
    const k = (a.keyword || "").trim();
    if (!k) continue;
    const cur = keywordMap.get(k) ?? {
      keyword: k,
      articles: 0,
      traffic: 0,
      clicks: 0,
      revenue: 0,
    };
    cur.articles += 1;
    cur.traffic += a.organicTraffic;
    cur.clicks += a.clicks;
    cur.revenue += a.revenue;
    keywordMap.set(k, cur);
  }
  const topKeywords = Array.from(keywordMap.values())
    .sort((a, b) => b.traffic - a.traffic)
    .slice(0, 8);

  // Per-website breakdown
  const byWebsite = websites.map((w) => {
    const wArticles = articles.filter((a) => a.websiteId === w.id);
    return {
      id: w.id,
      name: w.name,
      url: w.url,
      articles: wArticles.length,
      published: wArticles.filter((a) => publishedSet.has(a.status)).length,
      inProduction: wArticles.filter((a) => !publishedSet.has(a.status)).length,
      organicTraffic: wArticles.reduce((s, a) => s + a.organicTraffic, 0),
      clicks: wArticles.reduce((s, a) => s + a.clicks, 0),
      affiliateClicks: wArticles.reduce((s, a) => s + a.affiliateClicks, 0),
      productClicks: wArticles.reduce((s, a) => s + a.productClicks, 0),
      revenue: wArticles.reduce((s, a) => s + a.revenue, 0),
    };
  });

  // Articles published over the last 12 weeks (by ISO week)
  const now = new Date();
  const weeks: Array<{ key: string; label: string; published: number; traffic: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - i * 7); // Sunday as week start
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const published = articles.filter((a) => {
      if (!a.publishedDate) return false;
      const d = new Date(a.publishedDate);
      return d >= weekStart && d < weekEnd;
    }).length;
    const traffic = articles
      .filter((a) => {
        if (!a.publishedDate) return false;
        const d = new Date(a.publishedDate);
        return d >= weekStart && d < weekEnd;
      })
      .reduce((s, a) => s + a.organicTraffic, 0);

    const label = `${weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
    weeks.push({ key: `${weekStart.getTime()}`, label, published, traffic });
  }

  return NextResponse.json({
    kpis: {
      articlesPlanned,
      articlesCompleted,
      articlesPublished,
      totalArticles: articles.length,
      totalOrganicTraffic,
      totalClicks,
      totalAffiliateClicks,
      totalProductClicks,
      totalRevenue,
      dailyTarget,
      weeklyTarget: dailyTarget * 7,
    },
    statusDistribution,
    topPages,
    topKeywords,
    byWebsite,
    weeks,
    websites,
  });
}
