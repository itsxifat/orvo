"use client";

import { useState, useEffect } from "react";
import { X, Minus, Plus, ArrowUpRight, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice, cn, shouldUnoptimizeImage } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import toast from "react-hot-toast";

export default function QuickAddModal({ product, onClose, flashPrice = null, flashStock = null }) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Flash sale: a single special price replaces the per-variant price, and the
  // remaining flash allocation caps how many can be added at that price.
  const isFlash = flashPrice != null && flashPrice >= 0;
  const variants = product.variants || [];
  const selectedVariant = variants.find((v) => v.size === selectedSize);
  const unitPrice = isFlash ? flashPrice : selectedVariant?.price;
  const prices = variants.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const hasPriceRange = minPrice !== maxPrice;
  const image = product.images?.[0] || "/placeholder.jpg";

  useEffect(() => {
    const handle = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handle);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Cap quantity by the size's real stock, the flash allocation (if any), and 10.
  const maxQty = selectedVariant
    ? Math.min(selectedVariant.stock, isFlash && flashStock != null ? flashStock : Infinity, 10)
    : 10;

  const handleAdd = () => {
    if (!selectedSize) { toast.error("Pick a size first"); return; }
    if (!selectedVariant || selectedVariant.stock === 0) { toast.error("That size is out of stock"); return; }
    addItem(
      {
        id: product._id,
        slug: product.slug,
        name: product.name,
        image: product.images?.[0],
        price: unitPrice,
        sku: selectedVariant.sku || "",
      },
      selectedSize,
      quantity,
      selectedVariant.stock   // caps the cart line, not just this one add
    );
    toast.success(`${product.name} added to your bag`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-sm" onClick={onClose} />

      {/* A sheet on a phone, a dialog on a desktop. The sheet rises the full
          height of itself rather than fading in place — on a phone the gesture
          the reader expects is something arriving from the bottom edge. */}
      <div
        className="relative w-full animate-sheet-up overflow-hidden rounded-t-4xl bg-paper-pure shadow-pop sm:max-w-[460px] sm:animate-pop sm:rounded-4xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-2.5 z-10 h-1 w-9 -translate-x-1/2 rounded-full bg-ink/15 sm:hidden"
        />

        <button
          onClick={onClose}
          aria-label="Close"
          className="press absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-paper-pure/90 text-ink shadow-soft backdrop-blur transition-colors duration-fast ease-swift hover:bg-haze"
        >
          <X size={18} strokeWidth={2.2} />
        </button>

        <div className="flex gap-4 p-4 pt-5 sm:pt-4">
          <Link
            href={`/shop/${product.slug}`}
            onClick={onClose}
            className="relative w-[104px] aspect-[4/5] rounded-2xl bg-haze overflow-hidden shrink-0"
          >
            <Image
              src={image}
              alt={product.name}
              fill
              unoptimized={shouldUnoptimizeImage(image)}
              className="object-cover"
              sizes="104px"
            />
          </Link>

          <div className="flex-1 min-w-0 pt-1 pr-10">
            <span className={isFlash ? "badge-sale" : "eyebrow"}>
              {isFlash ? "Flash price" : "Quick add"}
            </span>
            <Link href={`/shop/${product.slug}`} onClick={onClose} className="block mt-2.5">
              <h3 className="text-[17px] font-bold text-ink tracking-[-0.025em] leading-snug line-clamp-2 hover:text-signal transition-colors">
                {product.name}
              </h3>
            </Link>
            <p className="mt-1.5 flex items-baseline gap-2">
              {isFlash ? (
                <>
                  <span className="text-[19px] font-bold text-signal tabular-nums tracking-[-0.02em]">
                    {formatPrice(flashPrice)}
                  </span>
                  {minPrice > flashPrice && (
                    <span className="text-[14px] text-smoke line-through tabular-nums">
                      {formatPrice(minPrice)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[19px] font-bold text-ink tabular-nums tracking-[-0.02em]">
                  {selectedVariant
                    ? formatPrice(selectedVariant.price)
                    : hasPriceRange
                    ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
                    : formatPrice(minPrice)}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="px-5 pb-5">
          <p className="text-[14.5px] font-semibold text-ink mb-3">Select size</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const available = v.stock > 0;
              const isSelected = selectedSize === v.size;
              return (
                <button
                  key={v.size}
                  type="button"
                  onClick={() => { if (available) { setSelectedSize(v.size); setQuantity(1); } }}
                  disabled={!available}
                  className={cn(
                    "chip min-w-[58px]",
                    isSelected && "chip-active",
                    !available && "chip-off line-through"
                  )}
                >
                  {v.size}
                </button>
              );
            })}
          </div>

          {selectedVariant && (
            <p className="flex items-center gap-2 mt-3 text-[14px]">
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  selectedVariant.stock === 0
                    ? "bg-smoke"
                    : selectedVariant.stock <= 5
                    ? "bg-signal animate-pulse-dot"
                    : "bg-emerald-500"
                )}
              />
              <span className="text-smoke">
                {selectedVariant.stock === 0
                  ? "Out of stock"
                  : selectedVariant.stock <= 5
                  ? `Only ${selectedVariant.stock} left`
                  : "In stock"}
              </span>
            </p>
          )}

          <div className="flex items-stretch gap-3 mt-5">
            <div className="flex items-center rounded-full bg-haze shrink-0">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="w-11 h-13 py-3.5 flex items-center justify-center text-ink rounded-l-full hover:bg-haze-dark disabled:text-smoke-light disabled:hover:bg-transparent transition-colors"
              >
                <Minus size={14} strokeWidth={2.4} />
              </button>
              <span className="w-7 text-center text-[15px] font-semibold tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={!selectedVariant || quantity >= maxQty}
                aria-label="Increase quantity"
                className="w-11 flex items-center justify-center text-ink rounded-r-full hover:bg-haze-dark disabled:text-smoke-light disabled:hover:bg-transparent transition-colors"
              >
                <Plus size={14} strokeWidth={2.4} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!selectedSize || !selectedVariant || selectedVariant.stock === 0}
              className="btn-base h-full flex-1 gap-2.5 bg-ink px-5 text-[15px] text-paper-pure hover:bg-ink-soft disabled:cursor-not-allowed disabled:bg-haze disabled:text-smoke"
            >
              <ShoppingBag size={16} strokeWidth={2.2} />
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
            href={`/shop/${product.slug}`}
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 mt-3 text-[14px] font-medium text-smoke hover:text-ink transition-colors"
          >
            Full details <ArrowUpRight size={14} strokeWidth={2.2} />
          </Link>
        </div>
      </div>
    </div>
  );
}
