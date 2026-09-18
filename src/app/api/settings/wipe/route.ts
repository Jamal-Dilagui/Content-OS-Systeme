import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
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
  return NextResponse.json({ ok: true });
}
