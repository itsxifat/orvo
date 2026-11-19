export const dynamic = "force-dynamic";

import { Suspense, cache } from "react";
import { flattenCategories, getCategoryTree, getSite, listProducts } from "@/lib/storefront";
import { DEFAULT_SITE_NAME, breadcrumbJsonLd, collectionJsonLd, pageMetadata, shopPageInfo } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import Spinner from "@/components/ui/Spinner";
import ShopContent from "./ShopContent";

// The shop's query string as the address has it.
function queryOf(searchParams = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    for (const one of [].concat(value)) query.append(key, one);
  }
  return query.toString();
}

// The products for this address and the categories, read once per request for
// the metadata and the page. A failed read leaves `list` null: the grid then
// tries again in the browser.
const loadShop = cache(async (qs) => {
  const [list, tree] = await Promise.all([listProducts(new URLSearchParams(qs)).catch(() => null), getCategoryTree()]);
  return { list, categories: flattenCategories(tree) };
});

function describe(searchParams, { list, categories }, site) {
  const siteName = site?.siteInfo?.siteName || DEFAULT_SITE_NAME;
  const asked = searchParams?.category;
  const category = asked ? categories.find((c) => c.slug === asked || c._id === asked) || null : null;
  const info = shopPageInfo(searchParams, { category, total: list?.total ?? null, siteName });
  // An unknown category or an empty page is not worth a place in search results.
  const index = info.index && !(asked && !category) && !(list && list.total === 0);
  return { siteName, category, info: { ...info, index } };
}

// Each listing's own title, description and canonical address: a category, the
// offers, new arrivals, featured, a page number (lib/seo.js → shopPageInfo).
// Search results and pages narrowed by size, price or tags are not indexed.
export async function generateMetadata({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;
  const [data, site] = await Promise.all([loadShop(queryOf(searchParams)), getSite()]);
  const { siteName, info } = describe(searchParams, data, site);
  return pageMetadata({ title: info.title, description: info.description, path: info.canonical, siteName, index: info.index });
}

export default async function ShopPage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;
  const qs = queryOf(searchParams);
  const [data, site] = await Promise.all([loadShop(qs), getSite()]);
  const { category, info } = describe(searchParams, data, site);

  // Home › Shop › the category and the ones above it, or the listing's name.
  const chain = [];
  for (let c = category; c; c = data.categories.find((x) => x._id === c.parent) || null) chain.unshift(c);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    ...chain.map((c) => ({ name: c.name, path: `/shop?category=${c.slug}` })),
    ...(!category && info.canonical !== "/shop" && info.index ? [{ name: info.title, path: info.canonical }] : []),
  ];

  return (
    <>
      {info.index && (
        <JsonLd
          data={[
            collectionJsonLd({
              name: info.title,
              description: info.description,
              path: info.canonical,
              items: (data.list?.products || []).map((p) => ({ name: p.name, path: `/shop/${p.slug}`, image: p.images?.[0] })),
            }),
            breadcrumbJsonLd(crumbs),
          ]}
        />
      )}
      <Suspense fallback={<div className="flex justify-center py-28"><Spinner size="lg" /></div>}>
        <ShopContent key={qs} initial={data.list ? { ...data.list, query: qs } : null} categories={data.categories} />
      </Suspense>
    </>
  );
}
