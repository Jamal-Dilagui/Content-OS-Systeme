import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE — remove a traffic entry
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await db.trafficAnalytics.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Traffic entry not found" }, { status: 404 });
  }
  await db.trafficAnalytics.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
