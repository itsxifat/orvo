"use client";

import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { formatPrice, shouldUnoptimizeImage, cn, PLACEHOLDER_IMAGE } from "@/lib/utils";

// Why a card can't be bought from, when it can't: a sneak peek of a sale that
// has not started, a sale that has just ended, or a staff preview of a draft.
const CLOSED = {
  upcoming: "Coming soon",
  ended: "Sale ended",
  preview: "Preview only",
};

// The two grounds a card sits on: the paper of the flash-sale pages, and the
// ink band the home page's teaser is drawn in.
const TONES = {
  light: {
    card: "",
    frame: "rounded-[22px] bg-haze sm:rounded-3xl",
    name: "text-ink group-hover:text-signal",
    price: "text-signal",
    shelf: "text-ink",
    was: "text-smoke-light",
    muted: "text-smoke",
    sizeOpen: "border-haze-dark text-ink/75",
    sizeGone: "border-haze-dark/60 text-smoke-light line-through",
    urgent: "text-signal",
  },
  dark: {
    card: "rounded-2xl bg-white/[0.04] p-2.5 ring-1 ring-white/10 transition-colors duration-base ease-swift hover:bg-white/[0.07] sm:rounded-3xl sm:p-3",
    frame: "rounded-xl bg-ink-soft sm:rounded-2xl",
    name: "text-paper-pure group-hover:text-beam",
    price: "text-beam",
    shelf: "text-paper-pure",
    was: "text-white/35",
    muted: "text-white/45",
    sizeOpen: "border-white/15 text-white/70",
    sizeGone: "border-white/10 text-white/25 line-through",
    urgent: "text-signal-light",
  },
};

// One product in a flash sale (lib/storefront.js → mapSale), drawn like the
// shop's product cards. `mode` is "live", or one of CLOSED — buying is
// disabled. A sale that has not started shows no sale price yet (the ERP keeps
// it back until the start, D-538); `remaining` is null when the deal has no
// unit limit.
export default function FlashDealCard({ item, onBuy, mode = "live", tone = "light", className }) {
  const { product, price, regularPrice, minPrice, maxPrice, maxDiscount, remaining, soldOut, sizes } = item;
  const image = product.images?.[0] || PLACEHOLDER_IMAGE;
  const hover = product.images?.[1];
  const ranged = minPrice != null && maxPrice != null && minPrice !== maxPrice;
  const offs = (sizes || []).map((s) => s.discount || 0);
  const offVaries = offs.length > 1 && Math.min(...offs) !== Math.max(...offs);
  const closed = CLOSED[mode] || null;
  const t = TONES[tone] || TONES.light;
  const imageSizes = "(max-width: 640px) 46vw, (max-width: 1024px) 33vw, 25vw";

  return (
    <article className={cn("group flex min-w-0 flex-col", t.card, className)}>
      <div className={cn("media-lift relative aspect-[4/5] overflow-hidden", t.frame)}>
        <Image
          src={image}
          alt={product.name}
          fill
          unoptimized={shouldUnoptimizeImage(image)}
          className="media-zoom object-cover"
          sizes={imageSizes}
        />
        {hover && (
          <Image
            src={hover}
            alt=""
            fill
            unoptimized={shouldUnoptimizeImage(hover)}
            className="media-zoom object-cover opacity-0 transition-opacity duration-slow ease-swift can-hover:group-hover:opacity-100"
            sizes={imageSizes}
          />
        )}

        <Link href={`/shop/${product.slug}`} className="absolute inset-0 z-10">
          <span className="sr-only">{product.name}</span>
        </Link>

        <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex flex-wrap gap-1.5 sm:left-3 sm:top-3">
          {maxDiscount > 0 && !soldOut && (
            <span className="badge-sale tabular-nums">
              {offVaries ? `Up to ${maxDiscount}% off` : `−${maxDiscount}%`}
            </span>
          )}
          {closed && <span className="badge-out">{closed}</span>}
        </div>

        {soldOut && !closed ? (
          <span className="absolute inset-0 z-20 flex items-center justify-center bg-ink/60 backdrop-blur-[2px]">
            <span className="rounded-full bg-white/15 px-4 py-2 text-[13px] font-semibold text-white/85">All claimed</span>
          </span>
        ) : (
          !closed && (
            // Quick add — always present on touch, fades in on a mouse.
            <button
              type="button"
              onClick={() => onBuy?.(item)}
              aria-label={`Quick add ${product.name}`}
              className={cn(
                "absolute bottom-2.5 right-2.5 z-20 flex h-10 w-10 items-center justify-center rounded-full transition-[opacity,transform,background-color] duration-base ease-swift active:scale-95 sm:bottom-3 sm:right-3 sm:h-11 sm:w-11",
                "can-hover:opacity-0 can-hover:group-hover:opacity-100 can-hover:focus-visible:opacity-100",
                tone === "dark" ? "bg-beam text-ink shadow-beam" : "bg-paper-pure text-ink shadow-soft hover:bg-beam"
              )}
            >
              <Plus size={18} strokeWidth={2.4} />
            </button>
          )
        )}
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col px-0.5 pt-3 sm:pt-4", tone === "dark" && "px-1 pb-1 sm:px-1.5")}>
        <Link href={`/shop/${product.slug}`} className="block min-w-0">
          <h3 className={cn("line-clamp-2 break-words text-[14px] font-semibold leading-snug tracking-[-0.015em] transition-colors duration-base ease-swift sm:line-clamp-1 sm:text-[15px]", t.name)}>
            {product.name}
          </h3>
        </Link>

        <p className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums sm:mt-1.5">
          {price === null ? (
            <>
              <span className={cn("text-[15px] font-semibold", t.shelf)}>{formatPrice(regularPrice)}</span>
              <span className={cn("text-[12.5px]", t.muted)}>Sale price at launch</span>
            </>
          ) : (
            <>
              <span className={cn("text-[16px] font-bold tracking-[-0.02em] sm:text-[17px]", t.price)}>
                {ranged && "From "}
                {formatPrice(price)}
              </span>
              {regularPrice > price && (
                <s className={cn("text-[12.5px] sm:text-[13px]", t.was)}>
                  <span className="sr-only">Regular price </span>
                  {formatPrice(regularPrice)}
                </s>
              )}
            </>
          )}
        </p>

        {/* The sizes the deal covers; a size whose deal is gone is struck out. */}
        {sizes?.length > 0 && (
          <div className="mt-2.5 hidden flex-wrap gap-1 sm:flex">
            {sizes.slice(0, 5).map((s) => {
              const open = s.remaining === null || s.remaining > 0;
              return (
                <span
                  key={s.size}
                  className={cn("max-w-full break-words rounded-full border px-2 py-0.5 text-[11.5px] leading-tight", open ? t.sizeOpen : t.sizeGone)}
                >
                  {s.size}
                </span>
              );
            })}
            {sizes.length > 5 && <span className={cn("px-1 py-0.5 text-[11.5px]", t.muted)}>+{sizes.length - 5}</span>}
          </div>
        )}

        {!closed && remaining !== null && (
          <p className={cn("mt-2 text-[12.5px]", !soldOut && remaining <= 5 ? cn("font-medium", t.urgent) : t.muted)}>
            {soldOut ? "Sold out at this price" : remaining <= 5 ? `Only ${remaining} left` : `${remaining} left at this price`}
          </p>
        )}
      </div>
    </article>
  );
}
