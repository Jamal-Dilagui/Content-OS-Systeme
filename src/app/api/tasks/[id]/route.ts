import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const store = getStore();
  const task = store.tasks.find((t) => t.id === id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.title !== undefined) task.title = body.title;
  return NextResponse.json(task);
}
