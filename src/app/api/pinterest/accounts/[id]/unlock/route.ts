import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

// Unlock an account that was marked done — bring it back to available
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const acc = store.accounts.find((a) => a.id === id);
  if (!acc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  acc.doneThisCycle = false;
  acc.selected = false;
  acc.pinsCompleted = 0;
  return NextResponse.json({ ok: true });
}
