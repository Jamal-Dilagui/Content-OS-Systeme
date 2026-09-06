import { NextResponse } from "next/server";
import { getStore, startOfDay } from "@/lib/store";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const acc = store.accounts.find((a) => a.id === id);
  if (!acc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  acc.doneThisCycle = true;
  acc.selected = false;
  acc.lastWorkedDate = now.toISOString();
  acc.pinsCompleted = acc.pinsPerBatch;

  // Log
  const today = startOfDay(now).toISOString();
  const existing = store.logs.find((l) => l.date === today && l.categoryId === null);
  if (existing) existing.pinsCompleted = acc.pinsPerBatch;
  else store.logs.push({ id: `log-${Date.now()}`, date: today, categoryId: null, pinsCompleted: acc.pinsPerBatch, tasksCompleted: 0 });

  // Streak
  const lastActive = store.streak.lastActiveDate ? startOfDay(new Date(store.streak.lastActiveDate)) : null;
  const todayDay = startOfDay(now);
  const yesterday = new Date(todayDay.getTime() - 86400000);
  if (!lastActive || lastActive.getTime() === yesterday.getTime()) {
    store.streak.currentStreak += 1;
    store.streak.longestStreak = Math.max(store.streak.longestStreak, store.streak.currentStreak);
    store.streak.totalDays += 1;
  } else if (lastActive.getTime() !== todayDay.getTime()) {
    store.streak.currentStreak = 1;
    store.streak.totalDays += 1;
  }
  store.streak.lastActiveDate = now.toISOString();

  return NextResponse.json({ ok: true });
}
