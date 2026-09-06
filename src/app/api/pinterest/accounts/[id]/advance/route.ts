import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST — mark this account as "worked today" and advance the rotation to the next account.
//
// Logic:
//  - lastWorkedDate = now
//  - reset pinsCompleted to 0 (fresh batch)
//  - bump currentCycle by 1
//  - move this account to the back of the queue (orderIndex = max + 1)
//  - set nextWorkDate = now + (activeCount) days so it gets worked again after every other active account
//  - the next ACTIVE account by orderIndex becomes the new "Account of the Day"
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const now = new Date();

  const account = await db.pinterestAccount.findUnique({ where: { id } });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const allAccounts = await db.pinterestAccount.findMany({
    orderBy: { orderIndex: "asc" },
  });

  const maxOrder = allAccounts.reduce((m, a) => Math.max(m, a.orderIndex), -1);
  const activeCount = allAccounts.filter((a) => a.status === "ACTIVE").length;
  // Work every active account in turn — roughly one cycle per day per account.
  const nextWorkDate = new Date(
    now.getTime() + Math.max(1, activeCount) * 24 * 60 * 60 * 1000
  );

  await db.pinterestAccount.update({
    where: { id },
    data: {
      lastWorkedDate: now,
      pinsCompleted: 0,
      currentCycle: { increment: 1 },
      orderIndex: maxOrder + 1,
      nextWorkDate,
    },
  });

  // The new account of the day = first ACTIVE by orderIndex (skipping the one we just moved).
  const refreshed = await db.pinterestAccount.findMany({
    orderBy: { orderIndex: "asc" },
  });
  const newAccountOfDay =
    refreshed.find((a) => a.status === "ACTIVE" && a.id !== id) ??
    refreshed.find((a) => a.status === "ACTIVE") ??
    null;

  return NextResponse.json({
    success: true,
    advancedAccount: { id, name: account.name },
    newAccountOfDay: newAccountOfDay
      ? { id: newAccountOfDay.id, name: newAccountOfDay.name }
      : null,
  });
}
