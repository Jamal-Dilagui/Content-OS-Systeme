import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET — list pins (optionally filtered by accountId and/or status)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const accountId = url.searchParams.get("accountId");
  const status = url.searchParams.get("status");

  const where: { accountId?: string; status?: string } = {};
  if (accountId) where.accountId = accountId;
  if (status && status !== "ALL") where.status = status;

  const pins = await db.pinterestPin.findMany({
    where,
    include: {
      account: { select: { id: true, name: true } },
      board: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    pins.map((p) => ({
      id: p.id,
      accountId: p.accountId,
      accountName: p.account?.name ?? null,
      boardId: p.boardId,
      boardName: p.board?.name ?? null,
      contentType: p.contentType,
      title: p.title,
      description: p.description,
      url: p.url,
      imageUrl: p.imageUrl,
      status: p.status,
      hook: p.hook,
      mainText: p.mainText,
      cta: p.cta,
      keywords: p.keywords,
      scheduledDate: p.scheduledDate,
      publishedDate: p.publishedDate,
      impressions: p.impressions,
      saves: p.saves,
      outboundClicks: p.outboundClicks,
      engagement: p.engagement,
      ctr:
        p.impressions > 0
          ? Math.round(((p.outboundClicks / p.impressions) * 100) * 100) / 100
          : 0,
      createdAt: p.createdAt,
    }))
  );
}

// POST — create a new pin
export async function POST(req: Request) {
  const body = await req.json();
  const {
    accountId,
    boardId,
    title,
    description,
    contentType,
    url,
    imageUrl,
    hook,
    mainText,
    cta,
    keywords,
    status,
    scheduledDate,
  } = body;

  if (!accountId || !title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json(
      { error: "accountId and title are required" },
      { status: 400 }
    );
  }

  const pin = await db.pinterestPin.create({
    data: {
      accountId,
      boardId: boardId || null,
      title: title.trim(),
      description: description?.trim() || null,
      contentType: contentType?.trim() || null,
      url: url?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      hook: hook?.trim() || null,
      mainText: mainText?.trim() || null,
      cta: cta?.trim() || null,
      keywords: keywords?.trim() || null,
      status: status ?? "IDEA",
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
    },
  });

  return NextResponse.json(pin, { status: 201 });
}
