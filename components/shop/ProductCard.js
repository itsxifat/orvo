"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { formatPrice, shouldUnoptimizeImage } from "@/lib/utils";
import QuickAddModal from "@/components/shop/QuickAddModal";

// A soft, rounded tile that lifts on hover. The image sits in its own rounded
// frame with the status pill and quick-add button floating over it; the meta
// below stays quiet so the photograph carries the card.

export default function ProductCard({ product }) {
  const [showModal, setShowModal] = useState(false);

  const variants = product.variants || [];
  const totalStock = variants.reduce((s, v) => s + (v.stock || 0), 0);
  const isOutOfStock = totalStock === 0;
  const prices = variants.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const hasPriceRange = minPrice !== maxPrice;
  const lowStock = !isOutOfStock && totalStock <= 5;

  const mainImage = product.images?.[0] || "/placeholder.jpg";
  const hoverImage = product.images?.[1];
  const availableSizes = variants.filter((v) => v.stock > 0);

  return (
    <>
      <div className="group flex flex-col h-full">
        {/* ── Image frame ─────────────────────────────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden bg-haze aspect-[4/5] transition-shadow duration-300 group-hover:shadow-lift">
          <Image
            src={mainImage}
            alt={product.name}
            fill
            unoptimized={shouldUnoptimizeImage(mainImage)}
            className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-[1.06]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {hoverImage && (
            <Image
              src={hoverImage}
              alt=""
              fill
              unoptimized={shouldUnoptimizeImage(hoverImage)}
              className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}

          <Link href={`/shop/${product.slug}`} className="absolute inset-0 z-10">
            <span className="sr-only">{product.name}</span>
          </Link>

          {/* Status pill */}
          <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5 pointer-events-none">
            {isOutOfStock ? (
              <span className="badge-out">Sold out</span>
            ) : (
              <>
                {product.isNewArrival && <span className="badge-new">New</span>}
                {lowStock && <span className="badge-sale">Only {totalStock} left</span>}
              </>
            )}
          </div>

          {/* Quick add */}
          {!isOutOfStock && variants.length > 0 && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              aria-label={`Quick add ${product.name}`}
              className="absolute bottom-3 right-3 z-20 w-11 h-11 rounded-full bg-paper-pure text-ink shadow-soft flex items-center justify-center transition-all duration-300 hover:bg-beam hover:scale-105
                         opacity-100 translate-y-0 md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0 focus-visible:opacity-100 focus-visible:translate-y-0"
            >
              <Plus size={19} strokeWidth={2.4} />
            </button>
          )}
        </div>

        {/* ── Meta ────────────────────────────────────────────────────────── */}
        <Link href={`/shop/${product.slug}`} className="block pt-4 px-0.5 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[15.5px] font-semibold text-ink leading-snug tracking-[-0.015em] line-clamp-1">
              {product.name}
            </h3>
            <p className="text-[15.5px] font-semibold text-ink tabular-nums whitespace-nowrap shrink-0">
              {hasPriceRange ? `${formatPrice(minPrice)}+` : formatPrice(minPrice)}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 mt-1">
            {product.category?.name && (
              <p className="text-[13px] text-smoke truncate">{product.category.name}</p>
            )}
            {availableSizes.length > 0 && (
              <p className="text-[13px] text-smoke shrink-0">
                {availableSizes.length === 1
                  ? availableSizes[0].size
                  : `${availableSizes.length} sizes`}
              </p>
            )}
          </div>
        </Link>
      </div>

      {showModal && <QuickAddModal product={product} onClose={() => setShowModal(false)} />}
    </>
  );
}
