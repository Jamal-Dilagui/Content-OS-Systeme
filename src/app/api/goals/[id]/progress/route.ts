import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const MS_PER_DAY = 86400000;
const MS_PER_WEEK = MS_PER_DAY * 7;
const MS_PER_MONTH = MS_PER_DAY * 30.44;

type GoalRow = {
  id: string;
  name: string;
  type: string;
  category: string;
  metric: string;
  targetAmount: number;
  currentAmount: number;
  startDate: Date;
  deadline: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

function computeStatus(goal: { currentAmount: number; targetAmount: number; startDate: Date; deadline: Date }): string {
  const { currentAmount, targetAmount, startDate, deadline } = goal;
  if (targetAmount <= 0) return "NOT_STARTED";
  if (currentAmount >= targetAmount) return "ACHIEVED";
  const now = Date.now();
  const start = startDate.getTime();
  const end = deadline.getTime();
  if (now > end) return "MISSED";
  if (currentAmount <= 0) return "NOT_STARTED";
  const total = end - start;
  if (total <= 0) return currentAmount >= targetAmount ? "ACHIEVED" : "AT_RISK";
  const elapsed = Math.max(0, now - start);
  const elapsedFraction = Math.min(1, elapsed / total);
  const expectedCurrent = targetAmount * elapsedFraction;
  if (expectedCurrent <= 0) return "ON_TRACK";
  const pace = currentAmount / expectedCurrent;
  return pace >= 0.85 ? "ON_TRACK" : "AT_RISK";
}

function enrichGoal(g: GoalRow, now: Date = new Date()) {
  const target = g.targetAmount || 0;
  const current = g.currentAmount || 0;
  const progressPct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const remaining = Math.max(0, target - current);

  const daysRemaining = Math.max(
    0,
    Math.ceil((g.deadline.getTime() - now.getTime()) / MS_PER_DAY)
  );
  const weeksRemaining = Math.max(0, (g.deadline.getTime() - now.getTime()) / MS_PER_WEEK);
  const monthsRemaining = Math.max(0, (g.deadline.getTime() - now.getTime()) / MS_PER_MONTH);

  const requiredMonthly = remaining > 0 && monthsRemaining > 0 ? remaining / monthsRemaining : remaining > 0 ? remaining : 0;
  const requiredWeekly = remaining > 0 && weeksRemaining > 0 ? remaining / weeksRemaining : remaining > 0 ? remaining : 0;

  const total = g.deadline.getTime() - g.startDate.getTime();
  let elapsedFraction = 0;
  if (total > 0) {
    elapsedFraction = Math.max(0, Math.min(1, (now.getTime() - g.startDate.getTime()) / total));
  }
  const actualFraction = target > 0 ? Math.min(1, current / target) : 0;
  const pace = elapsedFraction > 0 ? actualFraction / elapsedFraction : actualFraction > 0 ? 1 : 0;

  let paceLabel: "ahead" | "on-pace" | "behind" | "achieved" | "missed" = "on-pace";
  if (current >= target && target > 0) paceLabel = "achieved";
  else if (now > g.deadline) paceLabel = "missed";
  else if (pace >= 1.05) paceLabel = "ahead";
  else if (pace >= 0.85) paceLabel = "on-pace";
  else paceLabel = "behind";

  return {
    id: g.id,
    name: g.name,
    type: g.type,
    category: g.category,
    metric: g.metric,
    targetAmount: target,
    currentAmount: current,
    progressPct: Math.round(progressPct * 10) / 10,
    remaining: Math.round(remaining * 100) / 100,
    startDate: g.startDate.toISOString(),
    deadline: g.deadline.toISOString(),
    daysRemaining,
    weeksRemaining: Math.round(weeksRemaining * 10) / 10,
    monthsRemaining: Math.round(monthsRemaining * 10) / 10,
    requiredMonthly: Math.round(requiredMonthly * 100) / 100,
    requiredWeekly: Math.round(requiredWeekly * 100) / 100,
    status: g.status,
    computedStatus: computeStatus(g),
    pace: Math.round(pace * 100) / 100,
    paceLabel,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

// POST — update currentAmount and recompute status from pace.
// Body: { currentAmount: number }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { currentAmount } = body;

  const c = Number(currentAmount);
  if (isNaN(c) || c < 0) {
    return NextResponse.json({ error: "currentAmount must be a non-negative number" }, { status: 400 });
  }

  const existing = await db.financialGoal.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const newStatus = computeStatus({
    currentAmount: c,
    targetAmount: existing.targetAmount,
    startDate: existing.startDate,
    deadline: existing.deadline,
  });

  const updated = await db.financialGoal.update({
    where: { id },
    data: { currentAmount: c, status: newStatus },
  });

  return NextResponse.json(enrichGoal(updated as GoalRow));
}
