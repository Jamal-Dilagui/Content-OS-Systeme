import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH — update a pin (status, content, scheduling, performance metrics).
// When status moves to PUBLISHED and publishedDate isn't supplied, auto-stamp it.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const {
    status,
    title,
    description,
    boardId,
    url,
    imageUrl,
    hook,
    mainText,
    cta,
    keywords,
    contentType,
    scheduledDate,
    publishedDate,
    impressions,
    saves,
    outboundClicks,
    engagement,
  } = body;

  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (boardId !== undefined) data.boardId = boardId || null;
  if (url !== undefined) data.url = url;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (hook !== undefined) data.hook = hook;
  if (mainText !== undefined) data.mainText = mainText;
  if (cta !== undefined) data.cta = cta;
  if (keywords !== undefined) data.keywords = keywords;
  if (contentType !== undefined) data.contentType = contentType;
  if (scheduledDate !== undefined)
    data.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
  if (publishedDate !== undefined)
    data.publishedDate = publishedDate ? new Date(publishedDate) : null;
  if (impressions !== undefined) data.impressions = impressions;
  if (saves !== undefined) data.saves = saves;
  if (outboundClicks !== undefined) data.outboundClicks = outboundClicks;
  if (engagement !== undefined) data.engagement = engagement;

  // Auto-stamp publishedDate when transitioning to PUBLISHED
  if (status === "PUBLISHED" && publishedDate === undefined) {
    data.publishedDate = new Date();
  }

  const updated = await db.pinterestPin.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE — remove a pin
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.pinterestPin.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
