import { NextResponse } from "next/server";
import { getStore, genId } from "@/lib/store";

export async function GET() {
  const store = getStore();
  return NextResponse.json({ objectives: store.objectives });
}

export async function POST(req: Request) {
  const body = await req.json();
  const store = getStore();
  const obj = {
    id: genId("obj"),
    title: body.title,
    target: body.target ?? 100,
    current: body.current ?? 0,
    unit: body.unit ?? "",
    deadline: body.deadline ?? null,
    category: body.category ?? "Pinterest",
    achieved: false,
    achievedAt: null,
  };
  store.objectives.push(obj);
  return NextResponse.json(obj);
}
