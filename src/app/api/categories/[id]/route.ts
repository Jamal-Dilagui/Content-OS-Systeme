import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const store = getStore();
  const cat = store.categories.find((c) => c.id === id);
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.name !== undefined) cat.name = body.name;
  if (body.dailyTarget !== undefined) cat.dailyTarget = body.dailyTarget;
  if (body.color !== undefined) cat.color = body.color;
  if (body.icon !== undefined) cat.icon = body.icon;
  return NextResponse.json(cat);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const idx = store.categories.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  store.categories.splice(idx, 1);
  // Also remove tasks of this category
  store.tasks = store.tasks.filter((t) => t.categoryId !== id);
  return NextResponse.json({ ok: true });
}
