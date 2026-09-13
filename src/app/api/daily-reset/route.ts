import { NextResponse } from "next/server";
import { getStore, startOfDay } from "@/lib/store";

// Daily reset — called on page load
// If lastResetDate != today:
// 1. Save yesterday's completed tasks to logs (for chart history)
// 2. Uncheck all tasks
// 3. Reset Pinterest pins for new day
// 4. Update lastResetDate
export async function POST() {
  const store = getStore();
  const now = new Date();
  const today = startOfDay(now);
  const todayISO = today.toISOString();

  // Check if already reset today
  if (store.lastResetDate === todayISO) {
    return NextResponse.json({ reset: false, message: "Already reset today" });
  }

  // Save yesterday's progress to logs before resetting
  const yesterday = new Date(today.getTime() - 86400000);
  const yesterdayISO = startOfDay(yesterday).toISOString();

  // Only save if we haven't already logged yesterday
  const yesterdayLogExists = store.logs.some(
    (l) => l.date === yesterdayISO && l.categoryId !== null
  );

  if (!yesterdayLogExists) {
    // Save completed task counts per category for yesterday
    for (const cat of store.categories) {
      const catTasks = store.tasks.filter((t) => t.categoryId === cat.id);
      const doneCount = catTasks.filter((t) => t.done).length;
      store.logs.push({
        id: `log-yesterday-${cat.id}-${Date.now()}`,
        date: yesterdayISO,
        categoryId: cat.id,
        pinsCompleted: 0,
        tasksCompleted: doneCount,
      });
    }
    // Save Pinterest pins for yesterday
    const acc = store.accounts.find((a) => a.selected || !a.doneThisCycle);
    if (acc) {
      store.logs.push({
        id: `log-yesterday-pin-${Date.now()}`,
        date: yesterdayISO,
        categoryId: null,
        pinsCompleted: acc.pinsCompleted,
        tasksCompleted: 0,
      });
    }
  }

  // Uncheck all tasks
  for (const t of store.tasks) {
    t.done = false;
    t.completedAt = null;
  }

  // Reset Pinterest pins (but keep doneThisCycle state — that's per cycle, not per day)
  for (const a of store.accounts) {
    if (!a.doneThisCycle) {
      a.pinsCompleted = 0;
    }
  }

  // Update lastResetDate
  store.lastResetDate = todayISO;

  return NextResponse.json({ reset: true, message: "Daily reset done — tasks unchecked, yesterday's progress saved to history" });
}
