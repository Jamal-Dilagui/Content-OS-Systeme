import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

// Reset = WIPE everything to blank slate (true fresh start)
// - Keeps Pinterest account NAMES (user's accounts) but resets their progress
// - Clears ALL categories and tasks (does NOT restore defaults)
// - Clears all history logs and streak
export async function POST() {
  const store = getStore();
  // Reset accounts: keep names, wipe progress
  for (const a of store.accounts) {
    a.pinsCompleted = 0;
    a.doneThisCycle = false;
    a.selected = false;
    a.cycle = 1;
    a.lastWorkedDate = null;
  }
  // Select first account if any
  if (store.accounts.length > 0) {
    store.accounts[0].selected = true;
  }
  // Clear categories, tasks, logs
  store.categories = [];
  store.tasks = [];
  store.logs = [];
  // Reset streak
  store.streak.currentStreak = 0;
  store.streak.longestStreak = 0;
  store.streak.lastActiveDate = null;
  store.streak.totalDays = 0;
  store.streak.rewards = 0;
  return NextResponse.json({ ok: true });
}

