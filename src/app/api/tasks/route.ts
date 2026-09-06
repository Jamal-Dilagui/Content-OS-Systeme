import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const task = await db.task.create({
    data: { title: body.title, categoryId: body.categoryId },
  });
  return NextResponse.json(task);
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
