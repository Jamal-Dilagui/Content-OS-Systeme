import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.description !== undefined) patch.description = body.description;
  if (body.priority !== undefined) patch.priority = body.priority;
  if (body.category !== undefined) patch.category = body.category;
  if (body.status !== undefined) patch.status = body.status;
  if (body.dueDate !== undefined) patch.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  const task = await db.task.update({ where: { id }, data: patch });
  return NextResponse.json(task);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
