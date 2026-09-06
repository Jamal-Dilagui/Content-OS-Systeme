import { NextResponse } from "next/server";
import { getStore, startOfDay } from "@/lib/store";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const task = store.tasks.find((t) => t.id === id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  task.done = !task.done;
  task.completedAt = task.done ? now.toISOString() : null;

  // Update daily log
  const today = startOfDay(now).toISOString();
  let log = store.logs.find((l) => l.date === today && l.categoryId === task.categoryId);
  if (!log) {
    log = { id: `log-${Date.now()}`, date: today, categoryId: task.categoryId, pinsCompleted: 0, tasksCompleted: 0 };
    store.logs.push(log);
  }
  log.tasksCompleted = Math.max(0, log.tasksCompleted + (task.done ? 1 : -1));

  return NextResponse.json(task);
}
