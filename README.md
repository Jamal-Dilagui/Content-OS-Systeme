# Content OS Systeme

A simple, single-page **Daily Process Tracker** for solo content creators — built for Pinterest rotation, blog tasks, PDF pattern creation, and custom categories.

## Features

- **Pinterest Account Rotation** — Pick any available account to work on, mark done when finished. Done accounts lock until the full cycle completes, then auto-reset.
- **Daily Categories** — Blog, Patterns, + your own custom categories. Each has a daily target and checkable tasks.
- **Live Progress Chart** — 7-day area chart that updates in real-time as you complete tasks and pins.
- **Reminders & Rewards** — Stay motivated with streaks, perfect-day badges, and contextual reminders.
- **localStorage Persistence** — Your data survives page refreshes instantly.
- **Optimistic Updates** — Every action feels instant, no loading flashes.
- **Dark Theme** — Easy on the eyes, built for focus.

## Tech Stack

- **Next.js 16** (App Router, webpack)
- **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui**
- **Prisma ORM** + **SQLite**
- **TanStack Query** (optimistic updates)
- **Recharts** (live area chart)
- **Zustand** (state management)

## Getting Started

```bash
# Install dependencies
bun install

# Set up the database
bun run db:push
bun prisma/seed.ts

# Start the dev server
bun run dev
```

Open `http://localhost:3000` in your browser.

## Project Structure

```
prisma/
  schema.prisma    # Database schema (PinterestAccount, Category, Task, Streak, DailyLog)
  seed.ts          # Demo data
src/
  app/
    api/           # API routes (today, pinterest, categories, tasks)
    page.tsx       # Single-page UI
    layout.tsx     # Dark theme root layout
  lib/
    db.ts          # Prisma client
```

## Usage

1. **Pinterest**: Click "Manage" to add/edit/delete accounts. Click an available account chip to switch. Use +/− to track pins, then "Mark Done" to lock it.
2. **Categories**: Toggle tasks with the circle buttons. Add tasks with "Add task". Create new categories with "Add Category".
3. **Chart**: Watch the 7-day progress chart update live as you work.
4. **Rewards**: Build streaks and unlock badges by hitting your daily targets.

## License

MIT — Built for solo content creators. Stay consistent, ship every day.
