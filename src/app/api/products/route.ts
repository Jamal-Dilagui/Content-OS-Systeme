import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET — list products, filterable by status and/or type.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");

  const where: { status?: string; type?: string } = {};
  if (status && status !== "ALL") where.status = status;
  if (type && type !== "ALL") where.type = type;

  const products = await db.digitalProduct.findMany({
    where,
    include: {
      niche: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      nicheId: p.nicheId,
      nicheName: p.niche?.name ?? null,
      status: p.status,
      platform: p.platform,
      price: p.price,
      unitsSold: p.unitsSold,
      revenue: p.revenue,
      conversionRate: p.conversionRate,
      difficulty: p.difficulty,
      materials: p.materials,
      sizes: p.sizes,
      gauge: p.gauge,
      stitches: p.stitches,
      publishedDate: p.publishedDate,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))
  );
}

// POST — create a new product
export async function POST(req: Request) {
  const body = await req.json();
  const {
    name,
    type,
    nicheId,
    status,
    platform,
    price,
    unitsSold,
    revenue,
    conversionRate,
    difficulty,
    materials,
    sizes,
    gauge,
    stitches,
    publishedDate,
  } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const validStatuses = [
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
  const finalStatus = validStatuses.includes(status) ? status : "IDEA";

  const finalType = (typeof type === "string" && type.trim()) || "PDF";

  // Auto-stamp publishedDate when status reaches LIVE
  let finalPublishedDate: Date | null = null;
  if (publishedDate) {
    finalPublishedDate = new Date(publishedDate);
  } else if (finalStatus === "LIVE" || finalStatus === "OPTIMIZATION") {
    finalPublishedDate = new Date();
  }

  // Verify niche if provided
  if (nicheId) {
    const n = await db.niche.findUnique({ where: { id: nicheId } });
    if (!n) {
      return NextResponse.json({ error: "Niche not found" }, { status: 404 });
    }
  }

  const product = await db.digitalProduct.create({
    data: {
      name: name.trim(),
      type: finalType,
      nicheId: nicheId || null,
      status: finalStatus,
      platform: platform?.trim() || null,
      price: Number(price) || 0,
      unitsSold: Number(unitsSold) || 0,
      revenue: Number(revenue) || 0,
      conversionRate: Number(conversionRate) || 0,
      difficulty: difficulty?.trim() || null,
      materials: materials?.trim() || null,
      sizes: sizes?.trim() || null,
      gauge: gauge?.trim() || null,
      stitches: stitches?.trim() || null,
      publishedDate: finalPublishedDate,
    },
    include: {
      niche: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(
    {
      id: product.id,
      name: product.name,
      type: product.type,
      nicheId: product.nicheId,
      nicheName: product.niche?.name ?? null,
      status: product.status,
      platform: product.platform,
      price: product.price,
      unitsSold: product.unitsSold,
      revenue: product.revenue,
      conversionRate: product.conversionRate,
      difficulty: product.difficulty,
      materials: product.materials,
      sizes: product.sizes,
      gauge: product.gauge,
      stitches: product.stitches,
      publishedDate: product.publishedDate,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    },
    { status: 201 }
  );
}
