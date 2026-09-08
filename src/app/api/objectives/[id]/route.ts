import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const store = getStore();
  const obj = store.objectives.find((o) => o.id === id);
  if (!obj) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.title !== undefined) obj.title = body.title;
  if (body.target !== undefined) obj.target = body.target;
  if (body.current !== undefined) {
    obj.current = body.current;
    // Auto-mark achieved
    if (obj.current >= obj.target && !obj.achieved) {
      obj.achieved = true;
      obj.achievedAt = new Date().toISOString();
    } else if (obj.current < obj.target && obj.achieved) {
      obj.achieved = false;
      obj.achievedAt = null;
    }
  }
  if (body.unit !== undefined) obj.unit = body.unit;
  if (body.deadline !== undefined) obj.deadline = body.deadline;
  if (body.category !== undefined) obj.category = body.category;
  return NextResponse.json(obj);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const idx = store.objectives.findIndex((o) => o.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  store.objectives.splice(idx, 1);
  return NextResponse.json({ ok: true });
}
