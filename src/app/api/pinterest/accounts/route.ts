import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const accounts = await db.pinterestAccount.findMany({ orderBy: { orderIndex: "asc" } });
  return NextResponse.json({ accounts });
}

export async function POST(req: Request) {
  const body = await req.json();
  const count = await db.pinterestAccount.count();
  const account = await db.pinterestAccount.create({
    data: {
      name: body.name,
      pinsPerBatch: body.pinsPerBatch ?? 30,
      orderIndex: count,
    },
  });
  return NextResponse.json(account);
}
