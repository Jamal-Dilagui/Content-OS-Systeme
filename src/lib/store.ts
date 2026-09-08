// In-memory data store — no database needed, works on Vercel serverless
// Data persists per-instance; frontend also persists to localStorage.

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

export type Objective = {
  id: string;
  title: string;
  target: number;       // e.g. 100 pins, 30 articles
  current: number;      // current progress
  unit: string;         // "pins", "articles", "€", etc.
  deadline: string | null; // ISO date
  category: string;     // e.g. "Pinterest", "Blog", "Money" (for color)
  achieved: boolean;    // auto-set when current >= target
  achievedAt: string | null;
};

export type DailyLog = {
  id: string;
  date: string;
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
  objectives: Objective[];
  logs: DailyLog[];
  streak: Streak;
  initialized: boolean;
};

const globalStore = globalThis as unknown as { __contentOSStore?: Store };

function seed(): Store {
  const now = new Date();
  // Pinterest accounts — kept (user's accounts)
  const accounts: PinterestAccount[] = [
    "Bébé Crochet Doux",
    "Bébé crochet magic",
    "Doudou crochet",
    "Panda au crochet tuto",
    "Accessoires au crochet",
    "Accessoires au crochet facile",
    "Chaussons bébé au crochet",
    "Sac crochet facile débutant",
    "Sax au crochet tuto",
    "Creative Crafts HQ",
  ].map((name, i) => ({
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

  // NO default categories — user adds their own (Pinterest, Blog, Money, Gym, etc.)
  const categories: Category[] = [];
  const tasks: Task[] = [];
  const objectives: Objective[] = [];

  // 30 days of empty history (all 0)
  const logs: DailyLog[] = [];

  return {
    accounts,
    categories,
    tasks,
    objectives,
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
