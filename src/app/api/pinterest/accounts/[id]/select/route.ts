import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Select an account to work on (only if not done this cycle)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await db.pinterestAccount.findUnique({ where: { id } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (account.doneThisCycle) return NextResponse.json({ error: "Account already done this cycle — can't select" }, { status: 400 });

  // Unselect all, then select this one
  await db.pinterestAccount.updateMany({ where: { selected: true }, data: { selected: false } });
  const updated = await db.pinterestAccount.update({ where: { id }, data: { selected: true } });
  return NextResponse.json(updated);
}
