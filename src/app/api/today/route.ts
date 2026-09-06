import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function GET() {
  const now = new Date();
  const today = startOfDay(now);

  // ---- Pinterest ----
  const accounts = await db.pinterestAccount.findMany({ orderBy: { orderIndex: "asc" } });
  // Account of the day = first not done this cycle
  let accountOfDay = accounts.find((a) => !a.doneThisCycle) ?? null;
  let cycleComplete = false;
  // If all done, reset cycle
  if (!accountOfDay && accounts.length > 0) {
    cycleComplete = true;
    await db.pinterestAccount.updateMany({ where: { doneThisCycle: true }, data: { doneThisCycle: false, cycle: { increment: 1 } } });
    const refreshed = await db.pinterestAccount.findMany({ orderBy: { orderIndex: "asc" } });
    accountOfDay = refreshed.find((a) => !a.doneThisCycle) ?? refreshed[0] ?? null;
  }
  const accountsDone = accounts.filter((a) => a.doneThisCycle).length;
  const cycleNumber = accounts[0]?.cycle ?? 1;

  // ---- Categories with tasks ----
  const categories = await db.category.findMany({ orderBy: { orderIndex: "asc" }, include: { tasks: true } });
  const categoryProgress = categories.map((c) => {
    const doneCount = c.tasks.filter((t) => t.done).length;
    const pct = c.dailyTarget > 0 ? Math.min(100, (doneCount / c.dailyTarget) * 100) : 0;
    return {
      id: c.id, name: c.name, dailyTarget: c.dailyTarget, color: c.color, icon: c.icon,
      doneCount, remaining: Math.max(0, c.dailyTarget - doneCount), pct: Math.round(pct),
      tasks: c.tasks.map((t) => ({ id: t.id, title: t.title, done: t.done })),
    };
  });

  // ---- Streak ----
  let streak = await db.streak.findFirst();
  if (!streak) {
    streak = await db.streak.create({ data: {} });
  }
  // Check if last active was yesterday → maintain streak; if older, reset on first completion
  const lastActive = streak.lastActiveDate ? startOfDay(new Date(streak.lastActiveDate)) : null;
  const yesterday = startOfDay(new Date(now.getTime() - 86400000));

  // ---- 7-day history for chart ----
  const logs = await db.dailyLog.findMany({ where: { date: { gte: new Date(today.getTime() - 6 * 86400000) } } });
  const history: Array<{ label: string; date: string; pinterest: number; blog: number; patterns: number; other: number }> = [];
  for (let d = 6; d >= 0; d--) {
    const day = startOfDay(new Date(now.getTime() - d * 86400000));
    const dayLogs = logs.filter((l) => startOfDay(new Date(l.date)).getTime() === day.getTime());
    const pinterestPct = Math.min(100, ((dayLogs.find((l) => l.categoryId === null)?.pinsCompleted ?? 0) / 30) * 100);
    const byCat = (catName: string) => {
      const cat = categories.find((c) => c.name === catName);
      if (!cat) return 0;
      const log = dayLogs.find((l) => l.categoryId === cat.id);
      if (!log || cat.dailyTarget === 0) return 0;
      return Math.min(100, (log.tasksCompleted / cat.dailyTarget) * 100);
    };
    history.push({
      label: day.toLocaleDateString("en-US", { weekday: "short" }),
      date: day.toISOString(),
      pinterest: Math.round(pinterestPct),
      blog: byCat("Blog"),
      patterns: byCat("Patterns"),
      other: 0,
    });
  }

  // ---- Overall today's progress (for the big number) ----
  const pinterestPct = accountOfDay ? Math.min(100, (accountOfDay.pinsCompleted / accountOfDay.pinsPerBatch) * 100) : 0;
  const categoryPcts = categoryProgress.map((c) => c.pct);
  const overallPct = Math.round((pinterestPct + (categoryPcts.length > 0 ? categoryPcts.reduce((s, p) => s + p, 0) / categoryPcts.length : 0)) / (categoryPcts.length > 0 ? 2 : 1));

  // ---- Reminders ----
  const reminders: Array<{ text: string; severity: "info" | "warn" | "good" }> = [];
  if (accountOfDay) {
    const remaining = Math.max(0, accountOfDay.pinsPerBatch - accountOfDay.pinsCompleted);
    if (remaining > 0) reminders.push({ text: `${accountOfDay.name}: ${remaining} pins left today`, severity: "warn" });
    else reminders.push({ text: `${accountOfDay.name} pins complete!`, severity: "good" });
  }
  for (const c of categoryProgress) {
    if (c.remaining > 0) reminders.push({ text: `${c.name}: ${c.remaining} task(s) left`, severity: "info" });
    else reminders.push({ text: `${c.name} target hit!`, severity: "good" });
  }
  if (reminders.length === 0) reminders.push({ text: "All done for today!", severity: "good" });

  // ---- Rewards ----
  const rewards: Array<{ icon: string; title: string; desc: string; unlocked: boolean }> = [
    { icon: "🔥", title: `${streak.currentStreak} Day Streak`, desc: "Come back tomorrow to extend", unlocked: streak.currentStreak > 0 },
    { icon: "🎯", title: "Pinterest Done", desc: "Finish today's account", unlocked: accountOfDay ? accountOfDay.pinsCompleted >= accountOfDay.pinsPerBatch : false },
    { icon: "🏆", title: "Perfect Day", desc: "Hit 100% in all categories", unlocked: overallPct >= 100 },
    { icon: "⚡", title: "Cycle Master", desc: "Complete a full account cycle", unlocked: cycleComplete },
    { icon: "💎", title: `${streak.rewards} Perfect Days`, desc: "Total days at 100%", unlocked: streak.rewards > 0 },
  ];

  return NextResponse.json({
    now: now.toISOString(),
    dateLabel: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    pinterest: {
      accountOfDay: accountOfDay
        ? { id: accountOfDay.id, name: accountOfDay.name, pinsPerBatch: accountOfDay.pinsPerBatch, pinsCompleted: accountOfDay.pinsCompleted, cycle: accountOfDay.cycle }
        : null,
      accounts: accounts.map((a) => ({ id: a.id, name: a.name, done: a.doneThisCycle, cycle: a.cycle, orderIndex: a.orderIndex, pinsCompleted: a.pinsCompleted, pinsPerBatch: a.pinsPerBatch })),
      accountsDone, totalAccounts: accounts.length, cycleNumber,
      pct: Math.round(pinterestPct),
    },
    categories: categoryProgress,
    streak: { current: streak.currentStreak, longest: streak.longestStreak, rewards: streak.rewards, totalDays: streak.totalDays },
    history,
    overallPct,
    reminders,
    rewards,
  });
}
