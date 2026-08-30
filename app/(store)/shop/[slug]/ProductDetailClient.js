"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, MessageCircle, ChevronRight, Truck, RefreshCw, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import ImageGallery from "@/components/product/ImageGallery";
import VariantSelector from "@/components/product/VariantSelector";
import AddToCartButton from "@/components/product/AddToCartButton";
import ProductCard from "@/components/shop/ProductCard";
import SectionHead from "@/components/home/SectionHead";
import { track } from "@/lib/tracking/client";
import { useSettings } from "@/context/SettingsContext";

const SERVICE = [
  { Icon: Truck, label: "Ships in 24h", note: "2–4 days nationwide" },
  { Icon: RefreshCw, label: "7-day exchange", note: "Size swaps are free" },
  { Icon: ShieldCheck, label: "Checked twice", note: "Before it leaves us" },
];

function SizeChartModal({ chart, onClose }) {
  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[86vh] rounded-t-4xl sm:rounded-4xl bg-paper-pure shadow-pop flex flex-col animate-slide-up sm:animate-none overflow-hidden">
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 shrink-0">
          <div>
            <p className="text-[19px] font-bold text-ink tracking-[-0.03em]">{chart.name}</p>
            <p className="text-[13.5px] text-smoke mt-0.5">Measurements in inches unless stated</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 -mr-1 rounded-full bg-haze hover:bg-haze-dark flex items-center justify-center text-ink transition-colors"
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

export default function ProductDetailClient({ product, related = [], categoryPath = [] }) {
  const { settings } = useSettings();
  const [selectedSize, setSelectedSize] = useState("");
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [tab, setTab] = useState("details");

  const variants = product.variants || [];
  const selectedVariant = variants.find((v) => v.size === selectedSize);
  const prices = variants.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const hasPriceRange = minPrice !== maxPrice;
  const displayPrice = selectedVariant ? selectedVariant.price : minPrice;

  const productId = product._id || product.id;
  // ViewContent — fires once per product view.
  useEffect(() => {
    track.viewContent({
      customData: {
        value: minPrice,
        currency: "BDT",
        content_type: "product",
        content_ids: [productId],
        content_name: product.name,
        contents: [{ id: productId, quantity: 1, item_price: minPrice }],
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const whatsappNumber =
    settings?.siteInfo?.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "8801700000000";
  const whatsappMsg = encodeURIComponent(`Hi, I'm interested in: ${product.name}`);

  const tabs = [
    { key: "details", label: "Details", show: Boolean(product.description) },
    { key: "spec", label: "Material & care", show: Boolean(product.material || product.careInstructions) },
    { key: "delivery", label: "Delivery", show: true },
  ].filter((t) => t.show);

  const activeTab = tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key;

  return (
    <div className="container-custom pb-16">
      {/* ── Breadcrumb ──────────────────────────────────────────────────────*/}
      <nav className="flex items-center gap-1.5 py-5 overflow-x-auto text-[13.5px] text-smoke whitespace-nowrap">
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

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(380px,450px)] lg:gap-12">

        {/* ── Gallery ───────────────────────────────────────────────────────*/}
        <div className="pb-8 lg:pb-0">
          <ImageGallery images={product.images} name={product.name} />
        </div>

        {/* ── Buy panel ─────────────────────────────────────────────────────*/}
        <div className="lg:sticky lg:top-[calc(var(--header-h)+16px)] lg:self-start">
          <div className="rounded-4xl bg-paper-pure shadow-soft p-6 sm:p-8">

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
                {hasPriceRange && !selectedVariant
                  ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
                  : formatPrice(displayPrice)}
              </p>
              <p className="text-[13px] text-smoke text-right leading-tight">
                {selectedVariant?.sku ? (
                  <>
                    SKU
                    <br />
                    <span className="text-ink/70 tabular-nums">{selectedVariant.sku}</span>
                  </>
                ) : hasPriceRange ? (
                  "Varies by size"
                ) : (
                  "Taxes included"
                )}
              </p>
            </div>

            <div className="mt-6">
              <VariantSelector
                variants={variants}
                selectedSize={selectedSize}
                onSizeChange={setSelectedSize}
                hasSizeChart={!!product.sizeChart}
                onSizeGuideClick={() => setShowSizeChart(true)}
              />
            </div>

            <div className="mt-6 space-y-3">
              <AddToCartButton
                product={product}
                selectedSize={selectedSize}
                selectedVariant={selectedVariant}
              />
              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline w-full"
              >
                <MessageCircle size={16} strokeWidth={2} />
                Ask about this piece
              </a>
            </div>

            {/* Service strip */}
            <div className="grid grid-cols-3 gap-2 mt-7">
              {SERVICE.map(({ Icon, label, note }) => (
                <div key={label} className="rounded-2xl bg-haze px-3 py-4 text-center">
                  <Icon size={17} strokeWidth={2} className="text-ink mx-auto mb-2" />
                  <p className="text-[12.5px] font-semibold text-ink leading-tight">{label}</p>
                  <p className="text-[11.5px] text-smoke mt-0.5 leading-tight">{note}</p>
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
                      className={`rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors ${
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

      {/* ── Related ─────────────────────────────────────────────────────────*/}
      {related.length > 0 && (
        <section className="pt-16 md:pt-24">
          <SectionHead eyebrow="Also in this line" title="You may also like" href="/shop" linkLabel="All products" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-10">
            {related.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
