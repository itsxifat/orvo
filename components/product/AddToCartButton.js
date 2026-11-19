"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/utils";

// A rounded stepper beside a full pill button. `bag` is the page's
// useAddToBag (components/product/useAddToBag.js), shared with the phone's buy
// bar so both add the same quantity of the same size.
export default function AddToCartButton({ bag, selectedVariant }) {
  const soldOut = !!selectedVariant && !bag.isAvailable;
  const lineTotal = bag.isAvailable ? selectedVariant.price * bag.quantity : 0;
  const label = !selectedVariant ? "Select a size" : soldOut ? "Out of stock" : "Add to bag";

  return (
    <div className="flex items-stretch gap-3">
      <div className="flex items-center rounded-full bg-haze shrink-0" role="group" aria-label="Quantity">
        <button
          type="button"
          onClick={() => bag.setQuantity((q) => Math.max(1, q - 1))}
          disabled={bag.quantity <= 1}
          aria-label="Decrease quantity"
          className="flex h-14 w-12 items-center justify-center rounded-l-full text-ink transition-colors duration-fast ease-swift hover:bg-haze-dark active:bg-haze-dark disabled:text-smoke-light disabled:hover:bg-transparent"
        >
          <Minus size={15} strokeWidth={2.4} />
        </button>
        <span className="w-8 text-center text-[16px] font-semibold tabular-nums" aria-live="polite">
          {bag.quantity}
        </span>
        <button
          type="button"
          onClick={() => bag.setQuantity((q) => Math.min(bag.maxQty, q + 1))}
          disabled={bag.quantity >= bag.maxQty}
          aria-label="Increase quantity"
          className="flex h-14 w-12 items-center justify-center rounded-r-full text-ink transition-colors duration-fast ease-swift hover:bg-haze-dark active:bg-haze-dark disabled:text-smoke-light disabled:hover:bg-transparent"
        >
          <Plus size={15} strokeWidth={2.4} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => bag.add()}
        disabled={soldOut}
        className="btn-base h-14 min-w-0 flex-1 gap-3 bg-ink px-6 text-[15px] text-paper-pure shadow-soft hover:bg-ink-soft hover:shadow-lift disabled:cursor-not-allowed disabled:bg-haze disabled:text-smoke disabled:shadow-none"
      >
        <ShoppingBag size={17} strokeWidth={2.2} aria-hidden />
        {label}
        {lineTotal > 0 && <span className="tabular-nums opacity-70">· {formatPrice(lineTotal)}</span>}
      </button>
    </div>
  );
}
