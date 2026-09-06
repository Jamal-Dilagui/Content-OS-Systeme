// In-memory data store — no database needed, works on Vercel serverless
// Data persists per-instance (resets on cold start) but the frontend
// also persists to localStorage so the user never loses their session.

export type PinterestAccount = {
  id: string;
  name: string;
  pinsPerBatch: number;
  pinsCompleted: number;
  doneThisCycle: boolean;
  selected: boolean;
  cycle: number;
  lastWorkedDate: string | null;
  orderIndex: number;
};

export type Task = {
  id: string;
  categoryId: string;
  title: string;
  done: boolean;
  completedAt: string | null;
};

export type Category = {
  id: string;
  name: string;
  dailyTarget: number;
  color: string;
  icon: string;
  orderIndex: number;
};

export type DailyLog = {
  id: string;
  date: string; // ISO date (midnight)
  categoryId: string | null;
  pinsCompleted: number;
  tasksCompleted: number;
};

export type Streak = {
  id: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  totalDays: number;
  rewards: number;
};

type Store = {
  accounts: PinterestAccount[];
  categories: Category[];
  tasks: Task[];
  logs: DailyLog[];
  streak: Streak;
  initialized: boolean;
};

// Use global to persist across hot reloads in dev
const globalStore = globalThis as unknown as { __contentOSStore?: Store };

function seed(): Store {
  const now = new Date();
  const accounts: PinterestAccount[] = [
    "Crochet Daily Pins", "Cozy Crochet Co", "Home Decor Inspo", "Organize With Me",
    "Planner Paradise", "Craft Corner Pins", "Yarn & Hooks", "Modern Home Pins",
    "Printable Studio", "Creative Crafts HQ",
  ].map((name, i) => ({
    id: `acc-${i}`,
    name,
    pinsPerBatch: 30,
    pinsCompleted: i === 0 ? 12 : 0,
    doneThisCycle: false,
    selected: i === 0,
    cycle: 1,
    lastWorkedDate: null,
    orderIndex: i,
  }));

  const categories: Category[] = [
    { id: "cat-blog", name: "Blog", dailyTarget: 5, color: "sky", icon: "FileText", orderIndex: 0 },
    { id: "cat-patterns", name: "Patterns", dailyTarget: 3, color: "violet", icon: "Package", orderIndex: 1 },
  ];

  const tasks: Task[] = [
    { id: "t1", categoryId: "cat-blog", title: "Write article: 10 Easy Crochet Stitches", done: true, completedAt: now.toISOString() },
    { id: "t2", categoryId: "cat-blog", title: "SEO optimize article: Granny Square Guide", done: true, completedAt: now.toISOString() },
    { id: "t3", categoryId: "cat-blog", title: "Write article: Beginner Crochet Tips", done: true, completedAt: now.toISOString() },
    { id: "t4", categoryId: "cat-blog", title: "Add internal links to winter patterns post", done: false, completedAt: null },
    { id: "t5", categoryId: "cat-blog", title: "Write article: Best Yarn for Amigurumi", done: false, completedAt: null },
    { id: "t6", categoryId: "cat-patterns", title: "Design new pattern: Boho Coaster Set", done: true, completedAt: now.toISOString() },
    { id: "t7", categoryId: "cat-patterns", title: "Create PDF for Amigurumi Bunny", done: true, completedAt: now.toISOString() },
    { id: "t8", categoryId: "cat-patterns", title: "Photo shoot: Granny Square Pattern", done: false, completedAt: null },
  ];

  const logs: DailyLog[] = [];
  for (let d = 6; d >= 0; d--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
    const dayISO = day.toISOString();
    logs.push({ id: `log-pin-${d}`, date: dayISO, categoryId: null, pinsCompleted: d === 0 ? 12 : 30, tasksCompleted: 0 });
    logs.push({ id: `log-blog-${d}`, date: dayISO, categoryId: "cat-blog", pinsCompleted: 0, tasksCompleted: d === 0 ? 3 : 5 });
    logs.push({ id: `log-pat-${d}`, date: dayISO, categoryId: "cat-patterns", pinsCompleted: 0, tasksCompleted: d === 0 ? 2 : 3 });
  }

  return {
    accounts,
    categories,
    tasks,
    logs,
    streak: { id: "streak-1", currentStreak: 4, longestStreak: 7, lastActiveDate: now.toISOString(), totalDays: 12, rewards: 3 },
    initialized: true,
  };
}

export function getStore(): Store {
  if (!globalStore.__contentOSStore) {
    globalStore.__contentOSStore = seed();
  }
  return globalStore.__contentOSStore;
}

export function genId(prefix = "id"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
