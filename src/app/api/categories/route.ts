import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const categories = await db.category.findMany({ orderBy: { orderIndex: "asc" }, include: { tasks: true } });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const body = await req.json();
  const count = await db.category.count();
  const cat = await db.category.create({
    data: {
      name: body.name,
      dailyTarget: body.dailyTarget ?? 5,
      color: body.color ?? "violet",
      icon: body.icon ?? "FileText",
      orderIndex: count,
    },
  });
  return NextResponse.json(cat);
}
