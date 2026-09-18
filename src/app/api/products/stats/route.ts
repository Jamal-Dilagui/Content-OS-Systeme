import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Aggregated product KPIs: counts by stage, revenue, conversion, best-seller,
// revenue by platform, and status distribution.
export async function GET() {
  const products = await db.digitalProduct.findMany({
    include: {
      niche: { select: { id: true, name: true } },
    },
  });

  const niches = await db.niche.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const platforms = await db.productPlatform.findMany({
    orderBy: { name: "asc" },
  });

  const PRODUCT_STATUSES = [
    "IDEA",
    "VALIDATION",
    "RESEARCH",
    "CREATION",
    "DESIGN",
    "PROOFREADING",
    "PDF",
    "COVER",
    "LISTING",
    "PRODUCT_IMAGES",
    "SEO",
    "PUBLISH",
    "PROMOTION",
    "LIVE",
    "OPTIMIZATION",
  ];

  const liveSet = new Set(["LIVE", "OPTIMIZATION"]);
  // Products "Published" = anything that has been published (LIVE/OPTIMIZATION + PUBLISH/PROMOTION)
  const publishedSet = new Set(["PUBLISH", "PROMOTION", "LIVE", "OPTIMIZATION"]);

  const productsCreated = products.length;
  const productsPublished = products.filter((p) => publishedSet.has(p.status)).length;
  const productsLive = products.filter((p) => liveSet.has(p.status)).length;

  const totalUnitsSold = products.reduce((s, p) => s + p.unitsSold, 0);
  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);

  // Conversion rate = units sold / (units sold + clicks)... we don't have clicks per product,
  // so use weighted average of conversionRate field for live products.
  const liveProducts = products.filter((p) => liveSet.has(p.status));
  const avgConversionRate =
    liveProducts.length > 0
      ? liveProducts.reduce((s, p) => s + p.conversionRate, 0) / liveProducts.length
      : 0;

  // Best-selling product (by units sold)
  const sortedByUnits = [...products].sort((a, b) => b.unitsSold - a.unitsSold);
  const bestSeller = sortedByUnits[0]
    ? {
        id: sortedByUnits[0].id,
        name: sortedByUnits[0].name,
        type: sortedByUnits[0].type,
        platform: sortedByUnits[0].platform,
        unitsSold: sortedByUnits[0].unitsSold,
        revenue: sortedByUnits[0].revenue,
        conversionRate: sortedByUnits[0].conversionRate,
      }
    : null;

  // Revenue by platform
  const platformMap = new Map<string, { platform: string; revenue: number; unitsSold: number; products: number }>();
  for (const p of products) {
    const plat = p.platform || "Unspecified";
    const cur = platformMap.get(plat) ?? { platform: plat, revenue: 0, unitsSold: 0, products: 0 };
    cur.revenue += p.revenue;
    cur.unitsSold += p.unitsSold;
    cur.products += 1;
    platformMap.set(plat, cur);
  }
  const revenueByPlatform = Array.from(platformMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );

  // Status distribution (pipeline)
  const statusDistribution = PRODUCT_STATUSES.map((s) => ({
    status: s,
    count: products.filter((p) => p.status === s).length,
  }));

  // Revenue by type (PDF vs CROCHET_PATTERN, etc.)
  const typeMap = new Map<string, { type: string; revenue: number; unitsSold: number; products: number }>();
  for (const p of products) {
    const t = p.type || "PDF";
    const cur = typeMap.get(t) ?? { type: t, revenue: 0, unitsSold: 0, products: 0 };
    cur.revenue += p.revenue;
    cur.unitsSold += p.unitsSold;
    cur.products += 1;
    typeMap.set(t, cur);
  }
  const revenueByType = Array.from(typeMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );

  return NextResponse.json({
    kpis: {
      productsCreated,
      productsPublished,
      productsLive,
      totalUnitsSold,
      totalRevenue,
      avgConversionRate: Math.round(avgConversionRate * 10000) / 100, // store as %
    },
    bestSeller,
    revenueByPlatform,
    revenueByType,
    statusDistribution,
    niches,
    platforms: platforms.map((p) => ({ id: p.id, name: p.name, fee: p.fee })),
  });
}
