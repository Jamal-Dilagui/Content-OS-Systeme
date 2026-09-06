import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET — return all Facebook pages with their posts, plus the supporting
// niche / website lists used by the create-page dialog.
//
// Note: FacebookPage has a nicheId column but no Prisma relation to Niche
// in the shared schema. We fetch niches separately and join in code.
export async function GET() {
  const [pages, nichesRaw, websitesRaw] = await Promise.all([
    db.facebookPage.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        website: { select: { id: true, name: true, url: true } },
        posts: { orderBy: { createdAt: "desc" } },
      },
    }),
    db.niche.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.website.findMany({
      select: { id: true, name: true, url: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const nicheMap = new Map(nichesRaw.map((n) => [n.id, n.name]));
  const niches = nichesRaw;
  const websites = websitesRaw;

  return NextResponse.json({
    pages: pages.map((p) => ({
      id: p.id,
      name: p.name,
      nicheId: p.nicheId,
      nicheName: p.nicheId ? nicheMap.get(p.nicheId) ?? null : null,
      websiteId: p.websiteId,
      websiteName: p.website?.name ?? null,
      websiteUrl: p.website?.url ?? null,
      status: p.status,
      followers: p.followers,
      postCount: p.posts.length,
      posts: p.posts.map((post) => ({
        id: post.id,
        pageId: post.pageId,
        caption: post.caption,
        cta: post.cta,
        url: post.url,
        imageUrl: post.imageUrl,
        status: post.status,
        scheduledDate: post.scheduledDate,
        publishedDate: post.publishedDate,
        impressions: post.impressions,
        clicks: post.clicks,
        engagement: post.engagement,
        createdAt: post.createdAt,
      })),
      createdAt: p.createdAt,
    })),
    niches,
    websites,
  });
}

// POST — create a Facebook page OR a Facebook post.
// Body field `kind` selects the target ("page" | "post"). Defaults to "page".
export async function POST(req: Request) {
  const body = await req.json();
  const kind = (body.kind as string) || "page";

  if (kind === "page") {
    const { name, nicheId, websiteId, status, followers } = body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (nicheId) {
      const n = await db.niche.findUnique({ where: { id: nicheId } });
      if (!n) return NextResponse.json({ error: "Niche not found" }, { status: 404 });
    }
    if (websiteId) {
      const w = await db.website.findUnique({ where: { id: websiteId } });
      if (!w) return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }
    const page = await db.facebookPage.create({
      data: {
        name: name.trim(),
        nicheId: nicheId || null,
        websiteId: websiteId || null,
        status: status || "ACTIVE",
        followers: Number(followers) || 0,
      },
      include: {
        website: { select: { id: true, name: true, url: true } },
        posts: true,
      },
    });
    // Look up niche name separately (no Prisma relation on FacebookPage)
    let nicheName: string | null = null;
    if (page.nicheId) {
      const n = await db.niche.findUnique({ where: { id: page.nicheId }, select: { name: true } });
      nicheName = n?.name ?? null;
    }
    return NextResponse.json(
      {
        kind: "page",
        id: page.id,
        name: page.name,
        nicheId: page.nicheId,
        nicheName,
        websiteId: page.websiteId,
        websiteName: page.website?.name ?? null,
        websiteUrl: page.website?.url ?? null,
        status: page.status,
        followers: page.followers,
        postCount: page.posts.length,
        posts: [],
        createdAt: page.createdAt,
      },
      { status: 201 }
    );
  }

  if (kind === "post") {
    const {
      pageId,
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
    if (!pageId || typeof pageId !== "string") {
      return NextResponse.json({ error: "pageId is required" }, { status: 400 });
    }
    const page = await db.facebookPage.findUnique({ where: { id: pageId } });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    const validStatuses = ["IDEA", "SCHEDULED", "PUBLISHED", "FAILED"];
    const finalStatus = validStatuses.includes(status) ? status : "IDEA";

    // Auto-stamp publishedDate when status is PUBLISHED
    let finalPublishedDate: Date | null = null;
    if (publishedDate) {
      finalPublishedDate = new Date(publishedDate);
    } else if (finalStatus === "PUBLISHED") {
      finalPublishedDate = new Date();
    }

    const post = await db.facebookPost.create({
      data: {
        pageId,
        caption: caption?.trim() || null,
        cta: cta?.trim() || null,
        url: url?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        status: finalStatus,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        publishedDate: finalPublishedDate,
        impressions: Number(impressions) || 0,
        clicks: Number(clicks) || 0,
        engagement: Number(engagement) || 0,
      },
    });
    return NextResponse.json({ kind: "post", ...post }, { status: 201 });
  }

  return NextResponse.json(
    { error: "kind must be 'page' or 'post'" },
    { status: 400 }
  );
}
