import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Increment (or set) the pin count for the account of the day
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const account = await db.pinterestAccount.findUnique({ where: { id } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const delta = typeof body.delta === "number" ? body.delta : 1;
  const newCount = Math.max(0, Math.min(account.pinsPerBatch, account.pinsCompleted + delta));
  const updated = await db.pinterestAccount.update({
    where: { id },
    data: { pinsCompleted: newCount },
  });

  // Update today's log
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const existing = await db.dailyLog.findFirst({ where: { date: today, categoryId: null } });
  if (existing) {
    await db.dailyLog.update({ where: { id: existing.id }, data: { pinsCompleted: newCount } });
  } else {
    await db.dailyLog.create({ data: { date: today, categoryId: null, pinsCompleted: newCount, tasksCompleted: 0 } });
  }

  return NextResponse.json({ pinsCompleted: updated.pinsCompleted });
}
