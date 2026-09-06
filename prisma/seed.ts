// Seed script - populates the database with clearly-labeled DEMO data
// This data is synthetic and labeled as demo. Real analytics must use actual recorded data.
import { db } from "../src/lib/db";

async function main() {
  console.log("Seeding demo data...");

  const now = new Date();
  const year = now.getFullYear();

  // ---- Business ----
  const business = await db.business.create({
    data: { name: "My Content Business", description: "Solo online content business - blogging, Pinterest, digital products" },
  });

  // ---- Niches ----
  const niches = await Promise.all([
    db.niche.create({ data: { name: "Crochet & Crafts", description: "Crochet patterns, PDF downloads", businessId: business.id } }),
    db.niche.create({ data: { name: "Home & Organization", description: "Home decor, organization tips", businessId: business.id } }),
    db.niche.create({ data: { name: "Digital Planning", description: "Planners, printables", businessId: business.id } }),
  ]);

  // ---- Websites ----
  const websites = await Promise.all([
    db.website.create({ data: { name: "Crafty Hands Blog", url: "https://example-craft.com", nicheId: niches[0].id, businessId: business.id } }),
    db.website.create({ data: { name: "Home Haven", url: "https://example-home.com", nicheId: niches[1].id, businessId: business.id } }),
    db.website.create({ data: { name: "Plan & Print", url: "https://example-plan.com", nicheId: niches[2].id, businessId: business.id } }),
  ]);

  // ---- Pinterest Accounts (10 accounts) ----
  const accountNames = [
    "Crochet Daily Pins", "Cozy Crochet Co", "Home Decor Inspo", "Organize With Me",
    "Planner Paradise", "Craft Corner Pins", "Yarn & Hooks", "Modern Home Pins",
    "Printable Studio", "Creative Crafts HQ",
  ];
  const accounts = [];
  for (let i = 0; i < 10; i++) {
    const niche = niches[i % 3];
    const website = websites[i % 3];
    const acc = await db.pinterestAccount.create({
      data: {
        name: accountNames[i],
        nicheId: niche.id,
        websiteId: website.id,
        targetAudience: `${niche.name} enthusiasts`,
        status: i === 7 ? "PAUSED" : "ACTIVE",
        priority: i === 0 ? 1 : 0,
        orderIndex: i,
        currentCycle: Math.floor(i / 10) + 1,
        pinsPerBatch: 30,
        pinsCompleted: 30 - (i % 5) * 4,
        pinsPublished: 25 - (i % 5) * 3,
        lastWorkedDate: new Date(now.getTime() - i * 86400000),
        nextWorkDate: new Date(now.getTime() + i * 86400000),
        trafficGenerated: 1200 - i * 80,
        revenueGenerated: 180 - i * 12,
      },
    });
    accounts.push(acc);
    // create a couple boards per account
    for (let b = 0; b < 2; b++) {
      await db.pinterestBoard.create({ data: { name: `${niche.name} Board ${b + 1}`, accountId: acc.id } });
    }
  }

  // ---- Pinterest Pins ----
  const pinStatuses = ["IDEA", "BRIEF", "DESIGN", "READY", "SCHEDULED", "PUBLISHED", "PUBLISHED", "PUBLISHED"];
  const allBoards = await db.pinterestBoard.findMany();
  for (const acc of accounts) {
    const boards = allBoards.filter((b) => b.accountId === acc.id);
    for (let p = 0; p < 8; p++) {
      const status = pinStatuses[p % pinStatuses.length];
      await db.pinterestPin.create({
        data: {
          accountId: acc.id,
          boardId: boards[p % boards.length]?.id,
          contentType: p % 2 === 0 ? "article" : "product",
          title: `${acc.name} - Pin ${p + 1}`,
          hook: `Beautiful ${niches[0].name.toLowerCase()} idea #${p + 1}`,
          mainText: "Discover this amazing project today.",
          cta: "Get the free pattern",
          keywords: `${niches[0].name.toLowerCase()}, diy, tutorial`,
          description: `Pin ${p + 1} for ${acc.name}`,
          url: `https://example.com/pin-${p + 1}`,
          status,
          scheduledDate: status === "SCHEDULED" ? new Date(now.getTime() + p * 3600000) : null,
          publishedDate: status === "PUBLISHED" ? new Date(now.getTime() - p * 86400000) : null,
          impressions: status === "PUBLISHED" ? 500 + p * 120 : 0,
          saves: status === "PUBLISHED" ? 20 + p * 5 : 0,
          outboundClicks: status === "PUBLISHED" ? 8 + p * 2 : 0,
          engagement: status === "PUBLISHED" ? 0.04 + p * 0.005 : 0,
        },
      });
    }
  }

  // ---- Blog Articles ----
  const articleStatuses = ["IDEA", "KEYWORD", "BRIEF", "OUTLINE", "WRITING", "SEO", "READY", "PUBLISHED", "PUBLISHED", "PUBLISHED", "PROMOTED"];
  for (let w = 0; w < websites.length; w++) {
    for (let a = 0; a < 12; a++) {
      const status = articleStatuses[a % articleStatuses.length];
      await db.blogArticle.create({
        data: {
          websiteId: websites[w].id,
          title: `${websites[w].name} - Article ${a + 1}`,
          keyword: `keyword-${a + 1}`,
          url: `https://example.com/article-${a + 1}`,
          status,
          organicTraffic: status === "PUBLISHED" || status === "PROMOTED" ? 300 + a * 45 : 0,
          clicks: status === "PUBLISHED" || status === "PROMOTED" ? 150 + a * 20 : 0,
          affiliateClicks: status === "PUBLISHED" || status === "PROMOTED" ? 12 + a * 3 : 0,
          productClicks: status === "PUBLISHED" || status === "PROMOTED" ? 8 + a * 2 : 0,
          revenue: status === "PUBLISHED" || status === "PROMOTED" ? 15 + a * 4 : 0,
          publishedDate: status === "PUBLISHED" || status === "PROMOTED" ? new Date(now.getTime() - a * 86400000) : null,
        },
      });
    }
  }

  // ---- Digital Products ----
  const productStatuses = ["IDEA", "VALIDATION", "CREATION", "DESIGN", "PDF", "LISTING", "SEO", "LIVE", "LIVE", "LIVE"];
  const productNames = [
    "Easy Granny Square Pattern", "Boho Wall Hanging PDF", "Cozy Throw Blanket Pattern",
    "Minimalist Daily Planner", "Home Organization Bundle", "Crochet Flower Crown",
    "Amigurumi Bunny Pattern", "Boho Coaster Set PDF", "Seasonal Planner Pack", "Storage Labels Pack",
  ];
  for (let p = 0; p < 10; p++) {
    const status = productStatuses[p % productStatuses.length];
    const isLive = status === "LIVE";
    await db.digitalProduct.create({
      data: {
        name: productNames[p],
        type: p < 6 ? "CROCHET_PATTERN" : "PDF",
        nicheId: niches[p % 3].id,
        status,
        platform: p % 2 === 0 ? "Etsy" : "Payhip",
        price: 4.5 + p * 1.5,
        unitsSold: isLive ? 20 + p * 5 : 0,
        revenue: isLive ? (4.5 + p * 1.5) * (20 + p * 5) : 0,
        conversionRate: isLive ? 0.025 + p * 0.003 : 0,
        difficulty: p < 6 ? (p % 3 === 0 ? "Beginner" : p % 3 === 1 ? "Intermediate" : "Advanced") : null,
        materials: p < 6 ? "Yarn, hook, tapestry needle" : null,
        publishedDate: isLive ? new Date(now.getTime() - p * 5 * 86400000) : null,
      },
    });
  }

  // ---- Product Platforms ----
  await Promise.all([
    db.productPlatform.create({ data: { name: "Etsy", fee: 0.065 } }),
    db.productPlatform.create({ data: { name: "Payhip", fee: 0.05 } }),
    db.productPlatform.create({ data: { name: "Gumroad", fee: 0.1 } }),
  ]);

  // ---- Revenue (last 6 months) ----
  const revSources = ["AFFILIATE", "DIGITAL_PRODUCT", "ETSY", "PAYHIP", "OTHER"];
  const revChannels = ["PINTEREST", "BLOG", "FACEBOOK"];
  const baseRev = [1850, 2100, 1980, 2400, 2650, 2950];
  for (let m = 5; m >= 0; m--) {
    const monthDate = new Date(year, now.getMonth() - m, 15);
    const target = baseRev[5 - m];
    let placed = 0;
    while (placed < target) {
      const amt = 50 + Math.floor(Math.random() * 200);
      const actual = Math.min(amt, target - placed);
      placed += actual;
      await db.revenue.create({
        data: {
          date: new Date(monthDate.getTime() + Math.floor(Math.random() * 20) * 86400000),
          source: revSources[Math.floor(Math.random() * revSources.length)],
          channel: revChannels[Math.floor(Math.random() * revChannels.length)],
          amount: actual,
          description: "Demo revenue entry",
        },
      });
    }
  }

  // ---- Expenses (last 6 months) ----
  const expCategories = ["AI_TOOLS", "HOSTING", "DOMAINS", "SAAS", "AUTOMATION", "ADS", "DESIGN", "OTHER"];
  const monthlyExp = [320, 340, 350, 380, 400, 420];
  for (let m = 5; m >= 0; m--) {
    const monthDate = new Date(year, now.getMonth() - m, 10);
    let placed = 0;
    const target = monthlyExp[5 - m];
    while (placed < target) {
      const amt = 15 + Math.floor(Math.random() * 80);
      const actual = Math.min(amt, target - placed);
      placed += actual;
      await db.expense.create({
        data: {
          date: new Date(monthDate.getTime() + Math.floor(Math.random() * 20) * 86400000),
          category: expCategories[Math.floor(Math.random() * expCategories.length)],
          amount: actual,
          description: "Demo expense entry",
        },
      });
    }
  }

  // ---- Financial Goals ----
  const monthStart = new Date(year, now.getMonth(), 1);
  const monthEnd = new Date(year, now.getMonth() + 1, 0);
  const quarterStart = new Date(year, Math.floor(now.getMonth() / 3) * 3, 1);
  const quarterEnd = new Date(year, Math.floor(now.getMonth() / 3) * 3 + 3, 0);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  await db.financialGoal.create({
    data: {
      name: "Monthly Revenue Goal",
      type: "MONTHLY",
      category: "FINANCIAL",
      metric: "REVENUE",
      targetAmount: 3000,
      currentAmount: 1850,
      startDate: monthStart,
      deadline: monthEnd,
      status: "AT_RISK",
    },
  });
  await db.financialGoal.create({
    data: {
      name: "Quarterly Revenue Goal",
      type: "QUARTERLY",
      category: "FINANCIAL",
      metric: "REVENUE",
      targetAmount: 9000,
      currentAmount: 5430,
      startDate: quarterStart,
      deadline: quarterEnd,
      status: "ON_TRACK",
    },
  });
  await db.financialGoal.create({
    data: {
      name: "Yearly Revenue Goal",
      type: "YEARLY",
      category: "FINANCIAL",
      metric: "REVENUE",
      targetAmount: 50000,
      currentAmount: 13930,
      startDate: yearStart,
      deadline: yearEnd,
      status: "AT_RISK",
    },
  });
  await db.financialGoal.create({
    data: {
      name: "Monthly Traffic Goal",
      type: "MONTHLY",
      category: "TRAFFIC",
      metric: "TRAFFIC",
      targetAmount: 20000,
      currentAmount: 14500,
      startDate: monthStart,
      deadline: monthEnd,
      status: "ON_TRACK",
    },
  });
  await db.financialGoal.create({
    data: {
      name: "Monthly Pins Published",
      type: "MONTHLY",
      category: "PINTEREST",
      metric: "PINS",
      targetAmount: 300,
      currentAmount: 187,
      startDate: monthStart,
      deadline: monthEnd,
      status: "AT_RISK",
    },
  });

  // ---- Traffic Analytics (last 6 months, monthly aggregates) ----
  const trafficSources = ["PINTEREST", "GOOGLE", "FACEBOOK", "DIRECT", "OTHER"];
  for (let m = 5; m >= 0; m--) {
    const monthDate = new Date(year, now.getMonth() - m, 1);
    const growth = 1 + (5 - m) * 0.08;
    for (const source of trafficSources) {
      const baseSessions = source === "PINTEREST" ? 4200 : source === "GOOGLE" ? 2600 : source === "DIRECT" ? 900 : source === "FACEBOOK" ? 500 : 300;
      const sessions = Math.floor(baseSessions * growth * (0.85 + Math.random() * 0.3));
      await db.trafficAnalytics.create({
        data: {
          date: monthDate,
          source,
          sessions,
          users: Math.floor(sessions * 0.82),
          pageViews: Math.floor(sessions * 1.6),
          clicks: Math.floor(sessions * 0.12),
          conversions: Math.floor(sessions * 0.018),
          revenue: source === "PINTEREST" ? sessions * 0.18 : source === "GOOGLE" ? sessions * 0.09 : sessions * 0.05,
        },
      });
    }
  }

  // ---- Tasks ----
  const tasks = [
    { title: "Design 30 pins for Pinterest Account of the Day", priority: "P1", category: "PINTEREST", status: "IN_PROGRESS", dueDate: now },
    { title: "Finish crochet pattern PDF - Amigurumi Bunny", priority: "P0", category: "PRODUCT", status: "IN_PROGRESS", dueDate: now },
    { title: "Write SEO outline for blog article #13", priority: "P2", category: "BLOG", status: "TODO", dueDate: new Date(now.getTime() + 86400000) },
    { title: "Update Etsy listing for Boho Coaster Set", priority: "P2", category: "PRODUCT", status: "TODO", dueDate: new Date(now.getTime() + 2 * 86400000) },
    { title: "Review monthly expenses and cancel unused SaaS", priority: "P1", category: "FINANCE", status: "TODO", dueDate: new Date(now.getTime() - 86400000) },
    { title: "Schedule published pins for next 7 days", priority: "P1", category: "PINTEREST", status: "TODO", dueDate: now },
    { title: "Research new keyword cluster for Home Haven", priority: "P2", category: "BLOG", status: "TODO", dueDate: new Date(now.getTime() + 3 * 86400000) },
    { title: "Test new pin title strategy experiment", priority: "P2", category: "PINTEREST", status: "TODO", dueDate: new Date(now.getTime() + 4 * 86400000) },
  ];
  for (const t of tasks) {
    await db.task.create({ data: t });
  }

  // ---- Content Calendar (next 14 days) ----
  for (let d = 0; d < 14; d++) {
    const date = new Date(now.getTime() + d * 86400000);
    await db.contentCalendarEvent.create({ data: { title: `Pinterest batch - ${accounts[d % 10].name}`, type: "PIN", date, status: d === 0 ? "PLANNED" : "PLANNED" } });
    if (d % 2 === 0) {
      await db.contentCalendarEvent.create({ data: { title: `Blog article draft`, type: "ARTICLE", date, status: "PLANNED" } });
    }
    if (d % 5 === 0) {
      await db.contentCalendarEvent.create({ data: { title: `Product milestone review`, type: "PRODUCT", date, status: "PLANNED" } });
    }
  }

  // ---- Experiments ----
  await db.experiment.create({
    data: {
      hypothesis: "Text-overlay pins with bold titles get higher CTR than image-only pins",
      channel: "PINTEREST",
      change: "Added bold text overlay to 20 pins",
      expectedResult: "CTR increase from 1.2% to 1.8%",
      startDate: new Date(now.getTime() - 14 * 86400000),
      endDate: new Date(now.getTime() - 1 * 86400000),
      metric: "CTR",
      result: "CTR increased to 1.6%",
      decision: "SCALE",
      status: "COMPLETED",
    },
  });
  await db.experiment.create({
    data: {
      hypothesis: "Listing crochet patterns at $4.99 instead of $6.99 increases conversion enough to net more revenue",
      channel: "PRODUCT",
      change: "Lowered price on 3 patterns",
      expectedResult: "Conversion rate doubles, net revenue +20%",
      startDate: new Date(now.getTime() - 7 * 86400000),
      endDate: null,
      metric: "Revenue",
      result: null,
      decision: null,
      status: "RUNNING",
    },
  });

  // ---- Weekly Review (this week) ----
  const weekStart = new Date(now.getTime() - 6 * 86400000);
  await db.weeklyReview.create({
    data: {
      weekStart,
      weekEnd: now,
      revenue: 720,
      profit: 590,
      traffic: 3800,
      pinsPublished: 48,
      articlesPublished: 6,
      productsLaunched: 0,
      whatWorked: "Text-overlay pins, seasonal crochet content",
      whatDidNotWork: "Facebook organic posts",
      scaleWhat: "Text-overlay pins across all accounts",
      reduceWhat: "Facebook posting frequency",
      stopWhat: "Low-quality stock image pins",
      testWhat: "Carousel pins for product showcases",
    },
  });

  // ---- Monthly Review (last month) ----
  await db.monthlyReview.create({
    data: {
      month: now.getMonth() === 0 ? 11 : now.getMonth() - 1,
      year: now.getMonth() === 0 ? year - 1 : year,
      revenue: 2650,
      expenses: 400,
      profit: 2250,
      traffic: 14200,
      pinsPublished: 210,
      articlesPublished: 28,
      productsLaunched: 2,
      topChannel: "PINTEREST",
      topProduct: "Easy Granny Square Pattern",
      topContent: "10 Free Crochet Patterns for Beginners",
      weakestArea: "Facebook organic reach",
      nextMonthStrategy: "Scale text-overlay pins, launch 2 new crochet patterns, reduce Facebook effort, test carousel pins.",
    },
  });

  // ---- Yearly Goals ----
  await db.yearlyGoal.create({
    data: {
      year,
      revenueTarget: 50000,
      profitTarget: 40000,
      trafficTarget: 250000,
      productsTarget: 24,
      articlesTarget: 300,
      pinsTarget: 3600,
      notes: "Year of scaling Pinterest + crochet patterns",
    },
  });

  // ---- Growth Score Config ----
  await db.growthScoreConfig.create({
    data: {
      revenueGrowthWeight: 25,
      trafficGrowthWeight: 20,
      contentProductionWeight: 15,
      pinterestGrowthWeight: 15,
      productGrowthWeight: 15,
      profitabilityWeight: 10,
    },
  });

  console.log("Demo data seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
