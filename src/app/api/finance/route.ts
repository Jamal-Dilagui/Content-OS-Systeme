import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ---------- Helpers ----------
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfPrevMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

const REV_SOURCES = ["AFFILIATE", "DIGITAL_PRODUCT", "ETSY", "PAYHIP", "OTHER"];
const EXP_CATEGORIES = ["AI_TOOLS", "HOSTING", "DOMAINS", "SAAS", "AUTOMATION", "ADS", "DESIGN", "OTHER"];
const CHANNELS = ["PINTEREST", "BLOG", "FACEBOOK"];

// GET — full financial summary
export async function GET() {
  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);
  const prevStart = startOfPrevMonth(now);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const revenues = await db.revenue.findMany({ orderBy: { date: "desc" } });
  const expenses = await db.expense.findMany({ orderBy: { date: "desc" } });

  // ---- Current month ----
  const monthRevenues = revenues.filter((r) => r.date >= mStart && r.date <= mEnd);
  const prevMonthRevenues = revenues.filter((r) => r.date >= prevStart && r.date <= prevEnd);
  const monthExpenses = expenses.filter((e) => e.date >= mStart && e.date <= mEnd);
  const prevMonthExpenses = expenses.filter((e) => e.date >= prevStart && e.date <= prevEnd);

  const monthRevenue = monthRevenues.reduce((s, r) => s + r.amount, 0);
  const prevMonthRevenue = prevMonthRevenues.reduce((s, r) => s + r.amount, 0);
  const monthExpensesTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const prevMonthExpensesTotal = prevMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const monthProfit = monthRevenue - monthExpensesTotal;
  const prevMonthProfit = prevMonthRevenue - prevMonthExpensesTotal;

  const profitMargin = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0;
  const prevProfitMargin = prevMonthRevenue > 0 ? (prevMonthProfit / prevMonthRevenue) * 100 : 0;

  const revGrowth = prevMonthRevenue > 0 ? ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : monthRevenue > 0 ? 100 : 0;
  const expGrowth = prevMonthExpensesTotal > 0 ? ((monthExpensesTotal - prevMonthExpensesTotal) / prevMonthExpensesTotal) * 100 : monthExpensesTotal > 0 ? 100 : 0;
  const profitGrowth = prevMonthProfit !== 0 ? ((monthProfit - prevMonthProfit) / Math.abs(prevMonthProfit)) * 100 : monthProfit > 0 ? 100 : monthProfit < 0 ? -100 : 0;

  // ---- 6-month series ----
  const months: Array<{
    key: string;
    label: string;
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
  }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const rev = revenues.filter((r) => r.date >= d && r.date <= e).reduce((s, r) => s + r.amount, 0);
    const exp = expenses.filter((ex) => ex.date >= d && ex.date <= e).reduce((s, ex) => s + ex.amount, 0);
    const profit = rev - exp;
    const margin = rev > 0 ? (profit / rev) * 100 : 0;
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      revenue: Math.round(rev),
      expenses: Math.round(exp),
      profit: Math.round(profit),
      margin: Math.round(margin * 10) / 10,
    });
  }

  // ---- Revenue by source (all time) ----
  const revenueBySource = REV_SOURCES.map((src) => ({
    source: src,
    amount: Math.round(revenues.filter((r) => r.source === src).reduce((s, r) => s + r.amount, 0)),
  })).sort((a, b) => b.amount - a.amount);

  // ---- Expenses by category (all time) ----
  const expensesByCategory = EXP_CATEGORIES.map((cat) => ({
    category: cat,
    amount: Math.round(expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0)),
  })).sort((a, b) => b.amount - a.amount);

  // ---- Revenue by channel (all time) ----
  const revenueByChannel = CHANNELS.map((ch) => ({
    channel: ch,
    amount: Math.round(revenues.filter((r) => r.channel === ch).reduce((s, r) => s + r.amount, 0)),
  })).sort((a, b) => b.amount - a.amount);

  // ---- Avg monthly revenue / profit (over months that have data) ----
  const monthsWithData = months.filter((m) => m.revenue > 0 || m.expenses > 0);
  const avgMonthlyRevenue = monthsWithData.length > 0
    ? monthsWithData.reduce((s, m) => s + m.revenue, 0) / monthsWithData.length
    : 0;
  const avgMonthlyProfit = monthsWithData.length > 0
    ? monthsWithData.reduce((s, m) => s + m.profit, 0) / monthsWithData.length
    : 0;

  // ---- Best / worst month (by revenue) ----
  const sortedByRevenue = [...monthsWithData].sort((a, b) => b.revenue - a.revenue);
  const bestMonth = sortedByRevenue[0] ?? null;
  const worstMonth = sortedByRevenue[sortedByRevenue.length - 1] ?? null;

  // ---- Monthly revenue goal (for revenue goal progress card + chart reference line) ----
  const monthlyGoal = await db.financialGoal.findFirst({
    where: { type: "MONTHLY", metric: "REVENUE" },
    orderBy: { createdAt: "desc" },
  });
  const goalAmount = monthlyGoal?.targetAmount ?? 0;
  const goalAchievedPct = goalAmount > 0 ? (monthRevenue / goalAmount) * 100 : 0;
  const goalRemaining = Math.max(0, goalAmount - monthRevenue);

  // ---- Recent transactions (combined + sorted desc) ----
  const recentRevenue = revenues.slice(0, 50).map((r) => ({
    id: r.id,
    kind: "revenue" as const,
    date: r.date.toISOString(),
    amount: r.amount,
    category: r.source,
    channel: r.channel,
    description: r.description,
  }));
  const recentExpense = expenses.slice(0, 50).map((e) => ({
    id: e.id,
    kind: "expense" as const,
    date: e.date.toISOString(),
    amount: e.amount,
    category: e.category,
    channel: e.channel,
    description: e.description,
  }));
  const transactions = [...recentRevenue, ...recentExpense]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50);

  // ---- Is this seeded/demo data? ----
  const isDemo = revenues.some((r) => r.description === "Demo revenue entry")
    || expenses.some((e) => e.description === "Demo expense entry");

  return NextResponse.json({
    now: now.toISOString(),
    isDemo,
    currentMonth: {
      revenue: Math.round(monthRevenue),
      expenses: Math.round(monthExpensesTotal),
      profit: Math.round(monthProfit),
      margin: Math.round(profitMargin * 10) / 10,
      revGrowth: Math.round(revGrowth * 10) / 10,
      expGrowth: Math.round(expGrowth * 10) / 10,
      profitGrowth: Math.round(profitGrowth * 10) / 10,
    },
    prevMonth: {
      revenue: Math.round(prevMonthRevenue),
      expenses: Math.round(prevMonthExpensesTotal),
      profit: Math.round(prevMonthProfit),
      margin: Math.round(prevProfitMargin * 10) / 10,
    },
    months,
    revenueBySource,
    expensesByCategory,
    revenueByChannel,
    avgMonthlyRevenue: Math.round(avgMonthlyRevenue),
    avgMonthlyProfit: Math.round(avgMonthlyProfit),
    bestMonth,
    worstMonth,
    goal: monthlyGoal
      ? {
          id: monthlyGoal.id,
          name: monthlyGoal.name,
          targetAmount: monthlyGoal.targetAmount,
          currentAmount: monthlyGoal.currentAmount,
          achievedPct: Math.round(goalAchievedPct * 10) / 10,
          remaining: Math.round(goalRemaining),
          deadline: monthlyGoal.deadline.toISOString(),
          status: monthlyGoal.status,
        }
      : null,
    transactions,
    counts: {
      revenue: revenues.length,
      expenses: expenses.length,
    },
  });
}

// POST — add a revenue OR expense entry (body.type = "revenue" | "expense")
export async function POST(req: Request) {
  const body = await req.json();
  const { type, date, amount, source, category, channel, description, productId, articleId } = body;

  if (!type || (type !== "revenue" && type !== "expense")) {
    return NextResponse.json({ error: "type must be 'revenue' or 'expense'" }, { status: 400 });
  }
  if (!date || typeof date !== "string") {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }
  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  if (type === "revenue") {
    const sourceVal = (source || "OTHER").trim();
    const entry = await db.revenue.create({
      data: {
        date: parsedDate,
        source: sourceVal,
        channel: channel ? channel.trim() : null,
        amount: amt,
        description: description?.trim() || null,
        productId: productId?.trim() || null,
        articleId: articleId?.trim() || null,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } else {
    const catVal = (category || "OTHER").trim();
    const entry = await db.expense.create({
      data: {
        date: parsedDate,
        category: catVal,
        channel: channel ? channel.trim() : null,
        amount: amt,
        description: description?.trim() || null,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  }
}
