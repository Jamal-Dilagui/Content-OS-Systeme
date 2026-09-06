import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (priority && priority !== "all") where.priority = priority;

  const tasks = await db.task.findMany({
    where,
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
  });
  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const body = await req.json();
  const task = await db.task.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      priority: body.priority ?? "P2",
      category: body.category ?? null,
      status: "TODO",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });
  return NextResponse.json(task);
}
