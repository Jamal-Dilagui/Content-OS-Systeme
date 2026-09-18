import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET — list blog articles, filterable by websiteId and/or status.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const websiteId = url.searchParams.get("websiteId");
  const status = url.searchParams.get("status");

  const where: { websiteId?: string; status?: string } = {};
  if (websiteId && websiteId !== "ALL") where.websiteId = websiteId;
  if (status && status !== "ALL") where.status = status;

  const articles = await db.blogArticle.findMany({
    where,
    include: {
      website: { select: { id: true, name: true, url: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    articles.map((a) => ({
      id: a.id,
      websiteId: a.websiteId,
      websiteName: a.website?.name ?? null,
      websiteUrl: a.website?.url ?? null,
      title: a.title,
      keyword: a.keyword,
      url: a.url,
      status: a.status,
      organicTraffic: a.organicTraffic,
      clicks: a.clicks,
      affiliateClicks: a.affiliateClicks,
      productClicks: a.productClicks,
      revenue: a.revenue,
      publishedDate: a.publishedDate,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }))
  );
}

// POST — create a new blog article.
export async function POST(req: Request) {
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

  if (!websiteId || typeof websiteId !== "string") {
    return NextResponse.json(
      { error: "websiteId is required" },
      { status: 400 }
    );
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 }
    );
  }

  // Verify the website exists
  const website = await db.website.findUnique({ where: { id: websiteId } });
  if (!website) {
    return NextResponse.json(
      { error: "Website not found" },
      { status: 404 }
    );
  }

  const validStatuses = [
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
  const finalStatus = validStatuses.includes(status) ? status : "IDEA";

  // Auto-stamp publishedDate when transitioning to PUBLISHED/PROMOTED
  let finalPublishedDate: Date | null = null;
  if (publishedDate) {
    finalPublishedDate = new Date(publishedDate);
  } else if (finalStatus === "PUBLISHED" || finalStatus === "PROMOTED") {
    finalPublishedDate = new Date();
  }

  const article = await db.blogArticle.create({
    data: {
      websiteId,
      title: title.trim(),
      keyword: keyword?.trim() || null,
      url: url?.trim() || null,
      status: finalStatus,
      organicTraffic: Number(organicTraffic) || 0,
      clicks: Number(clicks) || 0,
      affiliateClicks: Number(affiliateClicks) || 0,
      productClicks: Number(productClicks) || 0,
      revenue: Number(revenue) || 0,
      publishedDate: finalPublishedDate,
    },
    include: {
      website: { select: { id: true, name: true, url: true } },
    },
  });

  return NextResponse.json(
    {
      id: article.id,
      websiteId: article.websiteId,
      websiteName: article.website?.name ?? null,
      websiteUrl: article.website?.url ?? null,
      title: article.title,
      keyword: article.keyword,
      url: article.url,
      status: article.status,
      organicTraffic: article.organicTraffic,
      clicks: article.clicks,
      affiliateClicks: article.affiliateClicks,
      productClicks: article.productClicks,
      revenue: article.revenue,
      publishedDate: article.publishedDate,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    },
    { status: 201 }
  );
}
