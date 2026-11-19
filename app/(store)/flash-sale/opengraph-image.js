import { getFlashSales } from "@/lib/storefront";
import { brandCard, saleCard } from "@/lib/og";

// The picture a shared /flash-sale link shows: the live sale with the most
// deals, or the brand when none is running (lib/og.js).
export const runtime = "nodejs";
// Drawn when asked for: what is on changes, and the build has no ERP to read.
export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";
export const alt = "The flash sale: its best saving, when it ends and some of its deals";

export default async function Image() {
  try {
    const { live } = await getFlashSales();
    const top = [...live].sort((a, b) => b.stats.count - a.stats.count)[0];
    if (top) return await saleCard(top, { kicker: live.length > 1 ? `Flash sale · ${live.length} sales on now` : "Flash sale" });
  } catch {
    // The brand card below.
  }
  return brandCard({ title: "Flash Sale", subtitle: "Limited-time prices on limited stock" });
}
