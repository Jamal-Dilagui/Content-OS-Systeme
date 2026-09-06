import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH — update an article (status, content fields, performance metrics).
// When status moves to PUBLISHED/PROMOTED and publishedDate isn't supplied, auto-stamp it.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const {
    websiteId,
    title,
    keyword,
    url,
    status,
    organicTraffic,
    clicks,
    affiliateClicks,
    productClicks,
    revenue,
    publishedDate,
  } = body;

  const data: Record<string, unknown> = {};
  if (websiteId !== undefined) {
    if (websiteId) {
      const w = await db.website.findUnique({ where: { id: websiteId } });
      if (!w) {
        return NextResponse.json(
          { error: "Website not found" },
          { status: 404 }
        );
      }
    }
    data.websiteId = websiteId || null;
  }
  if (title !== undefined) data.title = title;
  if (keyword !== undefined) data.keyword = keyword || null;
  if (url !== undefined) data.url = url || null;
  if (status !== undefined) data.status = status;
  if (organicTraffic !== undefined) data.organicTraffic = Number(organicTraffic) || 0;
  if (clicks !== undefined) data.clicks = Number(clicks) || 0;
  if (affiliateClicks !== undefined) data.affiliateClicks = Number(affiliateClicks) || 0;
  if (productClicks !== undefined) data.productClicks = Number(productClicks) || 0;
  if (revenue !== undefined) data.revenue = Number(revenue) || 0;
  if (publishedDate !== undefined) {
    data.publishedDate = publishedDate ? new Date(publishedDate) : null;
  }

  // Auto-stamp publishedDate when transitioning to PUBLISHED/PROMOTED
  if (
    status &&
    (status === "PUBLISHED" || status === "PROMOTED") &&
    publishedDate === undefined
  ) {
    data.publishedDate = new Date();
  }

  const updated = await db.blogArticle.update({
    where: { id },
    data,
    include: {
      website: { select: { id: true, name: true, url: true } },
    },
  });

  return NextResponse.json({
    id: updated.id,
    websiteId: updated.websiteId,
    websiteName: updated.website?.name ?? null,
    websiteUrl: updated.website?.url ?? null,
    title: updated.title,
    keyword: updated.keyword,
    url: updated.url,
    status: updated.status,
    organicTraffic: updated.organicTraffic,
    clicks: updated.clicks,
    affiliateClicks: updated.affiliateClicks,
    productClicks: updated.productClicks,
    revenue: updated.revenue,
    publishedDate: updated.publishedDate,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}

// DELETE — remove an article
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.blogArticle.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
