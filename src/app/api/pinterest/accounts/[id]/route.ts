import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH — update an account (status, priority, orderIndex, pinsPerBatch, etc.)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const {
    status,
    priority,
    orderIndex,
    pinsPerBatch,
    name,
    nicheId,
    websiteId,
    targetAudience,
    pinsCompleted,
    pinsPublished,
    currentCycle,
    trafficGenerated,
    revenueGenerated,
    lastWorkedDate,
    nextWorkDate,
  } = body;

  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (priority !== undefined) data.priority = priority;
  if (orderIndex !== undefined) data.orderIndex = orderIndex;
  if (pinsPerBatch !== undefined) data.pinsPerBatch = pinsPerBatch;
  if (name !== undefined) data.name = name;
  if (nicheId !== undefined) data.nicheId = nicheId || null;
  if (websiteId !== undefined) data.websiteId = websiteId || null;
  if (targetAudience !== undefined) data.targetAudience = targetAudience;
  if (pinsCompleted !== undefined) data.pinsCompleted = pinsCompleted;
  if (pinsPublished !== undefined) data.pinsPublished = pinsPublished;
  if (currentCycle !== undefined) data.currentCycle = currentCycle;
  if (trafficGenerated !== undefined) data.trafficGenerated = trafficGenerated;
  if (revenueGenerated !== undefined) data.revenueGenerated = revenueGenerated;
  if (lastWorkedDate !== undefined)
    data.lastWorkedDate = lastWorkedDate ? new Date(lastWorkedDate) : null;
  if (nextWorkDate !== undefined)
    data.nextWorkDate = nextWorkDate ? new Date(nextWorkDate) : null;

  const updated = await db.pinterestAccount.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE — remove an account (cascades to boards + pins)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.pinterestAccount.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
