import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const acc = store.accounts.find((a) => a.id === id);
  if (!acc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (acc.doneThisCycle) return NextResponse.json({ error: "Account already done" }, { status: 400 });

  for (const a of store.accounts) a.selected = false;
  acc.selected = true;
  return NextResponse.json(acc);
}
