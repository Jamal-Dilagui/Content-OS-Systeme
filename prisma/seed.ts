// Seed — simple data for the single-page Content OS
import { db } from "../src/lib/db";

async function main() {
  console.log("Seeding...");

  // 10 Pinterest accounts
  const names = [
    "Crochet Daily Pins", "Cozy Crochet Co", "Home Decor Inspo", "Organize With Me",
    "Planner Paradise", "Craft Corner Pins", "Yarn & Hooks", "Modern Home Pins",
    "Printable Studio", "Creative Crafts HQ",
  ];
  for (let i = 0; i < 10; i++) {
    await db.pinterestAccount.create({
      data: {
        name: names[i],
        pinsPerBatch: 30,
        pinsCompleted: i === 0 ? 12 : 0, // first account in progress today
        doneThisCycle: false,
        cycle: 1,
        orderIndex: i,
      },
    });
  }

  // Default categories
  const blog = await db.category.create({
    data: { name: "Blog", dailyTarget: 5, color: "sky", icon: "FileText", orderIndex: 0 },
  });
  const patterns = await db.category.create({
    data: { name: "Patterns", dailyTarget: 3, color: "violet", icon: "Package", orderIndex: 1 },
  });

  // Sample tasks (today's, some done some not)
  const tasks = [
    { categoryId: blog.id, title: "Write article: 10 Easy Crochet Stitches", done: true },
    { categoryId: blog.id, title: "SEO optimize article: Granny Square Guide", done: true },
    { categoryId: blog.id, title: "Write article: Beginner Crochet Tips", done: true },
    { categoryId: blog.id, title: "Add internal links to winter patterns post", done: false },
    { categoryId: blog.id, title: "Write article: Best Yarn for Amigurumi", done: false },
    { categoryId: patterns.id, title: "Design new pattern: Boho Coaster Set", done: true },
    { categoryId: patterns.id, title: "Create PDF for Amigurumi Bunny", done: true },
    { categoryId: patterns.id, title: "Photo shoot: Granny Square Pattern", done: false },
  ];
  for (const t of tasks) {
    await db.task.create({
      data: { ...t, completedAt: t.done ? new Date() : null },
    });
  }

  // Streak
  await db.streak.create({
    data: { currentStreak: 4, longestStreak: 7, lastActiveDate: new Date(), totalDays: 12, rewards: 3 },
  });

  // Daily logs for last 7 days (for the chart history)
  const now = new Date();
  for (let d = 6; d >= 0; d--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
    // Pinterest pins that day
    await db.dailyLog.create({
      data: { date: day, categoryId: null, pinsCompleted: d === 0 ? 12 : 30, tasksCompleted: 0 },
    });
    // Blog tasks
    await db.dailyLog.create({
      data: { date: day, categoryId: blog.id, pinsCompleted: 0, tasksCompleted: d === 0 ? 3 : 5 },
    });
    // Pattern tasks
    await db.dailyLog.create({
      data: { date: day, categoryId: patterns.id, pinsCompleted: 0, tasksCompleted: d === 0 ? 2 : 3 },
    });
  }

  console.log("Seeded 10 Pinterest accounts, 2 categories, 8 tasks, streak, 7 days of logs.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
