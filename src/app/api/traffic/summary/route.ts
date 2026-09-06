import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ---------- Helpers ----------
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfPrevMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function growth(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

const SOURCES = ["PINTEREST", "GOOGLE", "FACEBOOK", "DIRECT", "OTHER"];

// GET — traffic summary
export async function GET() {
  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);
  const prevStart = startOfPrevMonth(now);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const allTraffic = await db.trafficAnalytics.findMany({ orderBy: { date: "asc" } });
  const monthTraffic = allTraffic.filter((t) => t.date >= mStart && t.date <= mEnd);
  const prevMonthTraffic = allTraffic.filter((t) => t.date >= prevStart && t.date <= prevEnd);

  // ---- Totals (this month) ----
  const totalSessions = monthTraffic.reduce((s, t) => s + t.sessions, 0);
  const totalUsers = monthTraffic.reduce((s, t) => s + t.users, 0);
  const totalPageViews = monthTraffic.reduce((s, t) => s + t.pageViews, 0);
  const totalClicks = monthTraffic.reduce((s, t) => s + t.clicks, 0);
  const totalConversions = monthTraffic.reduce((s, t) => s + t.conversions, 0);
  const totalRevenue = monthTraffic.reduce((s, t) => s + t.revenue, 0);

  const prevTotalSessions = prevMonthTraffic.reduce((s, t) => s + t.sessions, 0);
  const trafficGrowth = growth(totalSessions, prevTotalSessions);

  const revenuePerVisitor = totalUsers > 0 ? totalRevenue / totalUsers : 0;
  const conversionRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0;

  // ---- By source (this month) ----
  const bySource = SOURCES.map((src) => {
    const srcEntries = monthTraffic.filter((t) => t.source === src);
    const sessions = srcEntries.reduce((s, t) => s + t.sessions, 0);
    const users = srcEntries.reduce((s, t) => s + t.users, 0);
    const pageViews = srcEntries.reduce((s, t) => s + t.pageViews, 0);
    const clicks = srcEntries.reduce((s, t) => s + t.clicks, 0);
    const conversions = srcEntries.reduce((s, t) => s + t.conversions, 0);
    const revenue = srcEntries.reduce((s, t) => s + t.revenue, 0);
    const share = totalSessions > 0 ? (sessions / totalSessions) * 100 : 0;
    const revPerVisitor = users > 0 ? revenue / users : 0;
    const convRate = sessions > 0 ? (conversions / sessions) * 100 : 0;
    return {
      source: src,
      sessions,
      users,
      pageViews,
      clicks,
      conversions,
      revenue: Math.round(revenue),
      share: round1(share),
      revenuePerVisitor: Math.round(revPerVisitor * 100) / 100,
      conversionRate: round1(convRate),
    };
  });
  const bySourceWithShare = bySource
    .filter((s) => s.sessions > 0 || s.users > 0 || s.revenue > 0)
    .sort((a, b) => b.sessions - a.sessions);

  // ---- Monthly trend (last 6 months) ----
  const monthlyTrend: Array<{ key: string; label: string; sessions: number; users: number; conversions: number; revenue: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthEntries = allTraffic.filter((t) => t.date >= d && t.date <= e);
    monthlyTrend.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      sessions: monthEntries.reduce((s, t) => s + t.sessions, 0),
      users: monthEntries.reduce((s, t) => s + t.users, 0),
      conversions: monthEntries.reduce((s, t) => s + t.conversions, 0),
      revenue: Math.round(monthEntries.reduce((s, t) => s + t.revenue, 0)),
    });
  }

  // ---- Source comparison (all-time per source) ----
  const sourceComparison = SOURCES.map((src) => {
    const srcEntries = allTraffic.filter((t) => t.source === src);
    return {
      source: src,
      sessions: srcEntries.reduce((s, t) => s + t.sessions, 0),
      users: srcEntries.reduce((s, t) => s + t.users, 0),
      clicks: srcEntries.reduce((s, t) => s + t.clicks, 0),
      conversions: srcEntries.reduce((s, t) => s + t.conversions, 0),
      revenue: Math.round(srcEntries.reduce((s, t) => s + t.revenue, 0)),
    };
  }).filter((s) => s.sessions > 0);

  // ---- isDemo (rough detection: seeded entries have users = floor(sessions * 0.82)) ----
  const isDemo = allTraffic.length > 0 && allTraffic.some((t) => t.users === Math.floor(t.sessions * 0.82));

  return NextResponse.json({
    now: now.toISOString(),
    isDemo,
    totals: {
      sessions: totalSessions,
      users: totalUsers,
      pageViews: totalPageViews,
      clicks: totalClicks,
      conversions: totalConversions,
      revenue: Math.round(totalRevenue),
    },
    growth: {
      trafficGrowth: round1(trafficGrowth),
      prevMonthSessions: prevTotalSessions,
    },
    revenuePerVisitor: Math.round(revenuePerVisitor * 100) / 100,
    conversionRate: round1(conversionRate),
    bySource: bySourceWithShare,
    monthlyTrend,
    sourceComparison,
    count: monthTraffic.length,
  });
}
