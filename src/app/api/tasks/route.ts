import { NextResponse } from "next/server";
import { getStore, genId } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json();
  const store = getStore();
  const task = {
    id: genId("task"),
    categoryId: body.categoryId,
    title: body.title,
    done: false,
    completedAt: null,
  };
  store.tasks.push(task);
  return NextResponse.json(task);
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const store = getStore();
  const idx = store.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  store.tasks.splice(idx, 1);
  return NextResponse.json({ ok: true });
}
