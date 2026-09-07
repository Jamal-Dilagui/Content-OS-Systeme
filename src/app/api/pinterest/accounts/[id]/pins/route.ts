import { NextResponse } from "next/server";
import { getStore, startOfDay } from "@/lib/store";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const store = getStore();
  const acc = store.accounts.find((a) => a.id === id);
  if (!acc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const delta = typeof body.delta === "number" ? body.delta : 1;
  acc.pinsCompleted = Math.max(0, Math.min(acc.pinsPerBatch, acc.pinsCompleted + delta));

  // Update today's log
  const now = new Date();
  const today = startOfDay(now).toISOString();
  const existing = store.logs.find((l) => l.date === today && l.categoryId === null);
  if (existing) existing.pinsCompleted = acc.pinsCompleted;
  else store.logs.push({ id: `log-${Date.now()}`, date: today, categoryId: null, pinsCompleted: acc.pinsCompleted, tasksCompleted: 0 });

  return NextResponse.json({ pinsCompleted: acc.pinsCompleted });
}
