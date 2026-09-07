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
  const accountNames = [
    "Bébé Crochet Doux",
    "Bébé crochet magic",
    "Doudou crochet",
    "Panda au crochet tuto",
    "Accessoires au crochet",
    "Accessoires au crochet facile",
    "Bébé Crochet Doux 2",
    "Chaussons bébé au crochet",
    "Sac crochet facile débutant",
    "Sax au crochet tuto",
  ];
  const accounts: PinterestAccount[] = accountNames.map((name, i) => ({
    id: `acc-${i}`,
    name,
    pinsPerBatch: 30,
    pinsCompleted: 0,
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
    { id: "t1", categoryId: "cat-blog", title: "Écrire article: 10 points faciles au crochet", done: false, completedAt: null },
    { id: "t2", categoryId: "cat-blog", title: "SEO optimiser article: Guide granny square", done: false, completedAt: null },
    { id: "t3", categoryId: "cat-blog", title: "Écrire article: Astuces débutant crochet", done: false, completedAt: null },
    { id: "t4", categoryId: "cat-blog", title: "Ajouter liens internes: modèles d'hiver", done: false, completedAt: null },
    { id: "t5", categoryId: "cat-blog", title: "Écrire article: Meilleur fil pour amigurumi", done: false, completedAt: null },
    { id: "t6", categoryId: "cat-patterns", title: "Créer modèle: Set de sous-plats bohème", done: false, completedAt: null },
    { id: "t7", categoryId: "cat-patterns", title: "Créer PDF: Lapin amigurumi", done: false, completedAt: null },
    { id: "t8", categoryId: "cat-patterns", title: "Photo shoot: Modèle granny square", done: false, completedAt: null },
  ];

  const logs: DailyLog[] = [];
  // Generate 30 days of history (today fresh, past days with varied data for chart)
  for (let d = 29; d >= 0; d--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
    const dayISO = day.toISOString();
    const isToday = d === 0;
    // Past days: realistic varied data (some 100%, some partial, weekends lower)
    const dayOfWeek = day.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const variation = isToday ? 0 : isWeekend ? (0.6 + Math.random() * 0.3) : (0.8 + Math.random() * 0.2);
    const pins = isToday ? 0 : Math.round(30 * variation);
    const blogTasks = isToday ? 0 : Math.round(5 * variation);
    const patTasks = isToday ? 0 : Math.round(3 * variation);
    logs.push({ id: `log-pin-${d}`, date: dayISO, categoryId: null, pinsCompleted: pins, tasksCompleted: 0 });
    logs.push({ id: `log-blog-${d}`, date: dayISO, categoryId: "cat-blog", pinsCompleted: 0, tasksCompleted: blogTasks });
    logs.push({ id: `log-pat-${d}`, date: dayISO, categoryId: "cat-patterns", pinsCompleted: 0, tasksCompleted: patTasks });
  }

  return {
    accounts,
    categories,
    tasks,
    logs,
    streak: { id: "streak-1", currentStreak: 0, longestStreak: 0, lastActiveDate: null, totalDays: 0, rewards: 0 },
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
