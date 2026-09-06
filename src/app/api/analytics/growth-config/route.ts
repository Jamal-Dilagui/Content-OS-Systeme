import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET — current GrowthScoreConfig (auto-creates defaults if none exists)
export async function GET() {
  let config = await db.growthScoreConfig.findFirst();
  if (!config) {
    config = await db.growthScoreConfig.create({
      data: {
        revenueGrowthWeight: 25,
        trafficGrowthWeight: 20,
        contentProductionWeight: 15,
        pinterestGrowthWeight: 15,
        productGrowthWeight: 15,
        profitabilityWeight: 10,
      },
    });
  }
  return NextResponse.json(config);
}

// PATCH — update weights (any subset of the six weight fields)
export async function PATCH(req: Request) {
  const body = await req.json();
  const {
    revenueGrowthWeight,
    trafficGrowthWeight,
    contentProductionWeight,
    pinterestGrowthWeight,
    productGrowthWeight,
    profitabilityWeight,
  } = body;

  const data: Record<string, number> = {};
  if (revenueGrowthWeight !== undefined) data.revenueGrowthWeight = Number(revenueGrowthWeight);
  if (trafficGrowthWeight !== undefined) data.trafficGrowthWeight = Number(trafficGrowthWeight);
  if (contentProductionWeight !== undefined) data.contentProductionWeight = Number(contentProductionWeight);
  if (pinterestGrowthWeight !== undefined) data.pinterestGrowthWeight = Number(pinterestGrowthWeight);
  if (productGrowthWeight !== undefined) data.productGrowthWeight = Number(productGrowthWeight);
  if (profitabilityWeight !== undefined) data.profitabilityWeight = Number(profitabilityWeight);

  // Validate: each weight must be 0-100
  for (const [k, v] of Object.entries(data)) {
    if (isNaN(v) || v < 0 || v > 100) {
      return NextResponse.json({ error: `${k} must be a number between 0 and 100` }, { status: 400 });
    }
  }

  let config = await db.growthScoreConfig.findFirst();
  if (!config) {
    config = await db.growthScoreConfig.create({
      data: {
        revenueGrowthWeight: 25,
        trafficGrowthWeight: 20,
        contentProductionWeight: 15,
        pinterestGrowthWeight: 15,
        productGrowthWeight: 15,
        profitabilityWeight: 10,
        ...data,
      },
    });
  } else {
    config = await db.growthScoreConfig.update({ where: { id: config.id }, data });
  }

  const totalWeight = config.revenueGrowthWeight + config.trafficGrowthWeight + config.contentProductionWeight + config.pinterestGrowthWeight + config.productGrowthWeight + config.profitabilityWeight;

  return NextResponse.json({ ...config, totalWeight });
}
