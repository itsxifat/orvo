"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useAddToBag } from "@/components/product/useAddToBag";

/* The buy bar that follows you up a product page on a phone.

   On a desktop the buy panel is pinned beside the photograph, so the price and
   the button are never more than a glance away. On a phone that panel is a
   long way down a long page, and once you have scrolled past it to read the
   fabric notes there is nothing left to act on.

   So the bar appears exactly when the real button leaves the screen, and
   disappears again when it comes back — no duplicate controls competing for
   attention while both are visible. It rides above the home indicator via the
   safe-area inset, and it never covers the last of the page because the page
   reserves room for it. */
export default function MobileBuyBar({
  product,
  selectedSize,
  selectedVariant,
  watchRef,
  onNeedSize,
}) {
  const [visible, setVisible] = useState(false);
  const addToBag = useAddToBag({ product, selectedSize, selectedVariant });
  const barRef = useRef(null);

  useEffect(() => {
    const target = watchRef?.current;
    if (!target || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: "-72px 0px 0px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchRef]);

  const variants = product.variants || [];
  const prices = variants.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const soldOut = variants.every((v) => (v.stock || 0) <= 0);
  const price = selectedVariant ? selectedVariant.price : minPrice;
  const hasRange = prices.length > 1 && Math.min(...prices) !== Math.max(...prices);

  const label = soldOut
    ? "Sold out"
    : !selectedSize
    ? "Choose size"
    : selectedVariant?.stock > 0
    ? "Add to bag"
    : "Out of stock";

  const handleTap = () => {
    if (soldOut) return;
    // No size yet: take them to the sizes rather than scolding them with a
    // toast about a control they cannot see.
    if (!selectedSize) {
      onNeedSize?.();
      return;
    }
    addToBag(1);
  };

  return (
    <div
      ref={barRef}
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-haze-dark bg-paper-pure/92 backdrop-blur-xl transition-transform duration-slow ease-soft lg:hidden ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-smoke">
            {selectedSize ? `Size ${selectedSize}` : product.name}
          </p>
          <p className="text-[19px] font-bold leading-tight tracking-[-0.03em] tabular-nums text-ink">
            {hasRange && !selectedVariant ? `From ${formatPrice(minPrice)}` : formatPrice(price)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleTap}
          disabled={soldOut}
          className="btn-base h-12 shrink-0 gap-2 bg-ink px-6 text-paper-pure shadow-soft disabled:bg-haze disabled:text-smoke disabled:shadow-none"
        >
          <ShoppingBag size={16} strokeWidth={2.2} />
          {label}
        </button>
      </div>
    </div>
  );
}
