export const dynamic = "force-dynamic";

import { cache } from "react";
import { notFound } from "next/navigation";
import { getFlashSale, getFlashSales, getSite } from "@/lib/storefront";
import { DEFAULT_SITE_NAME, breadcrumbJsonLd, clip, collectionJsonLd, pageMetadata, shortDate } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import FlashCampaignView from "./FlashCampaignView";

// Metadata and the page both need the sale; load it once per request.
const loadSale = cache((slug) => getFlashSale(slug));

// A sale's search and sharing text, from the sale itself: its title and best
// saving, how many deals, and when it ends (or starts).
function seoOf(sale) {
  const off = sale.stats.maxDiscount;
  const count = sale.stats.count;
  const when = sale.status === "scheduled"
    ? sale.startsAt ? `Starts ${shortDate(sale.startsAt)}.` : "Coming soon."
    : sale.endsAt ? `Ends ${shortDate(sale.endsAt)}.` : "While stocks last.";
  return {
    title: clip(`${sale.title}${off > 0 ? ` — up to ${off}% off` : ""}`, 70),
    description: clip(
      `${sale.subtitle ? `${sale.subtitle} ` : ""}${count} limited-stock deal${count === 1 ? "" : "s"}${off > 0 ? `, up to ${off}% off` : ""}. ${when} Cash on delivery across Bangladesh.`,
      160
    ),
  };
}

export async function generateMetadata({ params: paramsPromise }) {
  const params = await paramsPromise;
  try {
    const [sale, site] = await Promise.all([loadSale(params.slug), getSite()]);
    if (!sale) return { title: "Flash Sale", robots: { index: false, follow: true } };
    const siteName = site?.siteInfo?.siteName || DEFAULT_SITE_NAME;
    return pageMetadata({ ...seoOf(sale), path: `/flash-sale/${sale.slug}`, siteName, image: null });
  } catch {
    return { title: "Flash Sale" };
  }
}

// One campaign's full page: every deal, with sorting and filters. Live sales can
// be bought from; a sale that hasn't started shows its deals as a sneak peek.
// Drafts and ended sales are not served by the ERP, so they are not found here;
// staff preview a sale in the ERP console.
export default async function FlashSaleCampaignPage({ params: paramsPromise }) {
  const params = await paramsPromise;
  const sale = await loadSale(params.slug);
  if (!sale) notFound();

  let others = [];
  try {
    const { live } = await getFlashSales();
    others = live.filter((s) => s._id !== sale._id);
  } catch {}

  const path = `/flash-sale/${sale.slug}`;
  const { title, description } = seoOf(sale);
  return (
    <>
      {/* The sale and the products in it, and the breadcrumbs, for Google. */}
      <JsonLd
        data={[
          collectionJsonLd({
            name: title,
            description,
            path,
            items: sale.items.map((item) => ({ name: item.product.name, path: `/shop/${item.product.slug}`, image: item.product.images?.[0] })),
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Flash Sale", path: "/flash-sale" },
            { name: sale.title, path },
          ]),
        ]}
      />
      <FlashCampaignView sale={sale} others={others} preview={false} />
    </>
  );
}
