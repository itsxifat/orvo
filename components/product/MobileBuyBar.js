"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import WasPrice from "@/components/ui/WasPrice";

/* The buy bar that follows you up a product page on a phone.

   On a desktop the buy panel is pinned beside the photograph, so the price and
   the button are never more than a glance away. On a phone that panel is a
   long way down a long page, and once you have scrolled past it to read the
   fabric notes there is nothing left to act on.

   So the bar appears once the real button has scrolled away above the header,
   and disappears again when it comes back — no duplicate controls competing
   for attention while both are visible. It rides above the home indicator via
   the safe-area inset, and it never covers the last of the page because the
   page reserves room for it. While it shows, `data-buybar` on <body> moves the
   WhatsApp button up out of its way (components/ui/WhatsAppButton.js).

   `bag` is the page's useAddToBag, shared with the panel's button: the bar adds
   the quantity chosen there. `price` is what the panel shows now: { now, was,
   from } (the chosen size's, else the lowest of the sizes shown). */
export default function MobileBuyBar({ product, bag, selectedVariant, label, price, watchRef }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = watchRef?.current;
    if (!target || typeof IntersectionObserver === "undefined") return undefined;

    // The top of the screen is under the fixed header: a button behind it is
    // out of sight. Only a button that has gone up past it brings the bar.
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 120),
      { rootMargin: "-72px 0px 0px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchRef]);

  // Only on a phone-width screen, where the bar is drawn (it is lg:hidden).
  useEffect(() => {
    const narrow = typeof window !== "undefined" && window.matchMedia?.("(max-width: 1023px)").matches;
    document.body.toggleAttribute("data-buybar", visible && !!narrow);
    return () => document.body.removeAttribute("data-buybar");
  }, [visible]);

  const variants = product.variants || [];
  const soldOut = variants.length > 0 && variants.every((v) => (v.stock || 0) <= 0);
  const reduced = price.was > price.now;

  const text = soldOut
    ? "Sold out"
    : !selectedVariant
    ? "Choose size"
    : bag.isAvailable
    ? "Add to bag"
    : "Out of stock";

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-haze-dark bg-paper-pure/92 backdrop-blur-xl transition-[transform,visibility] duration-slow ease-soft lg:hidden ${
        visible ? "visible translate-y-0" : "invisible pointer-events-none translate-y-full"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-smoke">
            {selectedVariant ? `Size ${label(selectedVariant)}` : product.name}
          </p>
          <p className="flex items-baseline gap-2">
            <span
              className={`text-[19px] font-bold leading-tight tracking-[-0.03em] tabular-nums ${reduced ? "text-signal" : "text-ink"}`}
            >
              {price.from ? `From ${formatPrice(price.now)}` : formatPrice(price.now)}
            </span>
            {reduced && <WasPrice amount={price.was} className="text-[13px]" />}
          </p>
        </div>

        <button
          type="button"
          onClick={() => bag.add()}
          disabled={soldOut || (!!selectedVariant && !bag.isAvailable)}
          tabIndex={visible ? 0 : -1}
          className="btn-base h-12 shrink-0 gap-2 bg-ink px-6 text-paper-pure shadow-soft disabled:bg-haze disabled:text-smoke disabled:shadow-none"
        >
          <ShoppingBag size={16} strokeWidth={2.2} aria-hidden />
          {text}
        </button>
      </div>
    </div>
  );
}
