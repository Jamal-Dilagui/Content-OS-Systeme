import { NextResponse } from "next/server";
import { getStore, genId } from "@/lib/store";

export async function GET() {
  const store = getStore();
  return NextResponse.json({ categories: store.categories });
}

export async function POST(req: Request) {
  const body = await req.json();
  const store = getStore();
  const cat = {
    id: genId("cat"),
    name: body.name,
    dailyTarget: body.dailyTarget ?? 5,
    color: body.color ?? "violet",
    icon: body.icon ?? "FileText",
    orderIndex: store.categories.length,
  };
  store.categories.push(cat);
  return NextResponse.json(cat);
}
