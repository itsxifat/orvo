// Search and link-sharing data for every page, worked out from what the ERP
// already says about the shop: page titles and descriptions, canonical
// addresses, and schema.org structured data (JSON-LD) for Google.
//
// Pure functions with no I/O, so the pages, the sitemap, the share images and
// the unit tests (tests/seo.test.mjs) all use the same rules. Prices are the
// ERP's own `taka` figures; nothing here works a price out.

/** The site's public address (NEXT_PUBLIC_SITE_URL, set when the app is built). */
export const SITE_URL = String(process.env.NEXT_PUBLIC_SITE_URL || "https://orvo.bd").replace(/\/+$/, "");

export const DEFAULT_SITE_NAME = "Orvo";
export const TAGLINE = "Modern Wardrobe Essentials";
export const CURRENCY = "BDT";

/** An absolute URL on this site for a path ("/shop/x"), or the URL itself when it already is one. */
export function absoluteUrl(path = "/", base = SITE_URL) {
  if (!path) return base + "/";
  if (/^https?:\/\//i.test(path)) return path;
  return base + (path.startsWith("/") ? path : `/${path}`);
}

/** Text with markup, line breaks and repeated spaces taken out. */
export function plainText(text) {
  return String(text ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[*_`#>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Text cut to `max` characters at a word boundary, with an ellipsis when cut. */
export function clip(text, max = 160) {
  const clean = plainText(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/, "")}…`;
}

/** "Tk 1,250" — the shop's own way of writing a price. */
export function takaText(amount) {
  const n = Number(amount);
  return `Tk ${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/** A money figure for structured data: "1250.00". */
function priceValue(amount) {
  const n = Number(amount);
  return Number.isFinite(n) ? n.toFixed(2) : undefined;
}

/** The YYYY-MM-DD date of a timestamp in Dhaka. */
export function dhakaDate(at) {
  const d = at ? new Date(at) : null;
  if (!d || Number.isNaN(d.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** "18 Nov" — a sale's end, in Dhaka. */
export function shortDate(at) {
  const d = at ? new Date(at) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" }).format(d);
}

// --- shop listings -------------------------------------------------------------------------------

// The shop's query parameters that make a page worth indexing on its own; the
// rest (sort, size, price, tags, campaign codes) only reorder or narrow it, so
// their canonical address leaves them out and Google folds them into it.
const CANONICAL_PARAMS = ["category", "gender", "onSale", "newArrival", "featured", "page"];

function readParam(params, key) {
  const value = typeof params?.get === "function" ? params.get(key) : params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

/** The shop's canonical path for a query: "/shop?category=shirts&page=2". */
export function shopCanonical(params) {
  const keep = new URLSearchParams();
  for (const key of CANONICAL_PARAMS) {
    const value = readParam(params, key);
    if (value === undefined || value === null || value === "") continue;
    if (key === "page" && String(value) === "1") continue;
    if (["onSale", "newArrival", "featured"].includes(key) && value !== "true") continue;
    keep.set(key, String(value));
  }
  const qs = keep.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

/**
 * What a shop listing is, for its title, description and canonical address.
 * Search results are followed but not indexed; a page narrowed by size, price
 * or tags names the unnarrowed listing as its canonical.
 */
export function shopPageInfo(params, { category = null, total = null, siteName = DEFAULT_SITE_NAME, maxDiscount = 0 } = {}) {
  const search = (readParam(params, "search") || readParam(params, "q") || "").trim();
  const page = Math.max(1, parseInt(readParam(params, "page") || "1", 10) || 1);
  const onSale = readParam(params, "onSale") === "true";
  const newArrival = readParam(params, "newArrival") === "true";
  const featured = readParam(params, "featured") === "true";
  const count = Number.isFinite(total) && total > 0 ? `${total} style${total === 1 ? "" : "s"}` : "";

  let title;
  let description;
  if (search) {
    title = `Search results for “${clip(search, 60)}”`;
    description = `Products matching “${clip(search, 60)}” at ${siteName}.`;
  } else if (category) {
    title = category.name;
    description = category.description
      ? clip(category.description, 160)
      : `Shop ${category.name} at ${siteName}${count ? ` — ${count}` : ""}. New styles, honest prices and cash on delivery across Bangladesh.`;
  } else if (onSale) {
    title = maxDiscount > 0 ? `Offers & Discounts — up to ${maxDiscount}% off` : "Offers & Discounts";
    description = `Every product on sale at ${siteName}${maxDiscount > 0 ? `, up to ${maxDiscount}% off` : ""}: reduced prices and live flash deals. Cash on delivery across Bangladesh.`;
  } else if (newArrival) {
    title = "New Arrivals";
    description = `The latest drops at ${siteName}${count ? ` — ${count}` : ""}. Order online with cash on delivery across Bangladesh.`;
  } else if (featured) {
    title = "Featured Collection";
    description = `Handpicked styles from ${siteName}. Order online with cash on delivery across Bangladesh.`;
  } else {
    title = "Shop All";
    description = `Shop every style at ${siteName}${count ? ` — ${count}` : ""}: shirts, tees, outerwear and more. Cash on delivery across Bangladesh.`;
  }
  if (page > 1) title = `${title} — Page ${page}`;

  return {
    title,
    description: clip(description, 160),
    canonical: shopCanonical(params),
    index: !search,
  };
}

// --- product pages -------------------------------------------------------------------------------

/** The sizes in stock, in the product's own order, without repeats. */
function sizesInStock(variants) {
  return [...new Set(variants.filter((v) => v.stock > 0).map((v) => v.sizeOnly || v.size).filter(Boolean))];
}

/**
 * The product's description for search results and shared links, when staff
 * left the ERP's SEO description empty: what it is, what it costs now (and
 * was), the sizes and colours in stock, and how to pay — at most 160 characters.
 */
export function productDescription(product, { siteName = DEFAULT_SITE_NAME, cod = true } = {}) {
  const variants = product.variants || [];
  const prices = variants.map((v) => v.price).filter((n) => Number.isFinite(n));
  const min = prices.length ? Math.min(...prices) : null;
  const lowest = variants.find((v) => v.price === min) || null;
  const was = lowest?.compareAt > min ? lowest.compareAt : null;
  const off = was ? Math.round(((was - min) / was) * 100) : 0;
  const sizes = sizesInStock(variants);
  const colours = [...new Set(variants.filter((v) => v.stock > 0).map((v) => v.colour).filter(Boolean))];

  const price = min === null
    ? ""
    : `${prices.some((p) => p !== min) ? "From " : ""}${takaText(min)}${was ? ` (was ${takaText(was)}, ${off}% off)` : ""}.`;
  const range = sizes.length
    ? `Sizes ${sizes.join(", ")}${colours.length > 1 ? ` in ${colours.slice(0, 3).join(", ")}` : ""}.`
    : variants.length
    ? "Currently sold out."
    : "";
  const lead = plainText(product.description).split(/(?<=[.!?])\s/)[0] || "";
  const opening = lead && lead.length <= 90 ? lead : `Buy ${product.name} online at ${siteName}.`;

  // Whole sentences, most useful first, as many as fit in 160 characters.
  let text = "";
  for (const sentence of [opening, price, range, cod ? "Cash on delivery across Bangladesh." : ""]) {
    if (!sentence) continue;
    const next = text ? `${text} ${sentence}` : sentence;
    if (next.length <= 160) text = next;
  }
  return text || clip(opening, 160);
}

const AVAILABILITY = {
  in: "https://schema.org/InStock",
  out: "https://schema.org/OutOfStock",
};

/**
 * The shop's return policy, as the returns page (app/(store)/returns) and the
 * terms state it: a return within 7 days of delivery, the item unused and
 * unwashed in its original packaging with its tags, refunded once it is back
 * and inspected; free when the item is faulty or wrong, the return shipping
 * paid by the customer otherwise; Bangladesh only.
 * Google shows it beside the product's price.
 */
export function returnPolicyJsonLd() {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "BD",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 7,
    returnMethod: "https://schema.org/ReturnByMail",
    refundType: "https://schema.org/FullRefund",
    itemCondition: "https://schema.org/NewCondition",
    customerRemorseReturnFees: "https://schema.org/ReturnShippingFees",
    itemDefectReturnFees: "https://schema.org/FreeReturn",
    merchantReturnLink: absoluteUrl("/returns"),
  };
}

/**
 * The address that opens a product with one size (and colour) chosen:
 * "/shop/tee?size=M&colour=White" (the product page reads both).
 */
export function variantPath(slug, variant, { withColour = false } = {}) {
  const query = new URLSearchParams();
  const size = variant.sizeOnly || (variant.colour && variant.size === variant.colour ? null : variant.size);
  if (size) query.set("size", size);
  if (variant.colour && (withColour || !size)) query.set("colour", variant.colour);
  const qs = query.toString();
  return `/shop/${slug}${qs ? `?${qs}` : ""}`;
}

function offerFor(variant, url, sellerName) {
  const price = priceValue(variant.price);
  if (price === undefined) return undefined;
  const offer = {
    "@type": "Offer",
    url,
    price,
    priceCurrency: CURRENCY,
    availability: variant.stock > 0 ? AVAILABILITY.in : AVAILABILITY.out,
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: sellerName },
    hasMerchantReturnPolicy: returnPolicyJsonLd(),
  };
  // A flash price is good until its sale ends.
  const until = dhakaDate(variant.flash?.sale?.endsAt);
  if (until) offer.priceValidUntil = until;
  // The regular price, struck through in Google's results.
  if (variant.compareAt > variant.price) {
    offer.priceSpecification = {
      "@type": "UnitPriceSpecification",
      priceType: "https://schema.org/StrikethroughPrice",
      price: priceValue(variant.compareAt),
      priceCurrency: CURRENCY,
    };
  }
  return offer;
}

/**
 * The product as schema.org structured data. One size and colour is a Product
 * with an Offer; more are a ProductGroup with a Product per size and colour,
 * each with its own price, regular price, stock and SKU — the shape Google asks
 * for product variants.
 */
export function productJsonLd(product, { siteName = DEFAULT_SITE_NAME, description, url } = {}) {
  const pageUrl = url || absoluteUrl(`/shop/${product.slug}`);
  const images = (product.images || []).slice(0, 10);
  const variants = product.variants || [];
  const brand = { "@type": "Brand", name: siteName };
  const text = description || clip(product.description || product.name, 500);
  const base = {
    name: product.name,
    description: text,
    url: pageUrl,
    image: images,
    brand,
    ...(product.category?.name ? { category: product.category.name } : {}),
    ...(product.material ? { material: product.material } : {}),
  };

  if (variants.length <= 1) {
    const only = variants[0];
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      ...base,
      sku: only?.sku || only?.skuId || product.id,
      productID: product.id,
      ...(only ? { offers: offerFor(only, pageUrl, siteName) } : {}),
    };
  }

  const variesBy = [];
  if (variants.some((v) => (v.sizeOnly || v.size) !== (variants[0].sizeOnly || variants[0].size))) variesBy.push("https://schema.org/size");
  if (new Set(variants.map((v) => v.colour).filter(Boolean)).size > 1) variesBy.push("https://schema.org/color");
  const galleries = product.galleries || [];
  const photoFor = (colour) => {
    if (!colour) return images[0];
    const own = galleries.find((g) => g.colour && String(g.colour).toLowerCase() === String(colour).toLowerCase());
    return own?.images?.[0] || images[0];
  };

  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    ...base,
    productGroupID: product.id,
    ...(variesBy.length ? { variesBy } : {}),
    hasVariant: variants.map((v) => ({
      "@type": "Product",
      name: [product.name, v.sizeOnly || v.size, v.colour && v.sizeOnly ? v.colour : null].filter(Boolean).join(" – "),
      sku: v.sku || v.skuId,
      image: photoFor(v.colour),
      ...(v.sizeOnly || v.size ? { size: v.sizeOnly || v.size } : {}),
      ...(v.colour ? { color: v.colour } : {}),
      // Each size and colour at its own address, chosen when it opens.
      offers: offerFor(v, absoluteUrl(variantPath(product.slug, v, { withColour: variesBy.includes("https://schema.org/color") })), siteName),
    })),
  };
}

// --- the shop as a whole -------------------------------------------------------------------------

/** The shop as an online store: name, logo, contact and social profiles. */
export function organizationJsonLd(site = {}, { logo = absoluteUrl("/orvo-logo.png") } = {}) {
  const info = site.siteInfo || {};
  const social = site.socialLinks || {};
  const sameAs = Object.values(social).filter((u) => typeof u === "string" && /^https?:\/\//.test(u));
  const contact = info.phone || info.email
    ? {
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          areaServed: "BD",
          availableLanguage: ["English", "Bengali"],
          ...(info.phone ? { telephone: info.phone } : {}),
          ...(info.email ? { email: info.email } : {}),
        },
      }
    : {};
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": absoluteUrl("/#organization"),
    name: info.siteName || DEFAULT_SITE_NAME,
    url: absoluteUrl("/"),
    logo,
    slogan: TAGLINE,
    ...(sameAs.length ? { sameAs } : {}),
    ...contact,
    ...(info.address ? { address: { "@type": "PostalAddress", streetAddress: info.address, addressCountry: "BD" } } : {}),
    hasMerchantReturnPolicy: returnPolicyJsonLd(),
  };
}

/** The website, with the shop's search for Google. */
export function websiteJsonLd(site = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: site.siteInfo?.siteName || DEFAULT_SITE_NAME,
    url: absoluteUrl("/"),
    publisher: { "@id": absoluteUrl("/#organization") },
    inLanguage: "en-BD",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: absoluteUrl("/shop?search={search_term_string}") },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Breadcrumbs from [{ name, path }], home first; the last is the page itself. */
export function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

/** A listing page (a category, the offers, a flash sale) and the products on it. */
export function collectionJsonLd({ name, description, path, items = [] }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    ...(description ? { description } : {}),
    url: absoluteUrl(path),
    isPartOf: { "@id": absoluteUrl("/#website") },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.slice(0, 60).map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(item.path),
        name: item.name,
        ...(item.image ? { image: item.image } : {}),
      })),
    },
  };
}

/** JSON-LD for a <script> tag: `<` escaped so the text can never close the tag. */
export function jsonLdText(data) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// --- the sitemap ---------------------------------------------------------------------------------

function xmlEscape(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * sitemap.xml from [{ path, lastModified?, changeFrequency?, priority?, images?: [url] }],
 * with Google's image extension so product photos are found too.
 */
export function sitemapXml(entries, base = SITE_URL) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ];
  for (const entry of entries) {
    lines.push("<url>");
    lines.push(`<loc>${xmlEscape(absoluteUrl(entry.path, base))}</loc>`);
    if (entry.lastModified) {
      const at = new Date(entry.lastModified);
      if (!Number.isNaN(at.getTime())) lines.push(`<lastmod>${at.toISOString()}</lastmod>`);
    }
    if (entry.changeFrequency) lines.push(`<changefreq>${entry.changeFrequency}</changefreq>`);
    if (typeof entry.priority === "number") lines.push(`<priority>${entry.priority.toFixed(1)}</priority>`);
    for (const image of (entry.images || []).slice(0, 10)) {
      if (typeof image !== "string" || !/^https?:\/\//.test(image)) continue;
      lines.push(`<image:image><image:loc>${xmlEscape(image)}</image:loc></image:image>`);
    }
    lines.push("</url>");
  }
  lines.push("</urlset>");
  return lines.join("\n") + "\n";
}

// --- page metadata -------------------------------------------------------------------------------

/**
 * A page's metadata: its title, description, canonical address and the same
 * for shared links (og:title, og:description, og:url, og:site_name, and the
 * default share picture unless `image: null`). `index: false` keeps the page
 * out of search results while its links are still followed.
 */
export function pageMetadata({ title, description, path, siteName = DEFAULT_SITE_NAME, type = "website", index = true, other, image = DEFAULT_SHARE_IMAGE }) {
  return {
    title,
    description,
    // A page kept out of search results names no canonical (Google's advice:
    // never both). Indexed pages name themselves.
    ...(index ? { alternates: { canonical: path } } : { robots: { index: false, follow: true } }),
    // `image: null` for a page with its own opengraph-image file: setting
    // images here would hide it.
    openGraph: { type, siteName, locale: "en_BD", url: path, title, description, ...(image ? { images: [image] } : {}) },
    ...(other ? { other } : {}),
  };
}

/**
 * The share picture of a page with none of its own (app/opengraph-image.jpg).
 * A product or flash sale page's own opengraph-image file takes its place.
 */
export const DEFAULT_SHARE_IMAGE = { url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "Orvo — Modern Wardrobe Essentials" };
