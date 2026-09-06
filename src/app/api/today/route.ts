import { NextResponse } from "next/server";
import { getStore, startOfDay } from "@/lib/store";

export async function GET() {
  const store = getStore();
  const now = new Date();
  const today = startOfDay(now);

  // If all accounts done → reset cycle
  if (store.accounts.length > 0 && store.accounts.every((a) => a.doneThisCycle)) {
    for (const a of store.accounts) {
      a.doneThisCycle = false;
      a.cycle += 1;
      a.pinsCompleted = 0;
      a.selected = false;
    }
    store.accounts[0].selected = true;
  }

  // Account of day = selected not-done, else first not-done
  let accountOfDay = store.accounts.find((a) => !a.doneThisCycle && a.selected) ?? store.accounts.find((a) => !a.doneThisCycle) ?? null;

  const accountsDone = store.accounts.filter((a) => a.doneThisCycle).length;
  const cycleNumber = store.accounts[0]?.cycle ?? 1;

  // Categories with tasks + progress
  const categories = store.categories.map((c) => {
    const catTasks = store.tasks.filter((t) => t.categoryId === c.id);
    const doneCount = catTasks.filter((t) => t.done).length;
    const pct = c.dailyTarget > 0 ? Math.min(100, Math.round((doneCount / c.dailyTarget) * 100)) : 0;
    return {
      id: c.id, name: c.name, dailyTarget: c.dailyTarget, color: c.color, icon: c.icon,
      doneCount, remaining: Math.max(0, c.dailyTarget - doneCount), pct,
      tasks: catTasks.map((t) => ({ id: t.id, title: t.title, done: t.done })),
    };
  });

  // 7-day history
  const history: Array<{ label: string; date: string; pinterest: number; blog: number; patterns: number }> = [];
  for (let d = 6; d >= 0; d--) {
    const day = startOfDay(new Date(now.getTime() - d * 86400000));
    const dayLogs = store.logs.filter((l) => startOfDay(new Date(l.date)).getTime() === day.getTime());
    const pinterestPct = Math.min(100, Math.round(((dayLogs.find((l) => l.categoryId === null)?.pinsCompleted ?? 0) / 30) * 100));
    const byCat = (catName: string) => {
      const cat = store.categories.find((c) => c.name === catName);
      if (!cat) return 0;
      const log = dayLogs.find((l) => l.categoryId === cat.id);
      if (!log || cat.dailyTarget === 0) return 0;
      return Math.min(100, Math.round((log.tasksCompleted / cat.dailyTarget) * 100));
    };
    history.push({
      label: day.toLocaleDateString("en-US", { weekday: "short" }),
      date: day.toISOString(),
      pinterest: pinterestPct,
      blog: byCat("Blog"),
      patterns: byCat("Patterns"),
    });
  }

  const pinterestPct = accountOfDay ? Math.min(100, (accountOfDay.pinsCompleted / accountOfDay.pinsPerBatch) * 100) : 0;
  const categoryPcts = categories.map((c) => c.pct);
  const overallPct = Math.round((pinterestPct + (categoryPcts.length > 0 ? categoryPcts.reduce((s, p) => s + p, 0) / categoryPcts.length : 0)) / (categoryPcts.length > 0 ? 2 : 1));

  // Reminders
  const reminders: Array<{ text: string; severity: "info" | "warn" | "good" }> = [];
  if (accountOfDay) {
    const remaining = Math.max(0, accountOfDay.pinsPerBatch - accountOfDay.pinsCompleted);
    if (remaining > 0) reminders.push({ text: `${accountOfDay.name}: ${remaining} pins left`, severity: "warn" });
    else reminders.push({ text: `${accountOfDay.name} pins complete!`, severity: "good" });
  }
  for (const c of categories) {
    if (c.remaining > 0) reminders.push({ text: `${c.name}: ${c.remaining} task(s) left`, severity: "info" });
    else reminders.push({ text: `${c.name} target hit!`, severity: "good" });
  }
  if (reminders.length === 0) reminders.push({ text: "All done for today! 🎉", severity: "good" });

  // Rewards
  const rewards: Array<{ icon: string; title: string; desc: string; unlocked: boolean }> = [
    { icon: "🔥", title: `${store.streak.currentStreak} Day Streak`, desc: "Come back tomorrow to extend", unlocked: store.streak.currentStreak > 0 },
    { icon: "🎯", title: "Pinterest Done", desc: "Finish today's account", unlocked: accountOfDay ? accountOfDay.pinsCompleted >= accountOfDay.pinsPerBatch : false },
    { icon: "🏆", title: "Perfect Day", desc: "Hit 100% in all categories", unlocked: overallPct >= 100 },
    { icon: "💎", title: `${store.streak.rewards} Perfect Days`, desc: "Total days at 100%", unlocked: store.streak.rewards > 0 },
  ];

  return NextResponse.json({
    now: now.toISOString(),
    dateLabel: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    pinterest: {
      accountOfDay: accountOfDay
        ? { id: accountOfDay.id, name: accountOfDay.name, pinsPerBatch: accountOfDay.pinsPerBatch, pinsCompleted: accountOfDay.pinsCompleted, cycle: accountOfDay.cycle }
        : null,
      accounts: store.accounts.map((a) => ({
        id: a.id, name: a.name, done: a.doneThisCycle, selected: a.selected, cycle: a.cycle,
        orderIndex: a.orderIndex, pinsCompleted: a.pinsCompleted, pinsPerBatch: a.pinsPerBatch,
      })),
      accountsDone, totalAccounts: store.accounts.length, cycleNumber,
      pct: Math.round(pinterestPct),
    },
    categories,
    streak: { current: store.streak.currentStreak, longest: store.streak.longestStreak, rewards: store.streak.rewards, totalDays: store.streak.totalDays },
    history,
    overallPct,
    reminders,
    rewards,
  });
}
