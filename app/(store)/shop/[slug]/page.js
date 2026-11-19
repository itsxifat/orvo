export const dynamic = "force-dynamic";

import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { getProduct, getSite } from "@/lib/storefront";
import {
  DEFAULT_SITE_NAME,
  breadcrumbJsonLd,
  clip,
  pageMetadata,
  productDescription,
  productJsonLd,
} from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import ProductDetailClient from "./ProductDetailClient";

// The product, its sizes with live availability, size chart, related products
// and any flash price, from the brand ERP. Metadata and the page share one read.
const load = cache((slug) => getProduct(slug));

// The product's search and sharing text: the ERP's SEO title and description
// when staff wrote them, otherwise worked out from the product itself — what it
// is, its price now and before, the sizes and colours in stock (lib/seo.js).
function seoOf(product, site) {
  const siteName = site?.siteInfo?.siteName || DEFAULT_SITE_NAME;
  const cod = site?.paymentGateways?.cod?.enabled !== false;
  return {
    siteName,
    title: clip(product.seoTitle || product.name, 70),
    description: product.seoDescription ? clip(product.seoDescription, 160) : productDescription(product, { siteName, cod }),
  };
}

export async function generateMetadata({ params: paramsPromise }) {
  const params = await paramsPromise;
  try {
    const [found, site] = await Promise.all([load(params.slug), getSite()]);
    if (!found?.product) return { title: "Product not found", robots: { index: false, follow: true } };
    const { product } = found;
    const { siteName, title, description } = seoOf(product, site);
    const variants = product.variants || [];
    const inStock = variants.filter((v) => v.stock > 0);
    const prices = (inStock.length ? inStock : variants).map((v) => v.price).filter((n) => Number.isFinite(n));
    // The price and stock for Facebook and Pinterest (product:* tags).
    const other = prices.length
      ? {
          "product:price:amount": Math.min(...prices).toFixed(2),
          "product:price:currency": "BDT",
          "product:availability": inStock.length ? "in stock" : "out of stock",
          "product:condition": "new",
          "product:brand": siteName,
          "product:retailer_item_id": String(product.id),
          ...(product.category?.name ? { "product:category": product.category.name } : {}),
        }
      : undefined;
    return pageMetadata({ title, description, path: `/shop/${product.slug}`, siteName, other, image: null });
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductPage({ params: paramsPromise, searchParams: searchParamsPromise }) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const [found, site] = await Promise.all([load(params.slug), getSite()]);
  // A product renamed in the ERP keeps its old address: answer it with a 301.
  if (found?.redirect && found.redirect !== params.slug) permanentRedirect(`/shop/${found.redirect}`);
  if (!found?.product) notFound();

  const { product, categoryPath } = found;
  const { siteName, description } = seoOf(product, site);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    ...(categoryPath || []).map((c) => ({ name: c.name, path: `/shop?category=${c.slug}` })),
    { name: product.name, path: `/shop/${product.slug}` },
  ];

  return (
    <>
      {/* The product with each size's price, regular price and stock, and the
          breadcrumbs, for Google (lib/seo.js). */}
      <JsonLd data={[productJsonLd(product, { siteName, description }), breadcrumbJsonLd(crumbs)]} />
      {/* `?size=M&colour=White` opens the product with that variant chosen. */}
      <ProductDetailClient
        product={product}
        related={found.related}
        categoryPath={categoryPath}
        preselect={{ size: [].concat(searchParams?.size || "")[0], colour: [].concat(searchParams?.colour || "")[0] }}
      />
    </>
  );
}
