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
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function growth(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}

const TRAFFIC_SOURCES = ["PINTEREST", "GOOGLE", "FACEBOOK", "DIRECT", "OTHER"];
const CHANNELS = ["PINTEREST", "BLOG", "DIGITAL_PRODUCTS", "FACEBOOK"];

// GET — full analytics: all KPIs + growth score + channel profitability + funnel + forecasting
export async function GET() {
  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);
  const prevStart = startOfPrevMonth(now);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // ---- Fetch raw data ----
  const [revenues, expenses, traffic, prevTraffic, pins, articles, products, tasks, growthConfig, yearlyGoal] = await Promise.all([
    db.revenue.findMany(),
    db.expense.findMany(),
    db.trafficAnalytics.findMany({ where: { date: { gte: mStart, lte: mEnd } } }),
    db.trafficAnalytics.findMany({ where: { date: { gte: prevStart, lte: prevEnd } } }),
    db.pinterestPin.findMany(),
    db.blogArticle.findMany(),
    db.digitalProduct.findMany(),
    db.task.findMany(),
    db.growthScoreConfig.findFirst(),
    db.yearlyGoal.findFirst({ where: { year: now.getFullYear() } }),
  ]);

  // ---------- KPI: BUSINESS ----------
  const monthRevenue = revenues.filter((r) => r.date >= mStart && r.date <= mEnd).reduce((s, r) => s + r.amount, 0);
  const prevMonthRevenue = revenues.filter((r) => r.date >= prevStart && r.date <= prevEnd).reduce((s, r) => s + r.amount, 0);
  const monthExpenses = expenses.filter((e) => e.date >= mStart && e.date <= mEnd).reduce((s, e) => s + e.amount, 0);
  const prevMonthExpenses = expenses.filter((e) => e.date >= prevStart && e.date <= prevEnd).reduce((s, e) => s + e.amount, 0);
  const monthProfit = monthRevenue - monthExpenses;
  const prevMonthProfit = prevMonthRevenue - prevMonthExpenses;
  const profitMargin = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0;
  const revGrowth = growth(monthRevenue, prevMonthRevenue);
  const profitGrowth = growth(monthProfit, prevMonthProfit);

  // ---------- KPI: TRAFFIC ----------
  const totalSessions = traffic.reduce((s, t) => s + t.sessions, 0);
  const prevTotalSessions = prevTraffic.reduce((s, t) => s + t.sessions, 0);
  const organicTraffic = traffic.filter((t) => t.source === "GOOGLE").reduce((s, t) => s + t.sessions, 0);
  const pinterestTraffic = traffic.filter((t) => t.source === "PINTEREST").reduce((s, t) => s + t.sessions, 0);
  const trafficGrowth = growth(totalSessions, prevTotalSessions);

  // ---------- KPI: PINTEREST ----------
  const monthPinsPublished = pins.filter((p) => p.status === "PUBLISHED" && p.publishedDate && p.publishedDate >= mStart && p.publishedDate <= mEnd).length;
  const pinsCreated = pins.length;
  const publishedPinsAll = pins.filter((p) => p.status === "PUBLISHED");
  const totalImpressions = publishedPinsAll.reduce((s, p) => s + (p.impressions || 0), 0);
  const totalSaves = publishedPinsAll.reduce((s, p) => s + (p.saves || 0), 0);
  const totalOutboundClicks = publishedPinsAll.reduce((s, p) => s + (p.outboundClicks || 0), 0);
  const avgCtr = totalImpressions > 0 ? (totalOutboundClicks / totalImpressions) * 100 : 0;

  // ---------- KPI: BLOG ----------
  const articlesPublishedThisMonth = articles.filter((a) => (a.status === "PUBLISHED" || a.status === "PROMOTED") && a.publishedDate && a.publishedDate >= mStart && a.publishedDate <= mEnd).length;
  const publishedArticles = articles.filter((a) => a.status === "PUBLISHED" || a.status === "PROMOTED");
  const organicSessions = publishedArticles.reduce((s, a) => s + (a.organicTraffic || 0), 0);
  const topPages = [...publishedArticles]
    .sort((a, b) => (b.organicTraffic || 0) - (a.organicTraffic || 0))
    .slice(0, 5)
    .map((a) => ({ id: a.id, title: a.title, traffic: a.organicTraffic || 0, revenue: a.revenue || 0 }));
  const keywordCounts = new Map<string, { count: number; traffic: number; clicks: number }>();
  for (const a of publishedArticles) {
    if (!a.keyword) continue;
    const k = a.keyword.trim();
    if (!k) continue;
    const cur = keywordCounts.get(k) || { count: 0, traffic: 0, clicks: 0 };
    cur.count += 1;
    cur.traffic += a.organicTraffic || 0;
    cur.clicks += a.clicks || 0;
    keywordCounts.set(k, cur);
  }
  const topKeywords = Array.from(keywordCounts.entries())
    .map(([keyword, v]) => ({ keyword, count: v.count, traffic: v.traffic, clicks: v.clicks }))
    .sort((a, b) => b.traffic - a.traffic)
    .slice(0, 5);
  const affiliateClicks = publishedArticles.reduce((s, a) => s + (a.affiliateClicks || 0), 0);

  // ---------- KPI: PRODUCTS ----------
  const productsCreated = products.length;
  const productsLive = products.filter((p) => p.status === "LIVE" || p.status === "OPTIMIZATION").length;
  const unitsSold = products.reduce((s, p) => s + (p.unitsSold || 0), 0);
  const productsRevenue = products.reduce((s, p) => s + (p.revenue || 0), 0);
  const liveProducts = products.filter((p) => p.status === "LIVE" || p.status === "OPTIMIZATION");
  // ConversionRate stored as fraction 0-1, normalize to 0-100 for display
  const productConversionRate = liveProducts.length > 0
    ? (liveProducts.reduce((s, p) => s + (p.conversionRate || 0), 0) / liveProducts.length) * 100
    : 0;
  const revenuePerProduct = productsLive > 0 ? productsRevenue / productsLive : 0;
  const productsLaunchedThisMonth = products.filter(
    (p) => (p.status === "LIVE" || p.status === "OPTIMIZATION") && p.publishedDate && p.publishedDate >= mStart && p.publishedDate <= mEnd
  ).length;

  // ---------- KPI: OPERATIONS ----------
  const tasksCompleted = tasks.filter((t) => t.status === "DONE").length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0;
  const overdueTasks = tasks.filter((t) => t.status !== "DONE" && t.dueDate && t.dueDate < now).length;
  const backlog = tasks.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS" || t.status === "BLOCKED").length;

  // ---------- GROWTH SCORE ----------
  // Components: revenue growth, traffic growth, content production, pinterest growth, product growth, profitability
  const config = growthConfig || {
    revenueGrowthWeight: 25,
    trafficGrowthWeight: 20,
    contentProductionWeight: 15,
    pinterestGrowthWeight: 15,
    productGrowthWeight: 15,
    profitabilityWeight: 10,
  };
  const totalWeight = config.revenueGrowthWeight + config.trafficGrowthWeight + config.contentProductionWeight + config.pinterestGrowthWeight + config.productGrowthWeight + config.profitabilityWeight;

  // Raw metrics
  const revGrowthRaw = revGrowth;
  const trafficGrowthRaw = trafficGrowth;
  // Content production = articles published this month (normalize against 30)
  const contentProductionRaw = articlesPublishedThisMonth;
  // Pinterest growth = pins published growth vs prev month
  const prevMonthPinsPublished = pins.filter((p) => p.status === "PUBLISHED" && p.publishedDate && p.publishedDate >= prevStart && p.publishedDate <= prevEnd).length;
  const pinterestGrowthRaw = growth(monthPinsPublished, prevMonthPinsPublished);
  // Product growth = products launched this month (normalize against 2)
  const productGrowthRaw = productsLaunchedThisMonth;
  // Profitability raw = profit margin
  const profitabilityRaw = profitMargin;

  // Normalize 0-100
  const revGrowthScore = clamp(revGrowthRaw * 2, 0, 100);
  const trafficGrowthScore = clamp(trafficGrowthRaw * 2, 0, 100);
  const contentProductionScore = clamp((contentProductionRaw / 30) * 100, 0, 100);
  const pinterestGrowthScore = clamp(pinterestGrowthRaw * 2, 0, 100);
  const productGrowthScore = clamp((productGrowthRaw / 2) * 100, 0, 100);
  const profitabilityScore = clamp(profitabilityRaw, 0, 100);

  const components = [
    { key: "revenueGrowth", label: "Revenue Growth", weight: config.revenueGrowthWeight, raw: revGrowthRaw, rawLabel: `${round1(revGrowthRaw)}% growth vs last month`, score: round1(revGrowthScore), contribution: round1((revGrowthScore * config.revenueGrowthWeight) / (totalWeight || 100)) },
    { key: "trafficGrowth", label: "Traffic Growth", weight: config.trafficGrowthWeight, raw: trafficGrowthRaw, rawLabel: `${round1(trafficGrowthRaw)}% growth vs last month`, score: round1(trafficGrowthScore), contribution: round1((trafficGrowthScore * config.trafficGrowthWeight) / (totalWeight || 100)) },
    { key: "contentProduction", label: "Content Production", weight: config.contentProductionWeight, raw: contentProductionRaw, rawLabel: `${contentProductionRaw} articles this month (target 30)`, score: round1(contentProductionScore), contribution: round1((contentProductionScore * config.contentProductionWeight) / (totalWeight || 100)) },
    { key: "pinterestGrowth", label: "Pinterest Growth", weight: config.pinterestGrowthWeight, raw: pinterestGrowthRaw, rawLabel: `${round1(pinterestGrowthRaw)}% pin growth vs last month`, score: round1(pinterestGrowthScore), contribution: round1((pinterestGrowthScore * config.pinterestGrowthWeight) / (totalWeight || 100)) },
    { key: "productGrowth", label: "Product Growth", weight: config.productGrowthWeight, raw: productGrowthRaw, rawLabel: `${productGrowthRaw} product(s) launched this month (target 2)`, score: round1(productGrowthScore), contribution: round1((productGrowthScore * config.productGrowthWeight) / (totalWeight || 100)) },
    { key: "profitability", label: "Profitability", weight: config.profitabilityWeight, raw: profitabilityRaw, rawLabel: `${round1(profitabilityRaw)}% profit margin`, score: round1(profitabilityScore), contribution: round1((profitabilityScore * config.profitabilityWeight) / (totalWeight || 100)) },
  ];
  const growthScore = round1(components.reduce((s, c) => s + c.contribution, 0));

  // ---------- CHANNEL PROFITABILITY ----------
  // For PINTEREST/BLOG/DIGITAL_PRODUCTS/FACEBOOK. Map traffic source for each channel and aggregate rev/expenses by channel.
  const channelProfitability = CHANNELS.map((ch) => {
    // Traffic: map channel to traffic source (DIGITAL_PRODUCTS -> no direct traffic; BLOG -> GOOGLE+DIRECT+OTHER; FACEBOOK -> FACEBOOK; PINTEREST -> PINTEREST)
    let trSource: string[] = [];
    if (ch === "PINTEREST") trSource = ["PINTEREST"];
    else if (ch === "BLOG") trSource = ["GOOGLE", "DIRECT", "OTHER"];
    else if (ch === "FACEBOOK") trSource = ["FACEBOOK"];
    else if (ch === "DIGITAL_PRODUCTS") trSource = []; // products are sold via direct links, attributed separately

    const channelTraffic = traffic.filter((t) => trSource.includes(t.source));
    const tr = channelTraffic.reduce((s, t) => s + t.sessions, 0);
    const conv = channelTraffic.reduce((s, t) => s + (t.conversions || 0), 0);

    // Revenue mapping: PINTEREST channel, BLOG channel, FACEBOOK channel, or DIGITAL_PRODUCT source
    let rev = 0;
    let exp = 0;
    if (ch === "DIGITAL_PRODUCTS") {
      rev = revenues.filter((r) => r.source === "DIGITAL_PRODUCT" || r.source === "ETSY" || r.source === "PAYHIP").reduce((s, r) => s + r.amount, 0);
    } else {
      rev = revenues.filter((r) => r.channel === ch).reduce((s, r) => s + r.amount, 0);
    }
    exp = expenses.filter((e) => e.channel === ch).reduce((s, e) => s + e.amount, 0);

    const profit = rev - exp;
    const roi = exp > 0 ? ((rev - exp) / exp) * 100 : rev > 0 ? 100 : 0;
    const conversionRate = tr > 0 ? (conv / tr) * 100 : 0;
    return {
      channel: ch,
      traffic: tr,
      revenue: Math.round(rev),
      expenses: Math.round(exp),
      profit: Math.round(profit),
      roi: round1(roi),
      conversionRate: round1(conversionRate),
    };
  });
  const bestRoiChannel = channelProfitability.length > 0
    ? channelProfitability.reduce((best, c) => (c.roi > best.roi ? c : best), channelProfitability[0])
    : null;

  // ---------- BUSINESS FUNNEL ----------
  // Content → Traffic → Website → Product/Affiliate → Click → Conversion → Revenue → Profit
  const totalContent = pinsCreated + articles.length;
  const funnelTraffic = totalSessions;
  const websiteVisits = traffic.reduce((s, t) => s + (t.pageViews || 0), 0);
  const productClicks = products.reduce((s, p) => s + 0, 0) + articles.reduce((s, a) => s + (a.productClicks || 0), 0) + traffic.reduce((s, t) => s + (t.clicks || 0), 0);
  const totalClicks = traffic.reduce((s, t) => s + (t.clicks || 0), 0);
  const conversions = traffic.reduce((s, t) => s + (t.conversions || 0), 0);
  const funnelRevenue = monthRevenue;
  const funnelProfit = monthProfit;

  const funnelStages = [
    { stage: "Content", value: totalContent, color: "violet", unit: "count", sublabel: "Pins + articles published" },
    { stage: "Traffic", value: funnelTraffic, color: "sky", unit: "count", sublabel: "Sessions this month" },
    { stage: "Website Visits", value: websiteVisits, color: "emerald", unit: "count", sublabel: "Page views this month" },
    { stage: "Product / Affiliate Clicks", value: productClicks, color: "amber", unit: "count", sublabel: "Outbound clicks" },
    { stage: "Conversions", value: conversions, color: "rose", unit: "count", sublabel: "Purchases / signups" },
    { stage: "Revenue", value: Math.round(funnelRevenue), color: "emerald", unit: "currency", sublabel: "This month revenue" },
    { stage: "Profit", value: Math.round(funnelProfit), color: "violet", unit: "currency", sublabel: "Revenue minus expenses" },
  ];
  // Conversion display between consecutive stages:
  // - count→count where current<prev (true funnel narrowing): show "X.X%" pct
  // - count→count where current>=prev (multiplier like pageviews/session): show "X.X×" multiplier
  // - count→currency (Conversions→Revenue): show "$X.XX per conversion" AOV
  // - currency→currency (Revenue→Profit): show "X.X%" margin
  const funnelWithConv = funnelStages.map((s, i) => {
    const prev = i > 0 ? funnelStages[i - 1] : null;
    let convPct: number | null = null;
    let convDisplay = "";
    let convType: "pct" | "multiplier" | "currency" | null = null;
    if (prev && prev.value > 0) {
      const ratio = s.value / prev.value;
      if (prev.unit === "count" && s.unit === "count") {
        if (ratio < 1) {
          convPct = ratio * 100;
          convDisplay = `${convPct.toFixed(1)}%`;
          convType = "pct";
        } else {
          convDisplay = `${ratio.toFixed(1)}×`;
          convType = "multiplier";
        }
      } else if (prev.unit === "count" && s.unit === "currency") {
        convDisplay = `$${ratio.toFixed(2)} per ${prev.stage.toLowerCase().replace(/s$/, "")}`;
        convType = "currency";
      } else if (prev.unit === "currency" && s.unit === "currency") {
        convPct = ratio * 100;
        convDisplay = `${convPct.toFixed(1)}% margin`;
        convType = "pct";
      }
    }
    return { ...s, conversionFromPrev: convPct, convDisplay, convType };
  });
  // Bottleneck: lowest true conversion % (pct type, between count→count narrowing stages)
  const convStages = funnelWithConv.filter(
    (s) => s.conversionFromPrev !== null && s.convType === "pct" && s.unit === "count"
  );
  const bottleneck = convStages.length > 0
    ? convStages.reduce((min, s) => ((s.conversionFromPrev as number) < (min.conversionFromPrev as number) ? s : min), convStages[0])
    : null;

  // ---------- FORECASTING ----------
  // Use current month's run-rate × remaining days + current
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = daysInMonth - dayOfMonth;
  const dailyRevRate = dayOfMonth > 0 ? monthRevenue / dayOfMonth : 0;
  const dailyTrafficRate = dayOfMonth > 0 ? totalSessions / dayOfMonth : 0;
  const forecastRevenue = monthRevenue + dailyRevRate * remainingDays;
  const forecastTraffic = totalSessions + dailyTrafficRate * remainingDays;

  // Monthly revenue target (from FinancialGoal) and yearly revenue target (from YearlyGoal)
  const monthlyGoal = await db.financialGoal.findFirst({
    where: { type: "MONTHLY", metric: "REVENUE" },
    orderBy: { createdAt: "desc" },
  });
  const monthlyTarget = monthlyGoal?.targetAmount ?? 3000;
  const yearlyTarget = yearlyGoal?.revenueTarget ?? 0;

  // Year-to-date revenue
  const ytdStart = new Date(now.getFullYear(), 0, 1);
  const ytdRevenue = revenues.filter((r) => r.date >= ytdStart && r.date <= mEnd).reduce((s, r) => s + r.amount, 0);
  // Average monthly revenue this year (so far)
  const monthsElapsed = dayOfMonth > 15 ? now.getMonth() + 1 : now.getMonth(); // current month counts if past mid-month
  const avgMonthlyRevThisYear = monthsElapsed > 0 ? ytdRevenue / monthsElapsed : 0;
  const forecastYearlyRevenue = ytdRevenue + avgMonthlyRevThisYear * (12 - monthsElapsed);

  const revenueGap = forecastRevenue - monthlyTarget; // negative = behind
  const trafficGap = forecastTraffic - 0; // no traffic target in schema; rely on monthlyGoal metric=TRAFFIC if exists
  const trafficGoal = await db.financialGoal.findFirst({ where: { type: "MONTHLY", metric: "TRAFFIC" }, orderBy: { createdAt: "desc" } });
  const monthlyTrafficTarget = trafficGoal?.targetAmount ?? 0;

  const forecasting = {
    isEstimate: true,
    revenue: {
      current: Math.round(monthRevenue),
      target: Math.round(monthlyTarget),
      forecast: Math.round(forecastRevenue),
      gap: Math.round(revenueGap),
      onPace: forecastRevenue >= monthlyTarget,
      requiredAdditional: Math.max(0, monthlyTarget - forecastRevenue),
      label: forecastRevenue >= monthlyTarget
        ? "On pace to reach monthly revenue target"
        : "At current pace, target is unlikely to be reached",
    },
    traffic: {
      current: totalSessions,
      target: Math.round(monthlyTrafficTarget),
      forecast: Math.round(forecastTraffic),
      gap: monthlyTrafficTarget > 0 ? Math.round(forecastTraffic - monthlyTrafficTarget) : 0,
      onPace: monthlyTrafficTarget > 0 ? forecastTraffic >= monthlyTrafficTarget : true,
      requiredAdditional: monthlyTrafficTarget > 0 ? Math.max(0, Math.round(monthlyTrafficTarget - forecastTraffic)) : 0,
      label: monthlyTrafficTarget === 0
        ? "No monthly traffic target set — set a TRAFFIC goal to enable this forecast"
        : forecastTraffic >= monthlyTrafficTarget
          ? "On pace to reach monthly traffic target"
          : "At current pace, traffic target is unlikely to be reached",
    },
    yearlyRevenue: {
      current: Math.round(ytdRevenue),
      target: Math.round(yearlyTarget),
      forecast: Math.round(forecastYearlyRevenue),
      gap: Math.round(forecastYearlyRevenue - yearlyTarget),
      onPace: forecastYearlyRevenue >= yearlyTarget,
      requiredAdditional: yearlyTarget > 0 ? Math.max(0, Math.round(yearlyTarget - forecastYearlyRevenue)) : 0,
      label: yearlyTarget === 0
        ? "No yearly revenue target set"
        : forecastYearlyRevenue >= yearlyTarget
          ? "On pace to reach yearly revenue target"
          : "At current pace, yearly target is unlikely to be reached",
    },
    meta: {
      dayOfMonth,
      daysInMonth,
      remainingDays,
      dailyRevRate: Math.round(dailyRevRate * 100) / 100,
      dailyTrafficRate: Math.round(dailyTrafficRate * 100) / 100,
      monthsElapsed,
      avgMonthlyRevThisYear: Math.round(avgMonthlyRevThisYear),
    },
  };

  // ---------- isDemo detection ----------
  const isDemo = revenues.some((r) => r.description === "Demo revenue entry")
    || expenses.some((e) => e.description === "Demo expense entry")
    || traffic.some((t) => t.sessions >= 0 && (t.users === Math.floor(t.sessions * 0.82) || t.users === 0)); // rough demo flag for traffic seed

  return NextResponse.json({
    now: now.toISOString(),
    isDemo,
    kpis: {
      business: {
        revenue: Math.round(monthRevenue),
        profit: Math.round(monthProfit),
        profitMargin: round1(profitMargin),
        revenueGrowth: round1(revGrowth),
        profitGrowth: round1(profitGrowth),
      },
      traffic: {
        totalTraffic: totalSessions,
        organicTraffic,
        pinterestTraffic,
        trafficGrowth: round1(trafficGrowth),
      },
      pinterest: {
        pinsCreated,
        pinsPublished: monthPinsPublished,
        impressions: totalImpressions,
        saves: totalSaves,
        outboundClicks: totalOutboundClicks,
        ctr: round1(avgCtr),
      },
      blog: {
        articlesPublished: articlesPublishedThisMonth,
        organicSessions,
        topPages,
        topKeywords,
        affiliateClicks,
      },
      products: {
        productsLive,
        productsCreated,
        unitsSold,
        conversionRate: round1(productConversionRate),
        revenuePerProduct: Math.round(revenuePerProduct),
      },
      operations: {
        tasksCompleted,
        completionRate: round1(completionRate),
        overdueTasks,
        backlog,
      },
    },
    growthScore: {
      score: growthScore,
      components,
      config: {
        revenueGrowthWeight: config.revenueGrowthWeight,
        trafficGrowthWeight: config.trafficGrowthWeight,
        contentProductionWeight: config.contentProductionWeight,
        pinterestGrowthWeight: config.pinterestGrowthWeight,
        productGrowthWeight: config.productGrowthWeight,
        profitabilityWeight: config.profitabilityWeight,
        totalWeight,
      },
    },
    channelProfitability,
    bestRoiChannel,
    funnel: funnelWithConv,
    bottleneck,
    forecasting,
  });
}
