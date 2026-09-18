import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {};
    if (from) (where.date as { gte?: Date }).gte = new Date(from);
    if (to) (where.date as { lte?: Date }).lte = new Date(to);
  }
  const events = await db.contentCalendarEvent.findMany({
    where,
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const body = await req.json();
  const event = await db.contentCalendarEvent.create({
    data: {
      title: body.title,
      type: body.type ?? "PIN",
      date: new Date(body.date),
      status: body.status ?? "PLANNED",
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(event);
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.contentCalendarEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
