import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH — update a product (any field).
// When status moves to LIVE/OPTIMIZATION and publishedDate isn't supplied, auto-stamp it.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (type !== undefined) data.type = type;
  if (nicheId !== undefined) {
    if (nicheId) {
      const n = await db.niche.findUnique({ where: { id: nicheId } });
      if (!n) {
        return NextResponse.json({ error: "Niche not found" }, { status: 404 });
      }
    }
    data.nicheId = nicheId || null;
  }
  if (status !== undefined) data.status = status;
  if (platform !== undefined) data.platform = platform || null;
  if (price !== undefined) data.price = Number(price) || 0;
  if (unitsSold !== undefined) data.unitsSold = Number(unitsSold) || 0;
  if (revenue !== undefined) data.revenue = Number(revenue) || 0;
  if (conversionRate !== undefined) data.conversionRate = Number(conversionRate) || 0;
  if (difficulty !== undefined) data.difficulty = difficulty || null;
  if (materials !== undefined) data.materials = materials || null;
  if (sizes !== undefined) data.sizes = sizes || null;
  if (gauge !== undefined) data.gauge = gauge || null;
  if (stitches !== undefined) data.stitches = stitches || null;
  if (publishedDate !== undefined) {
    data.publishedDate = publishedDate ? new Date(publishedDate) : null;
  }

  // Auto-stamp publishedDate when transitioning to LIVE/OPTIMIZATION
  if (
    status &&
    (status === "LIVE" || status === "OPTIMIZATION") &&
    publishedDate === undefined
  ) {
    data.publishedDate = new Date();
  }

  const updated = await db.digitalProduct.update({
    where: { id },
    data,
    include: {
      niche: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    type: updated.type,
    nicheId: updated.nicheId,
    nicheName: updated.niche?.name ?? null,
    status: updated.status,
    platform: updated.platform,
    price: updated.price,
    unitsSold: updated.unitsSold,
    revenue: updated.revenue,
    conversionRate: updated.conversionRate,
    difficulty: updated.difficulty,
    materials: updated.materials,
    sizes: updated.sizes,
    gauge: updated.gauge,
    stitches: updated.stitches,
    publishedDate: updated.publishedDate,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}

// DELETE — remove a product
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.digitalProduct.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
