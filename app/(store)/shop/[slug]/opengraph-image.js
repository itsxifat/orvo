import { getProduct, getSite } from "@/lib/storefront";
import { brandCard, productCard } from "@/lib/og";

// The picture a shared product link shows: its photo, name and price now (lib/og.js).
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";
export const alt = "The product's photo, name and price";

export default async function Image({ params: paramsPromise }) {
  const params = await paramsPromise;
  try {
    const [found, site] = await Promise.all([getProduct(params.slug), getSite()]);
    if (found?.product) return await productCard(found.product, { cod: site?.paymentGateways?.cod?.enabled !== false });
  } catch {
    // The brand card below: a shared link never shows a broken picture.
  }
  return brandCard();
}
