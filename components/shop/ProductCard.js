"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { formatPrice, shouldUnoptimizeImage } from "@/lib/utils";
import QuickAddModal from "@/components/shop/QuickAddModal";

/* The card is deliberately quiet on hover: the frame rises a few pixels, the
   photo settles into a slightly closer crop, and the second shot crossfades in.
   Three things, one duration, one curve.

   Everything that moves is INSIDE the hovered box. The <div class="group"> that
   owns the hover state never changes size, so the pointer can rest anywhere on
   the card — including its edges — without the card shifting out from under it
   and flickering between states.

   On a touch screen none of it applies. `can-hover:` gates the reveal so the
   quick-add button is simply always there on a phone or a tablet. */

export default function ProductCard({ product, priority = false, sizes }) {
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
  const imageSizes = sizes || "(max-width: 640px) 46vw, (max-width: 1024px) 33vw, 25vw";

  return (
    <>
      <div className="group flex h-full flex-col">
        {/* ── Image frame ─────────────────────────────────────────────────── */}
        <div className="media-lift relative aspect-[4/5] overflow-hidden rounded-[22px] bg-haze sm:rounded-3xl">
          <Image
            src={mainImage}
            alt={product.name}
            fill
            priority={priority}
            unoptimized={shouldUnoptimizeImage(mainImage)}
            className="media-zoom object-cover"
            sizes={imageSizes}
          />
          {hoverImage && (
            <Image
              src={hoverImage}
              alt=""
              fill
              unoptimized={shouldUnoptimizeImage(hoverImage)}
              className="media-zoom object-cover opacity-0 transition-opacity duration-slow ease-swift can-hover:group-hover:opacity-100"
              sizes={imageSizes}
            />
          )}

          <Link href={`/shop/${product.slug}`} className="absolute inset-0 z-10">
            <span className="sr-only">{product.name}</span>
          </Link>

          {/* Status pill */}
          <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex flex-wrap gap-1.5 sm:left-3 sm:top-3">
            {isOutOfStock ? (
              <span className="badge-out">Sold out</span>
            ) : (
              <>
                {product.isNewArrival && <span className="badge-new">New</span>}
                {lowStock && <span className="badge-sale">Only {totalStock} left</span>}
              </>
            )}
          </div>

          {/* Quick add — always present on touch, fades in on a mouse. */}
          {!isOutOfStock && variants.length > 0 && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              aria-label={`Quick add ${product.name}`}
              className="absolute bottom-2.5 right-2.5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-paper-pure text-ink shadow-soft transition-[opacity,transform,background-color] duration-base ease-swift hover:bg-beam active:scale-95 sm:bottom-3 sm:right-3 sm:h-11 sm:w-11
                         can-hover:opacity-0 can-hover:group-hover:opacity-100 can-hover:focus-visible:opacity-100"
            >
              <Plus size={18} strokeWidth={2.4} />
            </button>
          )}
        </div>

        {/* ── Meta ────────────────────────────────────────────────────────── */}
        <Link href={`/shop/${product.slug}`} className="block flex-1 px-0.5 pt-3 sm:pt-4">
          {/* Two columns of cards on a phone leaves a name about 90px of room
              once the price has taken its half of the row, which turned most of
              the catalogue into "Chambray…". On a narrow screen the price drops
              to its own line and the name gets the full width and two lines of
              it; from `sm` there is room for them to share a row again. */}
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug tracking-[-0.015em] text-ink sm:line-clamp-1 sm:text-[15.5px]">
              {product.name}
            </h3>
            <p className="text-[14px] font-semibold tabular-nums text-ink sm:shrink-0 sm:whitespace-nowrap sm:text-[15.5px]">
              {hasPriceRange ? `${formatPrice(minPrice)}+` : formatPrice(minPrice)}
            </p>
          </div>

          <div className="mt-1 flex items-center justify-between gap-3">
            {product.category?.name && (
              <p className="truncate text-[12px] text-smoke sm:text-[13px]">{product.category.name}</p>
            )}
            {availableSizes.length > 0 && (
              <p className="shrink-0 text-[12px] text-smoke sm:text-[13px]">
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
