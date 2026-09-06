import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH + DELETE for both FacebookPage and FacebookPost.
// Use ?type=page or ?type=post query param to select the target.

// PATCH — update a page or post.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  const body = await req.json();

  if (type === "page") {
    const { name, nicheId, websiteId, status, followers } = body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (nicheId !== undefined) {
      if (nicheId) {
        const n = await db.niche.findUnique({ where: { id: nicheId } });
        if (!n) return NextResponse.json({ error: "Niche not found" }, { status: 404 });
      }
      data.nicheId = nicheId || null;
    }
    if (websiteId !== undefined) {
      if (websiteId) {
        const w = await db.website.findUnique({ where: { id: websiteId } });
        if (!w) return NextResponse.json({ error: "Website not found" }, { status: 404 });
      }
      data.websiteId = websiteId || null;
    }
    if (status !== undefined) data.status = status;
    if (followers !== undefined) data.followers = Number(followers) || 0;

    const updated = await db.facebookPage.update({
      where: { id },
      data,
      include: {
        website: { select: { id: true, name: true, url: true } },
        posts: true,
      },
    });
    // Look up niche name separately (FacebookPage has no Prisma relation to Niche)
    let nicheName: string | null = null;
    if (updated.nicheId) {
      const n = await db.niche.findUnique({ where: { id: updated.nicheId }, select: { name: true } });
      nicheName = n?.name ?? null;
    }
    return NextResponse.json({
      kind: "page",
      id: updated.id,
      name: updated.name,
      nicheId: updated.nicheId,
      nicheName,
      websiteId: updated.websiteId,
      websiteName: updated.website?.name ?? null,
      websiteUrl: updated.website?.url ?? null,
      status: updated.status,
      followers: updated.followers,
      postCount: updated.posts.length,
      createdAt: updated.createdAt,
    });
  }

  if (type === "post") {
    const {
      caption,
      cta,
      url,
      imageUrl,
      status,
      scheduledDate,
      publishedDate,
      impressions,
      clicks,
      engagement,
    } = body;
    const data: Record<string, unknown> = {};
    if (caption !== undefined) data.caption = caption || null;
    if (cta !== undefined) data.cta = cta || null;
    if (url !== undefined) data.url = url || null;
    if (imageUrl !== undefined) data.imageUrl = imageUrl || null;
    if (status !== undefined) data.status = status;
    if (scheduledDate !== undefined) {
      data.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    }
    if (publishedDate !== undefined) {
      data.publishedDate = publishedDate ? new Date(publishedDate) : null;
    }
    if (impressions !== undefined) data.impressions = Number(impressions) || 0;
    if (clicks !== undefined) data.clicks = Number(clicks) || 0;
    if (engagement !== undefined) data.engagement = Number(engagement) || 0;

    // Auto-stamp publishedDate when status moves to PUBLISHED
    if (status === "PUBLISHED" && publishedDate === undefined) {
      data.publishedDate = new Date();
    }

    const updated = await db.facebookPost.update({ where: { id }, data });
    return NextResponse.json({ kind: "post", ...updated });
  }

  return NextResponse.json(
    { error: "?type=page or ?type=post is required" },
    { status: 400 }
  );
}

// DELETE — remove a page (cascade deletes posts) or a single post.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  if (type === "page") {
    // onDelete: Cascade on FacebookPost.page ensures posts go away with the page.
    await db.facebookPage.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: "page" });
  }
  if (type === "post") {
    await db.facebookPost.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: "post" });
  }
  return NextResponse.json(
    { error: "?type=page or ?type=post is required" },
    { status: 400 }
  );
}
