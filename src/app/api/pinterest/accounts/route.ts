import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET — list all Pinterest accounts (ordered by rotation orderIndex) with stats.
export async function GET() {
  const accounts = await db.pinterestAccount.findMany({
    orderBy: { orderIndex: "asc" },
    include: {
      niche: { select: { id: true, name: true } },
      website: { select: { id: true, name: true } },
      boards: { select: { id: true, name: true } },
      _count: { select: { pins: true } },
    },
  });

  const pins = await db.pinterestPin.findMany();

  const stats = new Map<
    string,
    { impressions: number; saves: number; outboundClicks: number; pinsPublished: number }
  >();
  for (const p of pins) {
    const s = stats.get(p.accountId) ?? {
      impressions: 0,
      saves: 0,
      outboundClicks: 0,
      pinsPublished: 0,
    };
    s.impressions += p.impressions;
    s.saves += p.saves;
    s.outboundClicks += p.outboundClicks;
    if (p.status === "PUBLISHED") s.pinsPublished += 1;
    stats.set(p.accountId, s);
  }

  return NextResponse.json(
    accounts.map((a) => ({
      id: a.id,
      name: a.name,
      nicheId: a.nicheId,
      nicheName: a.niche?.name ?? null,
      websiteId: a.websiteId,
      websiteName: a.website?.name ?? null,
      targetAudience: a.targetAudience,
      status: a.status,
      priority: a.priority,
      orderIndex: a.orderIndex,
      currentCycle: a.currentCycle,
      pinsPerBatch: a.pinsPerBatch,
      pinsCompleted: a.pinsCompleted,
      pinsPublished: a.pinsPublished,
      lastWorkedDate: a.lastWorkedDate,
      nextWorkDate: a.nextWorkDate,
      trafficGenerated: a.trafficGenerated,
      revenueGenerated: a.revenueGenerated,
      boards: a.boards,
      pinCount: a._count.pins,
      impressions: stats.get(a.id)?.impressions ?? 0,
      saves: stats.get(a.id)?.saves ?? 0,
      outboundClicks: stats.get(a.id)?.outboundClicks ?? 0,
      actualPinsPublished: stats.get(a.id)?.pinsPublished ?? 0,
      createdAt: a.createdAt,
    }))
  );
}

// POST — create a new Pinterest account (auto-appended to the end of the rotation queue).
export async function POST(req: Request) {
  const body = await req.json();
  const { name, nicheId, websiteId, targetAudience, status, priority, pinsPerBatch } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const maxOrder = await db.pinterestAccount.aggregate({ _max: { orderIndex: true } });
  const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

  const account = await db.pinterestAccount.create({
    data: {
      name: name.trim(),
      nicheId: nicheId || null,
      websiteId: websiteId || null,
      targetAudience: targetAudience?.trim() || null,
      status: status ?? "ACTIVE",
      priority: typeof priority === "number" ? priority : 0,
      orderIndex,
      pinsPerBatch: typeof pinsPerBatch === "number" ? pinsPerBatch : 30,
    },
  });

  return NextResponse.json(account, { status: 201 });
}
