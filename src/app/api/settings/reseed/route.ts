import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { db } from "@/lib/db";

// Wipe everything, then reseed demo data by running the seed script logic inline.
export async function POST() {
  // Delete all data in dependency order
  await db.growthScoreConfig.deleteMany();
  await db.yearlyGoal.deleteMany();
  await db.monthlyReview.deleteMany();
  await db.weeklyReview.deleteMany();
  await db.experiment.deleteMany();
  await db.trafficAnalytics.deleteMany();
  await db.financialGoal.deleteMany();
  await db.expense.deleteMany();
  await db.revenue.deleteMany();
  await db.campaign.deleteMany();
  await db.contentCalendarEvent.deleteMany();
  await db.task.deleteMany();
  await db.facebookPost.deleteMany();
  await db.facebookPage.deleteMany();
  await db.productPlatform.deleteMany();
  await db.pinterestPin.deleteMany();
  await db.pinterestBoard.deleteMany();
  await db.pinterestAccount.deleteMany();
  await db.blogArticle.deleteMany();
  await db.website.deleteMany();
  await db.niche.deleteMany();
  await db.business.deleteMany();

  // Re-run seed by spawning the seed script
  try {
    execSync("bun prisma/seed.ts", { cwd: process.cwd(), stdio: "ignore" });
  } catch {
    return NextResponse.json({ error: "Reseed failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
