// Unit tests for lib/seo.js: the titles, descriptions, canonical addresses,
// structured data and sitemap worked out from the ERP's answers.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  absoluteUrl,
  breadcrumbJsonLd,
  clip,
  collectionJsonLd,
  jsonLdText,
  organizationJsonLd,
  pageMetadata,
  productDescription,
  productJsonLd,
  returnPolicyJsonLd,
  shopCanonical,
  shopPageInfo,
  sitemapXml,
  SITE_URL,
  variantPath,
} from "../lib/seo.js";
import { mapCard } from "../lib/storefront-map.js";

// A product as lib/storefront-map.js → mapProduct shapes it.
function product(overrides = {}) {
  return {
    id: "p1",
    slug: "classic-tee",
    name: "Classic Tee",
    description: "Soft combed cotton. Pre-washed so it keeps its shape.",
    material: "Cotton",
    category: { _id: "c1", slug: "t-shirts", name: "T-Shirts" },
    images: ["https://erp.example/media/a/full", "https://erp.example/media/b/full"],
    galleries: [],
    variants: [
      { skuId: "s1", sku: "TEE-S", size: "S", sizeOnly: "S", colour: null, price: 670, compareAt: 1190, stock: 4, flash: { sale: { endsAt: "2026-11-18T17:59:00.000Z" }, remaining: 3 } },
      { skuId: "s2", sku: "TEE-M", size: "M", sizeOnly: "M", colour: null, price: 670, compareAt: 1190, stock: 0, flash: null },
      { skuId: "s3", sku: "TEE-L", size: "L", sizeOnly: "L", colour: null, price: 890, compareAt: null, stock: 2, flash: null },
    ],
    ...overrides,
  };
}

test("addresses are absolute on the site", () => {
  assert.equal(absoluteUrl("/shop/x"), `${SITE_URL}/shop/x`);
  assert.equal(absoluteUrl("shop"), `${SITE_URL}/shop`);
  assert.equal(absoluteUrl("https://erp.example/media/a"), "https://erp.example/media/a");
});

test("text is cut at a word with an ellipsis, and markup is dropped", () => {
  assert.equal(clip("short"), "short");
  const cut = clip("one two three four five six seven", 20);
  assert.ok(cut.length <= 20);
  assert.ok(cut.endsWith("…"));
  assert.ok(!cut.includes("  "));
  assert.equal(clip("<b>Bold</b>\n\nline", 50), "Bold line");
});

test("a listing's canonical address keeps what makes it a page of its own", () => {
  assert.equal(shopCanonical({}), "/shop");
  assert.equal(shopCanonical({ category: "shirts", sort: "price-asc", cu: "48213", page: "1" }), "/shop?category=shirts");
  assert.equal(shopCanonical({ onSale: "true", page: "3", size: "M" }), "/shop?onSale=true&page=3");
  assert.equal(shopCanonical(new URLSearchParams("newArrival=false&featured=true")), "/shop?featured=true");
});

test("search results are followed but not indexed; a narrowed listing points at the whole one", () => {
  assert.equal(shopPageInfo({ search: "polo" }).index, false);
  const narrowed = shopPageInfo({ category: "shirts", size: "M", maxPrice: "2000" }, { category: { name: "Shirts" } });
  assert.equal(narrowed.index, true);
  assert.equal(narrowed.canonical, "/shop?category=shirts");
});

test("each listing has its own title and description", () => {
  const category = shopPageInfo({ category: "shirts", page: "2" }, { category: { name: "Shirts" }, total: 12, siteName: "Shop" });
  assert.equal(category.title, "Shirts — Page 2");
  assert.match(category.description, /Shirts at Shop — 12 styles/);
  assert.equal(shopPageInfo({ onSale: "true" }).title, "Offers & Discounts");
  assert.equal(shopPageInfo({ onSale: "true" }, { maxDiscount: 40 }).title, "Offers & Discounts — up to 40% off");
  assert.equal(shopPageInfo({ newArrival: "true" }).title, "New Arrivals");
  assert.equal(shopPageInfo({}).title, "Shop All");
  for (const info of [category, shopPageInfo({ search: "x".repeat(400) })]) assert.ok(info.description.length <= 160);
});

test("a product's own description: its opening line, the price now and before, the sizes in stock", () => {
  const text = productDescription(product(), { siteName: "Shop" });
  assert.match(text, /^Soft combed cotton\./);
  assert.match(text, /From Tk 670 \(was Tk 1,190, 44% off\)/);
  assert.match(text, /Sizes S, L\./); // M is sold out
  assert.match(text, /Cash on delivery/);
  assert.ok(text.length <= 160);
  assert.doesNotMatch(productDescription(product(), { cod: false }), /Cash on delivery/);
  const soldOut = product({ variants: product().variants.map((v) => ({ ...v, stock: 0 })) });
  assert.match(productDescription(soldOut), /Currently sold out\./);
});

test("a product in several sizes is a ProductGroup with an offer per size", () => {
  const data = productJsonLd(product(), { siteName: "Shop" });
  assert.equal(data["@type"], "ProductGroup");
  assert.equal(data.productGroupID, "p1");
  assert.deepEqual(data.variesBy, ["https://schema.org/size"]);
  assert.equal(data.brand.name, "Shop");
  assert.equal(data.hasVariant.length, 3);
  const [s, m, l] = data.hasVariant;
  assert.equal(s.sku, "TEE-S");
  assert.equal(s.size, "S");
  assert.equal(s.offers.price, "670.00");
  assert.equal(s.offers.priceCurrency, "BDT");
  assert.equal(s.offers.availability, "https://schema.org/InStock");
  // The regular price, struck through; the flash price good until the sale ends (Dhaka date).
  assert.equal(s.offers.priceSpecification.priceType, "https://schema.org/StrikethroughPrice");
  assert.equal(s.offers.priceSpecification.price, "1190.00");
  assert.equal(s.offers.priceValidUntil, "2026-11-18");
  assert.equal(m.offers.availability, "https://schema.org/OutOfStock");
  assert.equal(l.offers.priceSpecification, undefined);
  assert.equal(l.offers.priceValidUntil, undefined);
  // Each size at its own address, which opens with that size chosen.
  assert.equal(s.offers.url, `${SITE_URL}/shop/classic-tee?size=S`);
  assert.equal(l.offers.url, `${SITE_URL}/shop/classic-tee?size=L`);
  // The exchange policy on every offer.
  assert.equal(s.offers.hasMerchantReturnPolicy.merchantReturnDays, 7);
});

test("the return policy is the returns page's: seven days with a refund, free when faulty", () => {
  const policy = returnPolicyJsonLd();
  assert.equal(policy["@type"], "MerchantReturnPolicy");
  assert.equal(policy.applicableCountry, "BD");
  assert.equal(policy.returnPolicyCategory, "https://schema.org/MerchantReturnFiniteReturnWindow");
  assert.equal(policy.merchantReturnDays, 7);
  assert.equal(policy.refundType, "https://schema.org/FullRefund");
  assert.equal(policy.itemDefectReturnFees, "https://schema.org/FreeReturn");
  assert.equal(policy.customerRemorseReturnFees, "https://schema.org/ReturnShippingFees");
  assert.equal(policy.merchantReturnLink, `${SITE_URL}/returns`);
});

test("a variant's address names its size, and its colour when colours differ", () => {
  assert.equal(variantPath("tee", { size: "M", sizeOnly: "M", colour: null }), "/shop/tee?size=M");
  assert.equal(variantPath("tee", { size: "M / Red", sizeOnly: "M", colour: "Red" }, { withColour: true }), "/shop/tee?size=M&colour=Red");
  assert.equal(variantPath("tee", { size: "M / Red", sizeOnly: "M", colour: "Red" }), "/shop/tee?size=M");
  // A product in colours only: the colour is the choice.
  assert.equal(variantPath("scarf", { size: "Blue", sizeOnly: null, colour: "Blue" }), "/shop/scarf?colour=Blue");
  assert.equal(variantPath("tee", { size: "XL Tall", sizeOnly: "XL Tall", colour: null }), "/shop/tee?size=XL+Tall");
});

test("cards carry their photos at full size too, for the sitemap", () => {
  const card = mapCard({
    id: "p1",
    slug: "tee",
    name: "Tee",
    price: { min: { taka: "500.00" }, max: { taka: "500.00" } },
    images: [{ urls: { thumb: "t", card: "https://erp.example/media/a/card", full: "https://erp.example/media/a/full" } }],
  });
  assert.deepEqual(card.images, ["https://erp.example/media/a/card"]);
  assert.deepEqual(card.fullImages, ["https://erp.example/media/a/full"]);
});

test("a product in one size is a Product with one offer, and colours give each variant its photo", () => {
  const single = productJsonLd(product({ variants: [product().variants[2]] }));
  assert.equal(single["@type"], "Product");
  assert.equal(single.offers.price, "890.00");
  const coloured = productJsonLd(
    product({
      galleries: [{ colour: "Red", images: ["https://erp.example/media/red/full"] }],
      variants: [
        { skuId: "r", sku: "R-M", size: "M / Red", sizeOnly: "M", colour: "Red", price: 900, compareAt: null, stock: 1 },
        { skuId: "b", sku: "B-M", size: "M / Blue", sizeOnly: "M", colour: "Blue", price: 900, compareAt: null, stock: 1 },
      ],
    })
  );
  assert.deepEqual(coloured.variesBy, ["https://schema.org/color"]);
  assert.equal(coloured.hasVariant[0].image, "https://erp.example/media/red/full");
  assert.equal(coloured.hasVariant[0].color, "Red");
  assert.equal(coloured.hasVariant[0].size, "M");
  assert.equal(coloured.hasVariant[1].image, "https://erp.example/media/a/full");
});

test("the store, breadcrumbs and listings", () => {
  const org = organizationJsonLd({
    siteInfo: { siteName: "Shop", phone: "+880 1700-000000", email: "", address: "Dhaka" },
    socialLinks: { facebook: "https://facebook.com/shop", instagram: "", tiktok: "not a url" },
  });
  assert.equal(org["@type"], "OnlineStore");
  assert.equal(org.hasMerchantReturnPolicy.merchantReturnDays, 7);
  assert.deepEqual(org.sameAs, ["https://facebook.com/shop"]);
  assert.equal(org.contactPoint.telephone, "+880 1700-000000");
  assert.equal(org.contactPoint.email, undefined);
  const crumbs = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Tee", path: "/shop/tee" }]);
  assert.equal(crumbs.itemListElement[1].position, 2);
  assert.equal(crumbs.itemListElement[1].item, `${SITE_URL}/shop/tee`);
  const list = collectionJsonLd({ name: "Sale", path: "/flash-sale/x", items: [{ name: "Tee", path: "/shop/tee" }] });
  assert.equal(list.mainEntity.itemListElement[0].url, `${SITE_URL}/shop/tee`);
});

test("structured data can never close its script tag", () => {
  const text = jsonLdText({ name: "</script><script>alert(1)</script>" });
  assert.ok(!text.includes("</script>"));
  assert.deepEqual(JSON.parse(text), { name: "</script><script>alert(1)</script>" });
});

test("page metadata: canonical, share text, and not indexing", () => {
  const meta = pageMetadata({ title: "About", description: "d", path: "/about", siteName: "Shop" });
  assert.equal(meta.alternates.canonical, "/about");
  assert.equal(meta.openGraph.url, "/about");
  assert.equal(meta.openGraph.siteName, "Shop");
  assert.equal(meta.openGraph.images[0].url, "/opengraph-image.jpg");
  assert.equal(meta.robots, undefined);
  const hidden = pageMetadata({ title: "t", path: "/x", index: false });
  assert.deepEqual(hidden.robots, { index: false, follow: true });
  assert.equal(hidden.alternates, undefined);
});

test("the sitemap escapes addresses and lists product photos", () => {
  const xml = sitemapXml(
    [
      { path: "/shop?category=a&b", changeFrequency: "daily", priority: 0.8, images: ["https://erp.example/media/a?x=1&y=2", "javascript:alert(1)"] },
      { path: "/", priority: 1 },
    ],
    "https://shop.example"
  );
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /xmlns:image="http:\/\/www.google.com\/schemas\/sitemap-image\/1.1"/);
  assert.match(xml, /<loc>https:\/\/shop.example\/shop\?category=a&amp;b<\/loc>/);
  assert.match(xml, /<image:loc>https:\/\/erp.example\/media\/a\?x=1&amp;y=2<\/image:loc>/);
  assert.doesNotMatch(xml, /javascript:/);
  assert.match(xml, /<priority>1.0<\/priority>/);
  assert.equal((xml.match(/<url>/g) || []).length, 2);
});
