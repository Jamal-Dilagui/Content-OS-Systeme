import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Clean, simple Pinterest stats matching the simplified process-tracker view
export async function GET() {
  const accounts = await db.pinterestAccount.findMany({
    orderBy: { orderIndex: "asc" },
    include: {
      niche: { select: { name: true } },
      website: { select: { name: true } },
    },
  });

  const pins = await db.pinterestPin.findMany({
    include: { account: { select: { name: true } }, board: { select: { name: true } } },
  });

  const boards = await db.pinterestBoard.findMany();
  const niches = await db.niche.findMany({ select: { id: true, name: true } });
  const websites = await db.website.findMany({ select: { id: true, name: true } });

  const activeAccounts = accounts.filter((a) => a.status === "ACTIVE");
  const accountOfDay = activeAccounts[0] ?? null;
  const nextAccount = activeAccounts[1] ?? activeAccounts[0] ?? null;

  const pinsCreated = pins.length;
  const pinsPublished = pins.filter((p) => p.status === "PUBLISHED").length;
  const pinsScheduled = pins.filter((p) => p.status === "SCHEDULED").length;
  const readyPins = pins.filter((p) => p.status === "READY").length;
  const totalImpressions = pins.reduce((s, p) => s + p.impressions, 0);
  const totalSaves = pins.reduce((s, p) => s + p.saves, 0);
  const totalOutboundClicks = pins.reduce((s, p) => s + p.outboundClicks, 0);
  const avgCtr = totalImpressions > 0 ? (totalOutboundClicks / totalImpressions) * 100 : 0;

  const publishedPins = pins.filter((p) => p.status === "PUBLISHED");
  const bestPin = publishedPins.length > 0
    ? publishedPins.reduce((best, p) => (p.outboundClicks > best.outboundClicks ? p : best))
    : null;

  // Best account by outbound clicks
  let bestAccount: { name: string } | null = null;
  let bestClicks = -1;
  for (const a of accounts) {
    const clicks = pins.filter((p) => p.accountId === a.id).reduce((s, p) => s + p.outboundClicks, 0);
    if (clicks > bestClicks) { bestClicks = clicks; bestAccount = { name: a.name }; }
  }

  return NextResponse.json({
    accountOfDay: accountOfDay
      ? {
          id: accountOfDay.id,
          name: accountOfDay.name,
          status: accountOfDay.status,
          priority: accountOfDay.priority,
          orderIndex: accountOfDay.orderIndex,
          currentCycle: accountOfDay.currentCycle,
          pinsPerBatch: accountOfDay.pinsPerBatch,
          pinsCompleted: accountOfDay.pinsCompleted,
          pinsPublished: accountOfDay.pinsPublished,
          lastWorkedDate: accountOfDay.lastWorkedDate,
          nextWorkDate: accountOfDay.nextWorkDate,
          niche: accountOfDay.niche ? { name: accountOfDay.niche.name } : null,
          website: accountOfDay.website ? { name: accountOfDay.website.name } : null,
        }
      : null,
    nextAccount: nextAccount
      ? {
          id: nextAccount.id,
          name: nextAccount.name,
          status: nextAccount.status,
          priority: nextAccount.priority,
          orderIndex: nextAccount.orderIndex,
          currentCycle: nextAccount.currentCycle,
          pinsPerBatch: nextAccount.pinsPerBatch,
          pinsCompleted: nextAccount.pinsCompleted,
          pinsPublished: nextAccount.pinsPublished,
          lastWorkedDate: nextAccount.lastWorkedDate,
          nextWorkDate: nextAccount.nextWorkDate,
          niche: nextAccount.niche ? { name: nextAccount.niche.name } : null,
          website: nextAccount.website ? { name: nextAccount.website.name } : null,
        }
      : null,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      priority: a.priority,
      orderIndex: a.orderIndex,
      currentCycle: a.currentCycle,
      pinsPerBatch: a.pinsPerBatch,
      pinsCompleted: a.pinsCompleted,
      pinsPublished: a.pinsPublished,
      lastWorkedDate: a.lastWorkedDate,
      nextWorkDate: a.nextWorkDate,
      niche: a.niche ? { name: a.niche.name } : null,
      website: a.website ? { name: a.website.name } : null,
    })),
    pins: pins.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      accountId: p.accountId,
      account: p.account ? { name: p.account.name } : null,
      board: p.board ? { name: p.board.name } : null,
      scheduledDate: p.scheduledDate,
      publishedDate: p.publishedDate,
      imageUrl: p.imageUrl,
    })),
    pinsCreated,
    pinsPublished,
    pinsScheduled,
    readyPins,
    totalImpressions,
    totalSaves,
    totalOutboundClicks,
    avgCtr: Math.round(avgCtr * 100) / 100,
    bestPin: bestPin
      ? { id: bestPin.id, title: bestPin.title, account: bestPin.account ? { name: bestPin.account.name } : null }
      : null,
    bestAccount,
    niches,
    websites,
    boards: boards.map((b) => ({ id: b.id, name: b.name, accountId: b.accountId })),
  });
}
