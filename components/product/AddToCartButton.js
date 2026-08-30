"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

// A rounded stepper beside a full pill button.
export default function AddToCartButton({ product, selectedSize, selectedVariant }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const isAvailable = selectedVariant && selectedVariant.stock > 0;
  const maxQty = Math.min(selectedVariant?.stock || 1, 10);
  const lineTotal = isAvailable ? selectedVariant.price * quantity : 0;

  const handleAdd = () => {
    if (!selectedSize) {
      toast.error("Pick a size first");
      return;
    }
    if (!isAvailable) {
      toast.error("That size is out of stock");
      return;
    }
    addItem(
      {
        id: product._id,
        slug: product.slug,
        name: product.name,
        image: product.images?.[0],
        price: selectedVariant.price,
        sku: selectedVariant.sku || "",
      },
      selectedSize,
      quantity
    );
    toast.success(`${product.name} added to your bag`);
  };

  const label = !selectedSize ? "Select a size" : isAvailable ? "Add to bag" : "Out of stock";

  return (
    <div className="flex items-stretch gap-3">
      <div className="flex items-center rounded-full bg-haze shrink-0">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1}
          aria-label="Decrease quantity"
          className="w-12 h-14 flex items-center justify-center text-ink rounded-l-full hover:bg-haze-dark disabled:text-smoke-light disabled:hover:bg-transparent transition-colors"
        >
          <Minus size={15} strokeWidth={2.4} />
        </button>
        <span className="w-8 text-center text-[16px] font-semibold tabular-nums">{quantity}</span>
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
          disabled={quantity >= maxQty}
          aria-label="Increase quantity"
          className="w-12 h-14 flex items-center justify-center text-ink rounded-r-full hover:bg-haze-dark disabled:text-smoke-light disabled:hover:bg-transparent transition-colors"
        >
          <Plus size={15} strokeWidth={2.4} />
        </button>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!!selectedSize && !isAvailable}
        className="flex-1 h-14 px-6 rounded-full bg-ink text-paper-pure flex items-center justify-center gap-3 text-[15px] font-semibold tracking-[-0.01em] shadow-soft hover:bg-ink-soft hover:shadow-lift active:scale-[0.99] disabled:bg-haze disabled:text-smoke disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200"
      >
        <ShoppingBag size={17} strokeWidth={2.2} />
        {label}
        {lineTotal > 0 && <span className="tabular-nums opacity-70">· {formatPrice(lineTotal)}</span>}
      </button>
    </div>
  );
}
