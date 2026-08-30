export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Settings from "@/models/Settings";
import { requireAdmin } from "@/lib/auth";
import { deleteImageIfUnreferenced } from "@/lib/images";

// Collect every image URL referenced by a set of hero banners.
function bannerImages(banners) {
  const set = new Set();
  for (const s of banners || []) {
    if (s?.imageDesktop) set.add(s.imageDesktop);
    if (s?.imageMobile) set.add(s.imageMobile);
  }
  return set;
}

export async function GET() {
  try {
    await connectDB();
    let settings = await Settings.findOne({}).lean();
    if (!settings) settings = (await Settings.create({})).toObject();
    return NextResponse.json({ heroBanners: settings.heroBanners || [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PUT(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const { heroBanners } = await request.json();
    // Three is the hard cap the storefront grid is built around.
    const banners = (Array.isArray(heroBanners) ? heroBanners : []).slice(0, 3);

    const before = await Settings.findOne({}).select("heroBanners").lean();
    await Settings.findOneAndUpdate({}, { $set: { heroBanners: banners } }, { upsert: true });

    // Delete from the CDN any image that a banner used before but doesn't now
    // (banner removed, image cleared, or image replaced).
    const next = bannerImages(banners);
    const removed = [...bannerImages(before?.heroBanners)].filter((u) => !next.has(u));
    await Promise.all(removed.map((u) => deleteImageIfUnreferenced(u)));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
