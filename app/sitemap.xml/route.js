import { flattenCategories, getCategoryTree, getFlashSales, listProducts } from "@/lib/storefront";
import { sitemapXml } from "@/lib/seo";

// sitemap.xml for Google Search Console and Bing, read from the brand ERP when
// it is asked for: the shop's pages, the offers, every category, every live and
// coming flash sale, and every product on the website with its photos (Google's
// image extension). A product renamed in the ERP is listed at its new address.
export const dynamic = "force-dynamic";

const PER_PAGE = 60; // the ERP's largest page
const MAX_PAGES = 100; // the ERP's last page number

async function everyProduct() {
  const products = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const answer = await listProducts(new URLSearchParams({ sort: "newest", page: String(page) }), { limit: PER_PAGE });
    products.push(...answer.products);
    if (page >= answer.totalPages || answer.products.length === 0) break;
  }
  return products;
}

export async function GET() {
  let products;
  try {
    products = await everyProduct();
  } catch (error) {
    // Better no sitemap for now than one without the products: ask again later.
    console.error("GET /sitemap.xml:", error?.code || error?.message);
    return new Response("The catalog is not available right now.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "600" },
    });
  }
  const [tree, flash] = await Promise.all([getCategoryTree(), getFlashSales().catch(() => ({ live: [], upcoming: [] }))]);

  const entries = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/shop", changeFrequency: "daily", priority: 0.9 },
    { path: "/shop?onSale=true", changeFrequency: "daily", priority: 0.8 },
    { path: "/flash-sale", changeFrequency: "hourly", priority: 0.8 },
    ...[...flash.live, ...flash.upcoming].map((sale) => ({
      path: `/flash-sale/${sale.slug}`,
      changeFrequency: "hourly",
      priority: 0.7,
      images: sale.bannerImage ? [sale.bannerImage] : [],
    })),
    { path: "/shop?newArrival=true", changeFrequency: "daily", priority: 0.7 },
    { path: "/shop?featured=true", changeFrequency: "weekly", priority: 0.6 },
    ...flattenCategories(tree).map((c) => ({
      path: `/shop?category=${encodeURIComponent(c.slug)}`,
      changeFrequency: "daily",
      priority: c.parent ? 0.7 : 0.8,
      images: c.image ? [c.image] : [],
    })),
    ...products.map((p) => ({
      path: `/shop/${encodeURIComponent(p.slug)}`,
      changeFrequency: "weekly",
      priority: 0.8,
      images: p.fullImages?.length ? p.fullImages : p.images || [],
    })),
    { path: "/about", changeFrequency: "yearly", priority: 0.3 },
    { path: "/returns", changeFrequency: "yearly", priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
  ];

  return new Response(sitemapXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
    },
  });
}
