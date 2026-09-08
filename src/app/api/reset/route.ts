import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

// Reset = WIPE everything to blank slate (true fresh start)
export async function POST() {
  const store = getStore();
  for (const a of store.accounts) {
    a.pinsCompleted = 0;
    a.doneThisCycle = false;
    a.selected = false;
    a.cycle = 1;
    a.lastWorkedDate = null;
  }
  if (store.accounts.length > 0) store.accounts[0].selected = true;
  store.categories = [];
  store.tasks = [];
  store.objectives = [];
  store.logs = [];
  store.streak.currentStreak = 0;
  store.streak.longestStreak = 0;
  store.streak.lastActiveDate = null;
  store.streak.totalDays = 0;
  store.streak.rewards = 0;
  return NextResponse.json({ ok: true });
}
