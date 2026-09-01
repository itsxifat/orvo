"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useAddToBag } from "@/components/product/useAddToBag";

// A rounded stepper beside a full pill button.
export default function AddToCartButton({ product, selectedSize, selectedVariant }) {
  const [quantity, setQuantity] = useState(1);
  const addToBag = useAddToBag({ product, selectedSize, selectedVariant });

  const isAvailable = selectedVariant && selectedVariant.stock > 0;
  const maxQty = Math.min(selectedVariant?.stock || 1, 10);
  const lineTotal = isAvailable ? selectedVariant.price * quantity : 0;

  const handleAdd = () => addToBag(quantity);

  const label = !selectedSize ? "Select a size" : isAvailable ? "Add to bag" : "Out of stock";

  return (
    <div className="flex items-stretch gap-3">
      <div className="flex items-center rounded-full bg-haze shrink-0">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1}
          aria-label="Decrease quantity"
          className="flex h-14 w-12 items-center justify-center rounded-l-full text-ink transition-colors duration-fast ease-swift hover:bg-haze-dark active:bg-haze-dark disabled:text-smoke-light disabled:hover:bg-transparent"
        >
          <Minus size={15} strokeWidth={2.4} />
        </button>
        <span className="w-8 text-center text-[16px] font-semibold tabular-nums">{quantity}</span>
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
          disabled={quantity >= maxQty}
          aria-label="Increase quantity"
          className="flex h-14 w-12 items-center justify-center rounded-r-full text-ink transition-colors duration-fast ease-swift hover:bg-haze-dark active:bg-haze-dark disabled:text-smoke-light disabled:hover:bg-transparent"
        >
          <Plus size={15} strokeWidth={2.4} />
        </button>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!!selectedSize && !isAvailable}
        className="btn-base h-14 flex-1 gap-3 bg-ink px-6 text-[15px] text-paper-pure shadow-soft hover:bg-ink-soft hover:shadow-lift disabled:cursor-not-allowed disabled:bg-haze disabled:text-smoke disabled:shadow-none"
      >
        <ShoppingBag size={17} strokeWidth={2.2} />
        {label}
        {lineTotal > 0 && <span className="tabular-nums opacity-70">· {formatPrice(lineTotal)}</span>}
      </button>
    </div>
  );
}
