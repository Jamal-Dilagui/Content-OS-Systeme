import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const store = getStore();
  const acc = store.accounts.find((a) => a.id === id);
  if (!acc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.name !== undefined) acc.name = body.name;
  if (body.pinsPerBatch !== undefined) acc.pinsPerBatch = body.pinsPerBatch;
  return NextResponse.json(acc);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const idx = store.accounts.findIndex((a) => a.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  store.accounts.splice(idx, 1);
  return NextResponse.json({ ok: true });
}
