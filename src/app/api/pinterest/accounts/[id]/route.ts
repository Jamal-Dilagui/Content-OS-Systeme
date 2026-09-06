import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.pinsPerBatch !== undefined) patch.pinsPerBatch = body.pinsPerBatch;
  const account = await db.pinterestAccount.update({ where: { id }, data: patch });
  return NextResponse.json(account);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.pinterestAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
