import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Toggle a task between TODO/IN_PROGRESS <-> DONE
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await db.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const next = task.status === "DONE" ? "TODO" : "DONE";
  const updated = await db.task.update({ where: { id }, data: { status: next } });
  return NextResponse.json(updated);
}
