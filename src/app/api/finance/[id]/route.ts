import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE — remove a revenue OR expense entry.
// Query: ?type=revenue|expense
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  if (type !== "revenue" && type !== "expense") {
    return NextResponse.json(
      { error: "type query param must be 'revenue' or 'expense'" },
      { status: 400 }
    );
  }

  if (type === "revenue") {
    try {
      await db.revenue.delete({ where: { id } });
    } catch {
      return NextResponse.json({ error: "Revenue entry not found" }, { status: 404 });
    }
  } else {
    try {
      await db.expense.delete({ where: { id } });
    } catch {
      return NextResponse.json({ error: "Expense entry not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ success: true });
}
