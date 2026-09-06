import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.dailyTarget !== undefined) patch.dailyTarget = body.dailyTarget;
  if (body.color !== undefined) patch.color = body.color;
  if (body.icon !== undefined) patch.icon = body.icon;
  const cat = await db.category.update({ where: { id }, data: patch });
  return NextResponse.json(cat);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
