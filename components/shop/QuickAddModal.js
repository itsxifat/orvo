"use client";

import { useState, useEffect } from "react";
import { X, Minus, Plus, ArrowUpRight, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice, cn, shouldUnoptimizeImage, PLACEHOLDER_IMAGE } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import Spinner from "@/components/ui/Spinner";
import WasPrice from "@/components/ui/WasPrice";
import VariantSelector from "@/components/product/VariantSelector";
import { priceSummary } from "@/lib/storefront-map";
import toast from "react-hot-toast";

// Buy a product without leaving the page. A card or a flash deal only knows a
// product's name and price range, so the sizes — each with its live stock, its
// price now, its regular price struck through and any flash offer — are read
// from the shop when the modal opens (GET /api/products/<slug>, from the ERP).
export default function QuickAddModal({ product: summary, onClose }) {
  const { addItem } = useCart();
  const [product, setProduct] = useState(summary?.variants ? summary : null);
  const [failed, setFailed] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(0);

  useEffect(() => {
    if (product) return;
    let active = true;
    fetch(`/api/products/${encodeURIComponent(summary.slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((data) => { if (active) setProduct(data.product); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [product, summary.slug]);

  useEffect(() => {
    const handle = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handle);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const dealFor = (v) => (v?.flash && v.flash.remaining > 0 ? v.flash : null);

  const variants = product?.variants || [];
  const selectedVariant = variants.find((v) => v.size === selectedSize);
  const selectedDeal = dealFor(selectedVariant);
  const unitPrice = selectedVariant?.price;
  const summaryPrices = priceSummary(variants);
  const minPrice = variants.length ? summaryPrices.min : summary.minPrice ?? 0;
  const maxPrice = variants.length ? summaryPrices.max : summary.maxPrice ?? 0;
  const lowestWas = variants.length ? summaryPrices.compareAt : summary.compareAt ?? null;
  const hasDeals = variants.some((v) => dealFor(v));
  const image = summary.images?.[0] || product?.images?.[0] || PLACEHOLDER_IMAGE;

  // A flash line can only hold what the deal has left — past that the line
  // would be charged the normal price at checkout.
  const lineCap = selectedVariant
    ? Math.min(selectedVariant.stock, selectedDeal ? selectedDeal.remaining : Infinity)
    : 0;
  const maxQty = selectedVariant ? Math.max(1, Math.min(lineCap, 10)) : 10;

  const handleAdd = () => {
    if (!selectedSize) { setSizeError((n) => n + 1); return; }
    if (!selectedVariant || selectedVariant.stock === 0) { toast.error("That size is out of stock"); return; }
    // Opens the bag drawer, which is the confirmation.
    addItem(
      {
        id: product._id,
        skuId: selectedVariant.skuId,
        slug: product.slug,
        name: product.name,
        image,
        price: unitPrice,
        regularPrice: selectedVariant.compareAt ?? undefined,
        sku: selectedVariant.sku || "",
      },
      selectedSize,
      Math.min(quantity, maxQty),
      lineCap // caps the cart line, not just this one add
    );
    onClose();
  };

  const shownWas = selectedVariant ? selectedVariant.compareAt : lowestWas;
  const reduced = selectedVariant ? selectedVariant.compareAt > unitPrice : !!lowestWas;

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-sm" onClick={onClose} aria-hidden />

      {/* A sheet on a phone, a dialog on a desktop. The sheet rises the full
          height of itself rather than fading in place — on a phone the gesture
          the reader expects is something arriving from the bottom edge. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={summary.name}
        className="relative max-h-[92vh] w-full animate-sheet-up overflow-y-auto rounded-t-4xl bg-paper-pure shadow-pop supports-[height:100dvh]:max-h-[92dvh] sm:max-w-[460px] sm:animate-pop sm:rounded-4xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-2.5 z-10 h-1 w-9 -translate-x-1/2 rounded-full bg-ink/15 sm:hidden"
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="press absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-paper-pure/90 text-ink shadow-soft backdrop-blur transition-colors duration-fast ease-swift hover:bg-haze"
        >
          <X size={18} strokeWidth={2.2} />
        </button>

        <div className="flex gap-4 p-4 pt-5 sm:pt-4">
          <Link
            href={`/shop/${summary.slug}`}
            onClick={onClose}
            className="relative w-[104px] aspect-[4/5] rounded-2xl bg-haze overflow-hidden shrink-0"
          >
            <Image
              src={image}
              alt={summary.name}
              fill
              unoptimized={shouldUnoptimizeImage(image)}
              className="object-cover"
              sizes="104px"
            />
          </Link>

          <div className="flex-1 min-w-0 pt-1 pr-10">
            <span className={hasDeals ? "badge-sale" : "eyebrow"}>
              {hasDeals ? "Flash price" : "Quick add"}
            </span>
            <Link href={`/shop/${summary.slug}`} onClick={onClose} className="block mt-2.5">
              <h3 className="text-[17px] font-bold text-ink tracking-[-0.025em] leading-snug line-clamp-2 hover:text-signal transition-colors">
                {summary.name}
              </h3>
            </Link>
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className={cn("text-[19px] font-bold tabular-nums tracking-[-0.02em]", reduced ? "text-signal" : "text-ink")}>
                {selectedVariant
                  ? formatPrice(unitPrice)
                  : minPrice !== maxPrice && !lowestWas
                  ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
                  : `${minPrice !== maxPrice ? "From " : ""}${formatPrice(minPrice)}`}
              </span>
              <WasPrice amount={shownWas} className="text-[14px]" />
            </p>
          </div>
        </div>

        {!product ? (
          <div className="flex justify-center px-5 pb-10 pt-6">
            {failed ? (
              <p className="text-[14px] text-smoke">This product is not available right now.</p>
            ) : (
              <Spinner size="md" />
            )}
          </div>
        ) : (
          <div className="px-5 pb-5">
            <VariantSelector
              variants={variants}
              selectedSize={selectedSize}
              onSizeChange={(size) => { setSelectedSize(size); setQuantity(1); setSizeError(0); }}
              error={sizeError}
            />

            <div className="flex items-stretch gap-3 mt-5">
              <div className="flex items-center rounded-full bg-haze shrink-0" role="group" aria-label="Quantity">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="flex h-[52px] w-11 items-center justify-center text-ink rounded-l-full hover:bg-haze-dark disabled:text-smoke-light disabled:hover:bg-transparent transition-colors"
                >
                  <Minus size={14} strokeWidth={2.4} />
                </button>
                <span className="w-7 text-center text-[15px] font-semibold tabular-nums" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={!selectedVariant || quantity >= maxQty}
                  aria-label="Increase quantity"
                  className="flex h-[52px] w-11 items-center justify-center text-ink rounded-r-full hover:bg-haze-dark disabled:text-smoke-light disabled:hover:bg-transparent transition-colors"
                >
                  <Plus size={14} strokeWidth={2.4} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={!!selectedVariant && selectedVariant.stock === 0}
                className="btn-base min-w-0 flex-1 gap-2.5 bg-ink px-5 text-[15px] text-paper-pure hover:bg-ink-soft disabled:cursor-not-allowed disabled:bg-haze disabled:text-smoke"
              >
                <ShoppingBag size={16} strokeWidth={2.2} aria-hidden />
                {!selectedSize
                  ? "Pick a size"
                  : selectedVariant?.stock === 0
                  ? "Sold out"
                  : "Add to bag"}
                {selectedVariant && selectedVariant.stock > 0 && (
                  <span className="tabular-nums opacity-70">· {formatPrice(unitPrice * quantity)}</span>
                )}
              </button>
            </div>

            <Link
              href={`/shop/${summary.slug}`}
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 mt-3 min-h-11 text-[14px] font-medium text-smoke hover:text-ink transition-colors"
            >
              Full details <ArrowUpRight size={14} strokeWidth={2.2} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
