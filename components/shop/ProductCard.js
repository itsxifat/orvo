"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Zap } from "lucide-react";
import { formatPrice, shouldUnoptimizeImage, PLACEHOLDER_IMAGE } from "@/lib/utils";
import QuickAddModal from "@/components/shop/QuickAddModal";
import WasPrice from "@/components/ui/WasPrice";

/* A product card from the ERP's list (lib/storefront-map.js → mapCard): what a
   shopper pays now (`minPrice`, a live flash price included), the regular or
   shelf price struck through under it (`compareAt`), the sizes and whether any
   size is in stock. `product.flash` marks a product a live flash sale covers
   (the zap badge). Quick add loads the sizes with their stock and prices when
   it opens.

   The card is deliberately quiet on hover: the frame rises a few pixels, the
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

  const isOutOfStock = !product.inStock;
  const flash = product.flash || null;
  const minPrice = product.minPrice;
  const compareAt = product.compareAt > minPrice ? product.compareAt : null;
  const discount = compareAt ? product.discount || 0 : 0;
  const hasPriceRange = product.minPrice !== product.maxPrice;
  const reduced = !!compareAt || !!flash;

  const mainImage = product.images?.[0] || PLACEHOLDER_IMAGE;
  const hoverImage = product.images?.[1];
  const sizeList = product.sizes || [];
  const imageSizes = sizes || "(max-width: 640px) 46vw, (max-width: 1024px) 33vw, 25vw";

  return (
    <>
      <div className="group flex h-full flex-col" data-testid="product-card">
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

          <Link href={`/shop/${product.slug}`} className="absolute inset-0 z-10" tabIndex={-1} aria-hidden>
            <span className="sr-only">{product.name}</span>
          </Link>

          {/* Status pills */}
          <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex flex-wrap gap-1.5 sm:left-3 sm:top-3">
            {isOutOfStock ? (
              <span className="badge-out">Sold out</span>
            ) : (
              <>
                {flash ? (
                  <span className="badge-sale gap-1">
                    <Zap size={11} strokeWidth={2.6} className="fill-current" aria-hidden />
                    {discount > 0 ? `-${discount}%` : "Flash price"}
                  </span>
                ) : (
                  discount > 0 && <span className="badge-sale">-{discount}%</span>
                )}
                {product.isNewArrival && <span className="badge-new">New</span>}
              </>
            )}
          </div>

          {/* Quick add — always present on touch, fades in on a mouse. The sizes
              are read from the ERP when it opens. */}
          {!isOutOfStock && (
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
            <p className="flex flex-wrap items-baseline gap-x-2 sm:shrink-0 sm:flex-col sm:items-end sm:gap-0">
              <span
                data-testid="price-now"
                className={`whitespace-nowrap text-[14px] font-semibold tabular-nums sm:text-[15.5px] ${reduced ? "text-signal" : "text-ink"}`}
              >
                {hasPriceRange ? `${formatPrice(minPrice)}+` : formatPrice(minPrice)}
              </span>
              {compareAt && <WasPrice amount={compareAt} className="whitespace-nowrap text-[12px] sm:text-[12.5px]" />}
            </p>
          </div>

          <div className="mt-1 flex items-center justify-between gap-3">
            {product.category?.name && (
              <p className="truncate text-[12px] text-smoke sm:text-[13px]">{product.category.name}</p>
            )}
            {!isOutOfStock && sizeList.length > 0 && (
              <p className="shrink-0 text-[12px] text-smoke sm:text-[13px]">
                {sizeList.length === 1 ? sizeList[0] : `${sizeList.length} sizes`}
              </p>
            )}
          </div>
        </Link>
      </div>

      {showModal && <QuickAddModal product={product} onClose={() => setShowModal(false)} />}
    </>
  );
}
