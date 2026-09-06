import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Toggle a task done/not-done + log to daily
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await db.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const newDone = !task.done;
  const updated = await db.task.update({
    where: { id },
    data: { done: newDone, completedAt: newDone ? now : null },
  });

  // Update daily log for this category
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (newDone) {
    const existing = await db.dailyLog.findFirst({ where: { date: today, categoryId: task.categoryId } });
    if (existing) {
      await db.dailyLog.update({ where: { id: existing.id }, data: { tasksCompleted: existing.tasksCompleted + 1 } });
    } else {
      await db.dailyLog.create({ data: { date: today, categoryId: task.categoryId, pinsCompleted: 0, tasksCompleted: 1 } });
    }
  } else {
    const existing = await db.dailyLog.findFirst({ where: { date: today, categoryId: task.categoryId } });
    if (existing && existing.tasksCompleted > 0) {
      await db.dailyLog.update({ where: { id: existing.id }, data: { tasksCompleted: existing.tasksCompleted - 1 } });
    }
  }

  return NextResponse.json(updated);
}
