import { getFlashSale } from "@/lib/storefront";
import { brandCard, saleCard } from "@/lib/og";

// The picture a shared flash-sale link shows: the sale's best saving, when it
// ends (or starts) and its banner or deals (lib/og.js).
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";
export const alt = "The flash sale: its best saving, when it ends and some of its deals";

export default async function Image({ params: paramsPromise }) {
  const params = await paramsPromise;
  try {
    const sale = await getFlashSale(params.slug);
    if (sale) return await saleCard(sale, { kicker: sale.status === "scheduled" ? "Flash sale · coming soon" : "Flash sale" });
  } catch {
    // The brand card below.
  }
  return brandCard({ title: "Flash Sale", subtitle: "Limited-time prices on limited stock" });
}
