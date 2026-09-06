import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Mark the account as done for this cycle + update streak
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await db.pinterestAccount.findUnique({ where: { id } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  await db.pinterestAccount.update({
    where: { id },
    data: { doneThisCycle: true, selected: false, lastWorkedDate: now, pinsCompleted: account.pinsPerBatch },
  });

  // Log today's pins
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  await db.dailyLog.create({
    data: { date: today, categoryId: null, pinsCompleted: account.pinsPerBatch, tasksCompleted: 0 },
  });

  // Update streak
  let streak = await db.streak.findFirst();
  if (!streak) streak = await db.streak.create({ data: {} });
  const lastActive = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null;
  const lastDay = lastActive ? new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate()) : null;
  const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  if (!lastDay || lastDay.getTime() === yesterday.getTime()) {
    // continue streak
    await db.streak.update({ where: { id: streak.id }, data: { currentStreak: streak.currentStreak + 1, lastActiveDate: now, longestStreak: Math.max(streak.longestStreak, streak.currentStreak + 1), totalDays: streak.totalDays + 1 } });
  } else if (lastDay.getTime() === todayDay.getTime()) {
    // already active today, just update
    await db.streak.update({ where: { id: streak.id }, data: { lastActiveDate: now } });
  } else {
    // streak broken, restart
    await db.streak.update({ where: { id: streak.id }, data: { currentStreak: 1, lastActiveDate: now, totalDays: streak.totalDays + 1 } });
  }

  return NextResponse.json({ ok: true });
}
