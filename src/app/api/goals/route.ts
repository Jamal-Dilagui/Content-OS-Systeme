import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ---------- Helpers ----------

const MS_PER_DAY = 86400000;
const MS_PER_WEEK = MS_PER_DAY * 7;
const MS_PER_MONTH = MS_PER_DAY * 30.44; // avg month length

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

// Recompute status based on pace: (current / target) vs (elapsed / total).
//   ACHIEVED   — current >= target
//   MISSED     — deadline passed and not achieved
//   NOT_STARTED— current is 0 and not yet past deadline
//   ON_TRACK   — pace >= 0.85 (ahead of or near expected pace)
//   AT_RISK    — pace < 0.85 (behind expected pace)
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

  // Pace: actual progress fraction vs expected progress fraction (clamped 0..1).
  const total = g.deadline.getTime() - g.startDate.getTime();
  let elapsedFraction = 0;
  if (total > 0) {
    elapsedFraction = Math.max(0, Math.min(1, (now.getTime() - g.startDate.getTime()) / total));
  }
  const expectedFraction = elapsedFraction;
  const actualFraction = target > 0 ? Math.min(1, current / target) : 0;
  const pace = expectedFraction > 0 ? actualFraction / expectedFraction : actualFraction > 0 ? 1 : 0;

  let paceLabel: "ahead" | "on-pace" | "behind" | "achieved" | "missed" = "on-pace";
  if (current >= target && target > 0) paceLabel = "achieved";
  else if (now > g.deadline) paceLabel = "missed";
  else if (pace >= 1.05) paceLabel = "ahead";
  else if (pace >= 0.85) paceLabel = "on-pace";
  else paceLabel = "behind";

  const computedStatus = computeStatus(g);

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
    computedStatus,
    pace: Math.round(pace * 100) / 100,
    paceLabel,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

// GET — list all goals with computed progress, remaining, required avg, status.
export async function GET() {
  const now = new Date();
  const goals = await db.financialGoal.findMany({
    orderBy: [{ type: "asc" }, { deadline: "asc" }],
  });

  const enriched = goals.map((g) => enrichGoal(g as GoalRow, now));

  // Summary by status
  const summary: Record<string, number> = {
    NOT_STARTED: 0,
    ON_TRACK: 0,
    AT_RISK: 0,
    ACHIEVED: 0,
    MISSED: 0,
  };
  for (const g of enriched) {
    summary[g.computedStatus] = (summary[g.computedStatus] ?? 0) + 1;
  }

  return NextResponse.json({
    goals: enriched,
    summary,
    total: enriched.length,
  });
}

// POST — create a new goal
export async function POST(req: Request) {
  const body = await req.json();
  const {
    name,
    type,
    category,
    metric,
    targetAmount,
    currentAmount,
    startDate,
    deadline,
    status,
  } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!type || !["MONTHLY", "QUARTERLY", "YEARLY", "LONG_TERM"].includes(type)) {
    return NextResponse.json({ error: "type must be MONTHLY/QUARTERLY/YEARLY/LONG_TERM" }, { status: 400 });
  }
  if (!startDate || !deadline) {
    return NextResponse.json({ error: "startDate and deadline are required" }, { status: 400 });
  }
  const target = Number(targetAmount);
  if (isNaN(target) || target <= 0) {
    return NextResponse.json({ error: "targetAmount must be a positive number" }, { status: 400 });
  }
  const startD = new Date(startDate);
  const endD = new Date(deadline);
  if (isNaN(startD.getTime()) || isNaN(endD.getTime())) {
    return NextResponse.json({ error: "invalid date(s)" }, { status: 400 });
  }
  if (endD <= startD) {
    return NextResponse.json({ error: "deadline must be after startDate" }, { status: 400 });
  }

  const current = Number(currentAmount) || 0;
  const catVal = category?.trim() || "FINANCIAL";
  const metricVal = metric?.trim() || "REVENUE";

  // Compute initial status from pace
  const initialStatus = computeStatus({
    currentAmount: current,
    targetAmount: target,
    startDate: startD,
    deadline: endD,
  });

  const created = await db.financialGoal.create({
    data: {
      name: name.trim(),
      type,
      category: catVal,
      metric: metricVal,
      targetAmount: target,
      currentAmount: current,
      startDate: startD,
      deadline: endD,
      status: status || initialStatus,
    },
  });

  return NextResponse.json(enrichGoal(created as GoalRow), { status: 201 });
}
