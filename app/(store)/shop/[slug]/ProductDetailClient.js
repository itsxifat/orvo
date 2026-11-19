"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { X, MessageCircle, ChevronRight, Truck, RefreshCw, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import ImageGallery from "@/components/product/ImageGallery";
import VariantSelector, { ColourSelector } from "@/components/product/VariantSelector";
import AddToCartButton from "@/components/product/AddToCartButton";
import MobileBuyBar from "@/components/product/MobileBuyBar";
import ProductCard from "@/components/shop/ProductCard";
import SectionHead from "@/components/home/SectionHead";
import { track } from "@/lib/tracking/client";
import { useSettings } from "@/context/SettingsContext";
import Reveal from "@/components/motion/Reveal";
import WasPrice from "@/components/ui/WasPrice";
import { CountdownText } from "@/components/flash/Countdown";
import { useAddToBag } from "@/components/product/useAddToBag";
import { coloursOf, galleryFor, priceSummary } from "@/lib/storefront-map";

const SERVICE = [
  { Icon: Truck, label: "Ships in 24h", note: "2–4 days nationwide" },
  { Icon: RefreshCw, label: "7-day exchange", note: "Size swaps are free" },
  { Icon: ShieldCheck, label: "Checked twice", note: "Before it leaves us" },
];

function SizeChartModal({ chart, onClose }) {
  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[86vh] w-full animate-sheet-up flex-col overflow-hidden rounded-t-4xl bg-paper-pure shadow-pop sm:max-w-2xl sm:animate-pop sm:rounded-4xl" role="dialog" aria-modal="true" aria-label="Size guide">
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 shrink-0">
          <div>
            <p className="text-[19px] font-bold text-ink tracking-[-0.03em]">{chart.name}</p>
            <p className="text-[13.5px] text-smoke mt-0.5">Measurements in inches unless stated</p>
          </div>
          <button
            onClick={onClose}
            className="press -mr-1 flex h-10 w-10 items-center justify-center rounded-full bg-haze text-ink transition-colors duration-fast ease-swift hover:bg-haze-dark"
            aria-label="Close size guide"
          >
            <X size={19} strokeWidth={2} />
          </button>
        </div>
        <div className="overflow-auto flex-1 px-6 sm:px-8 pb-8">
          <div className="rounded-2xl overflow-hidden border border-haze-dark">
            <table className="w-full">
              <thead>
                <tr className="bg-haze">
                  {chart.columns.map((col, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-left text-[13.5px] font-semibold text-ink whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-haze-dark">
                {chart.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-3 text-[14.5px] text-ink/75 tabular-nums">
                        {cell || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailClient({ product, related = [], categoryPath = [], preselect }) {
  const { settings } = useSettings();
  const [sizeError, setSizeError] = useState(0);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [tab, setTab] = useState("details");

  const buyBlockRef = useRef(null);
  const sizeBlockRef = useRef(null);
  const variants = product.variants || [];
  const colours = coloursOf(product);
  const pickColour = colours.length > 1 && variants.some((variant) => variant.sizeOnly);
  const sameLabel = (actual, asked) => String(actual ?? "").trim().toLowerCase() === String(asked).trim().toLowerCase();
  const requested = preselect?.size || preselect?.colour ? variants.find((variant) =>
    (!preselect.size || sameLabel(variant.sizeOnly || variant.size, preselect.size)) &&
    (!preselect.colour || sameLabel(variant.colour, preselect.colour))
  ) : null;
  const [colour, setColour] = useState(() =>
    pickColour ? requested?.colour || variants.find((variant) => variant.colour && variant.stock > 0)?.colour || colours[0] : null
  );
  const shownVariants = pickColour ? variants.filter((variant) => variant.colour === colour) : variants;
  const onlySize = (sizes) => sizes.length === 1 && sizes[0].stock > 0 ? sizes[0].size : "";
  const [selectedSize, setSelectedSize] = useState(() => requested?.size || onlySize(shownVariants));
  const selectedVariant = shownVariants.find((variant) => variant.size === selectedSize);
  const labelOf = (variant) => pickColour ? variant.sizeOnly || variant.size : variant.size;
  const galleryColour = colour || selectedVariant?.colour;
  const gallery = galleryFor(product, galleryColour);
  const summary = priceSummary(shownVariants);
  const price = {
    now: selectedVariant?.price ?? summary.min,
    was: selectedVariant ? selectedVariant.compareAt : summary.compareAt,
    from: !selectedVariant && summary.min !== summary.max,
  };
  const sale = selectedVariant?.flash?.sale || shownVariants.find((variant) => variant.stock > 0 && variant.flash)?.flash?.sale;
  const bag = useAddToBag({
    product,
    selectedVariant,
    image: gallery[0],
    onNeedSize: () => {
      setSizeError((count) => count + 1);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      sizeBlockRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    },
  });

  function selectColour(next) {
    setColour(next);
    setSelectedSize(onlySize(variants.filter((variant) => variant.colour === next)));
    setSizeError(0);
  }

  const productId = product._id || product.id;
  // ViewContent — fires once per product view.
  useEffect(() => {
    track.viewContent({
      customData: {
        value: summary.min,
        currency: "BDT",
        content_type: "product",
        content_ids: [productId],
        content_name: product.name,
        contents: [{ id: productId, quantity: 1, item_price: summary.min }],
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const whatsappNumber =
    settings?.siteInfo?.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
  const whatsappMsg = encodeURIComponent(`Hi, I'm interested in: ${product.name}`);

  const tabs = [
    { key: "details", label: "Details", show: Boolean(product.description) },
    { key: "spec", label: "Material & care", show: Boolean(product.material || product.careInstructions) },
    { key: "delivery", label: "Delivery", show: true },
  ].filter((t) => t.show);

  const activeTab = tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key;

  return (
    <div className="container-custom pb-28 lg:pb-16">
      {/* ── Breadcrumb ──────────────────────────────────────────────────────*/}
      <nav className="scrollbar-hide flex items-center gap-1.5 overflow-x-auto whitespace-nowrap py-4 text-[13px] text-smoke md:py-5 md:text-[13.5px]">
        <Link href="/" className="hover:text-ink transition-colors">Home</Link>
        <ChevronRight size={13} strokeWidth={2.2} className="text-smoke-light" />
        <Link href="/shop" className="hover:text-ink transition-colors">Shop</Link>
        {categoryPath.map((c) => (
          <span key={c._id} className="flex items-center gap-1.5">
            <ChevronRight size={13} strokeWidth={2.2} className="text-smoke-light" />
            <Link href={`/shop?category=${c.slug}`} className="hover:text-ink transition-colors">
              {c.name}
            </Link>
          </span>
        ))}
        <ChevronRight size={13} strokeWidth={2.2} className="text-smoke-light" />
        <span className="text-ink font-medium truncate max-w-[220px]">{product.name}</span>
      </nav>

      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(400px,470px)] lg:gap-12">

        {/* ── Gallery ───────────────────────────────────────────────────────*/}
        <div className="pb-8 lg:pb-0">
          <ImageGallery key={galleryColour || "all"} images={gallery} name={product.name} />
        </div>

        {/* ── Buy panel ─────────────────────────────────────────────────────*/}
        <div className="lg:sticky lg:top-[calc(var(--header-h)+16px)] lg:self-start">
          <div className="rounded-4xl bg-paper-pure p-5 shadow-soft sm:p-8">

            <div className="flex items-center gap-2 flex-wrap">
              {product.category && (
                <Link href={`/shop?category=${product.category.slug}`} className="eyebrow hover:bg-haze-dark transition-colors">
                  {product.category.name}
                </Link>
              )}
              {product.isNewArrival && <span className="badge-new">New</span>}
              {product.featured && <span className="badge-featured bg-ink text-paper-pure inline-flex items-center rounded-full px-3 py-1 text-[11.5px] font-semibold">Pick</span>}
            </div>

            <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] font-bold leading-[1.05] tracking-[-0.035em] text-ink mt-5">
              {product.name}
            </h1>

            <div className="flex items-end justify-between gap-4 mt-4 pb-6 border-b border-haze-dark">
              <p className="text-[30px] font-bold text-ink tabular-nums tracking-[-0.03em] leading-none">
                {price.from ? `From ${formatPrice(price.now)}` : formatPrice(price.now)}
                {price.was > price.now && <WasPrice amount={price.was} className="ml-2 text-[16px]" />}
              </p>
              <p className="text-[13px] text-smoke text-right leading-tight">
                {selectedVariant?.sku ? (
                  <>
                    SKU
                    <br />
                    <span className="text-ink/70 tabular-nums">{selectedVariant.sku}</span>
                  </>
                ) : price.from ? (
                  "Varies by size"
                ) : (
                  "Taxes included"
                )}
              </p>
            </div>

            <div ref={sizeBlockRef} className="mt-6 scroll-mt-[calc(var(--header-h)+24px)]">
              {pickColour && (
                <div className="mb-5">
                  <ColourSelector colours={colours} variants={variants} selected={colour} onChange={selectColour} />
                </div>
              )}
              <VariantSelector
                variants={shownVariants}
                selectedSize={selectedSize}
                labelOf={labelOf}
                error={sizeError}
                onSizeChange={(size) => {
                  setSelectedSize(size);
                  setSizeError(0);
                }}
                hasSizeChart={!!product.sizeChart}
                onSizeGuideClick={() => setShowSizeChart(true)}
              />
            </div>

            <div ref={buyBlockRef} className="mt-6 space-y-3">
              {sale && (
                <Link href={`/flash-sale/${sale.slug}`} className="flex items-center justify-between gap-3 rounded-2xl bg-haze px-4 py-3 text-sm font-semibold text-ink">
                  {sale.title}
                  <CountdownText target={sale.endsAt} />
                </Link>
              )}
              <AddToCartButton selectedVariant={selectedVariant} bag={bag} />
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline w-full"
                >
                  <MessageCircle size={16} strokeWidth={2} />
                  Ask about this piece
                </a>
              )}
            </div>

            {/* Service strip. Three 100px columns on a phone turned every one
                of these into three wrapped lines, so on small screens they run
                as rows and read as sentences instead. */}
            <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {SERVICE.map(({ Icon, label, note }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl bg-haze px-4 py-3 sm:flex-col sm:gap-0 sm:px-3 sm:py-4 sm:text-center"
                >
                  <Icon size={17} strokeWidth={2} className="shrink-0 text-ink sm:mb-2" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-tight text-ink sm:text-[12.5px]">{label}</p>
                    <p className="mt-0.5 text-[12px] leading-tight text-smoke sm:text-[11.5px]">{note}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            {tabs.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors duration-base ease-swift ${
                        activeTab === t.key
                          ? "bg-ink text-paper-pure"
                          : "bg-haze text-smoke hover:text-ink"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="pt-5 text-[15px] leading-[1.75] text-ink/75">
                  {activeTab === "details" && (
                    <p className="whitespace-pre-line">{product.description}</p>
                  )}

                  {activeTab === "spec" && (
                    <dl className="space-y-3">
                      {product.material && (
                        <div>
                          <dt className="text-[13.5px] font-semibold text-ink">Material</dt>
                          <dd className="mt-0.5">{product.material}</dd>
                        </div>
                      )}
                      {product.careInstructions && (
                        <div>
                          <dt className="text-[13.5px] font-semibold text-ink">Care</dt>
                          <dd className="mt-0.5">{product.careInstructions}</dd>
                        </div>
                      )}
                    </dl>
                  )}

                  {activeTab === "delivery" && (
                    <ul className="space-y-2">
                      <li>Dhaka city — 1 to 2 working days.</li>
                      <li>Everywhere else in Bangladesh — 2 to 4 working days.</li>
                      <li>Cash on delivery available on every order.</li>
                      <li>Free delivery once your bag passes Tk 1,500.</li>
                    </ul>
                  )}
                </div>
              </div>
            )}

            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-haze-dark">
                {product.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/shop?search=${encodeURIComponent(tag)}`}
                    className="chip text-[13px] py-1.5 px-3.5"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showSizeChart && product.sizeChart && (
        <SizeChartModal chart={product.sizeChart} onClose={() => setShowSizeChart(false)} />
      )}

      <MobileBuyBar product={product} selectedVariant={selectedVariant} bag={bag} label={labelOf} price={price} watchRef={buyBlockRef} />

      {/* ── Related ─────────────────────────────────────────────────────────*/}
      {related.length > 0 && (
        <section className="pt-14 md:pt-24">
          <SectionHead title="You may also like" href="/shop" linkLabel="All products" />
          <div className="grid grid-cols-2 gap-x-3.5 gap-y-7 sm:gap-x-5 sm:gap-y-10 md:grid-cols-4">
            {related.map((p, i) => (
              <Reveal key={p._id} delay={(i % 4) * 60}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
