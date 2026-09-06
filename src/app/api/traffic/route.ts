import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const SOURCES = ["PINTEREST", "GOOGLE", "FACEBOOK", "DIRECT", "OTHER"];

// GET — list traffic entries (filterable by source), with totals
export async function GET(req: Request) {
  const url = new URL(req.url);
  const source = url.searchParams.get("source"); // PINTEREST | GOOGLE | FACEBOOK | DIRECT | OTHER
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.min(500, Math.max(1, Number(limitParam))) : 200;

  const where: { source?: string } = {};
  if (source && source !== "ALL" && SOURCES.includes(source)) {
    where.source = source;
  }

  const entries = await db.trafficAnalytics.findMany({
    where,
    orderBy: [{ date: "desc" }, { source: "asc" }],
    take: limit,
  });

  const totals = {
    sessions: entries.reduce((s, e) => s + e.sessions, 0),
    users: entries.reduce((s, e) => s + e.users, 0),
    pageViews: entries.reduce((s, e) => s + e.pageViews, 0),
    clicks: entries.reduce((s, e) => s + e.clicks, 0),
    conversions: entries.reduce((s, e) => s + e.conversions, 0),
    revenue: Math.round(entries.reduce((s, e) => s + e.revenue, 0)),
  };

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      date: e.date.toISOString(),
      source: e.source,
      sessions: e.sessions,
      users: e.users,
      pageViews: e.pageViews,
      clicks: e.clicks,
      conversions: e.conversions,
      revenue: Math.round(e.revenue),
      createdAt: e.createdAt.toISOString(),
    })),
    totals,
    count: entries.length,
    sources: SOURCES,
  });
}

// POST — add a traffic entry
export async function POST(req: Request) {
  const body = await req.json();
  const { date, source, sessions, users, pageViews, clicks, conversions, revenue } = body;

  if (!date || typeof date !== "string") {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  const sourceVal = (source || "OTHER").trim();
  if (!SOURCES.includes(sourceVal)) {
    return NextResponse.json({ error: `source must be one of: ${SOURCES.join(", ")}` }, { status: 400 });
  }

  const numOr0 = (v: unknown, def = 0) => {
    const n = Number(v);
    return isNaN(n) ? def : n;
  };

  const entry = await db.trafficAnalytics.create({
    data: {
      date: parsedDate,
      source: sourceVal,
      sessions: Math.max(0, Math.floor(numOr0(sessions))),
      users: Math.max(0, Math.floor(numOr0(users))),
      pageViews: Math.max(0, Math.floor(numOr0(pageViews))),
      clicks: Math.max(0, Math.floor(numOr0(clicks))),
      conversions: Math.max(0, Math.floor(numOr0(conversions))),
      revenue: Math.max(0, numOr0(revenue)),
    },
  });

  return NextResponse.json(
    {
      id: entry.id,
      date: entry.date.toISOString(),
      source: entry.source,
      sessions: entry.sessions,
      users: entry.users,
      pageViews: entry.pageViews,
      clicks: entry.clicks,
      conversions: entry.conversions,
      revenue: Math.round(entry.revenue),
      createdAt: entry.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
