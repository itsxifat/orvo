"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Zap } from "lucide-react";
import { formatPrice, shouldUnoptimizeImage } from "@/lib/utils";
import QuickAddModal from "@/components/shop/QuickAddModal";

const pad = (n) => String(n).padStart(2, "0");

// Live countdown to `endsAt`. Returns null until mounted (avoids SSR/client
// hydration mismatch), when no end is set, or once elapsed.
function useCountdown(endsAt) {
  const target = endsAt ? new Date(endsAt).getTime() : null;
  const [now, setNow] = useState(null);

  useEffect(() => {
    if (!target) return undefined;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);

  if (!target || now == null) return null;
  const diff = Math.max(0, target - now);
  const totalSec = Math.floor(diff / 1000);
  return {
    expired: diff <= 0,
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

function Countdown({ cd }) {
  const cells = [
    cd.days > 0 ? { value: cd.days, label: "Days" } : null,
    { value: cd.hours, label: "Hrs" },
    { value: cd.minutes, label: "Min" },
    { value: cd.seconds, label: "Sec" },
  ].filter(Boolean);

  return (
    <div className="flex gap-1.5 sm:gap-2">
      {cells.map((c) => (
        <div
          key={c.label}
          className="w-[54px] rounded-xl bg-white/10 py-2 text-center ring-1 ring-white/10 backdrop-blur-sm sm:w-[62px] sm:rounded-2xl sm:py-2.5"
        >
          <p className="text-[19px] font-bold leading-none tracking-[-0.03em] tabular-nums text-paper-pure sm:text-[22px]">
            {pad(c.value)}
          </p>
          <p className="mt-1 text-[10.5px] text-white/45 sm:mt-1.5 sm:text-[11px]">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

function FlashCard({ item, onAdd }) {
  const { product, salePrice, stockLimit, soldCount, remaining } = item;
  const variants = product.variants || [];
  const totalRealStock = variants.reduce((s, v) => s + (v.stock || 0), 0);
  const origPrice = variants.length ? Math.min(...variants.map((v) => v.price)) : 0;
  const off =
    origPrice > salePrice && origPrice > 0
      ? Math.round(((origPrice - salePrice) / origPrice) * 100)
      : 0;
  const soldOut = remaining <= 0 || totalRealStock <= 0;
  const soldPct = stockLimit > 0 ? Math.min(100, Math.round((soldCount / stockLimit) * 100)) : 0;
  const image = product.images?.[0] || "/placeholder.jpg";

  return (
    <div className="group flex flex-col rounded-2xl bg-white/[0.04] p-2.5 ring-1 ring-white/10 transition-colors duration-base ease-swift hover:bg-white/[0.07] sm:rounded-3xl sm:p-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-ink-soft sm:rounded-2xl">
        <Image
          src={image}
          alt={product.name}
          fill
          unoptimized={shouldUnoptimizeImage(image)}
          className="media-zoom object-cover"
          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 33vw, 25vw"
        />
        <Link href={`/shop/${product.slug}`} className="absolute inset-0 z-10">
          <span className="sr-only">{product.name}</span>
        </Link>

        {off > 0 && !soldOut && (
          <span className="absolute top-3 left-3 z-20 rounded-full bg-signal text-white px-3 py-1 text-[12px] font-bold tabular-nums">
            −{off}%
          </span>
        )}

        {soldOut ? (
          <span className="absolute inset-0 z-20 bg-ink/70 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
            <span className="rounded-full bg-white/10 px-4 py-2 text-[13px] font-semibold text-white/80">
              All claimed
            </span>
          </span>
        ) : (
          <button
            onClick={() => onAdd(item)}
            aria-label={`Grab ${product.name}`}
            className="absolute bottom-2.5 right-2.5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-beam text-ink shadow-beam transition-[opacity,transform] duration-base ease-swift active:scale-95 sm:bottom-3 sm:right-3 sm:h-11 sm:w-11
                       can-hover:translate-y-2 can-hover:opacity-0 can-hover:group-hover:translate-y-0 can-hover:group-hover:opacity-100"
          >
            <Plus size={19} strokeWidth={2.4} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-3 sm:px-1.5 sm:pt-4">
        <Link href={`/shop/${product.slug}`}>
          <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug tracking-[-0.015em] text-paper-pure transition-colors duration-base ease-swift group-hover:text-beam sm:line-clamp-1 sm:text-[15px]">
            {product.name}
          </h3>
        </Link>

        <p className="mt-1 flex items-baseline gap-2 sm:mt-1.5">
          <span className="text-[16px] font-bold tracking-[-0.02em] tabular-nums text-beam sm:text-[17px]">
            {formatPrice(salePrice)}
          </span>
          {origPrice > salePrice && (
            <span className="text-[12.5px] tabular-nums text-white/35 line-through sm:text-[13px]">
              {formatPrice(origPrice)}
            </span>
          )}
        </p>

        <div className="mt-3 sm:mt-4">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                remaining <= 3 ? "bg-signal" : remaining <= 8 ? "bg-orange-400" : "bg-beam"
              }`}
              style={{ width: `${Math.max(soldPct, soldOut ? 100 : 6)}%` }}
            />
          </div>
          <p className="text-[12.5px] mt-2">
            {soldOut ? (
              <span className="text-white/35">Gone</span>
            ) : remaining <= 3 ? (
              <span className="text-signal-light font-medium">Only {remaining} left</span>
            ) : remaining <= 8 ? (
              <span className="text-orange-300 font-medium">{remaining} left</span>
            ) : (
              <span className="text-white/40">
                {soldCount} sold · {remaining} left
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FlashSaleSection({ sale }) {
  const [active, setActive] = useState(null); // item open in QuickAddModal
  const cd = useCountdown(sale?.endsAt);

  if (!sale?.items?.length) return null;
  if (cd?.expired) return null;

  return (
    <section className="container-custom py-8 md:py-12">
      <div className="relative overflow-hidden rounded-4xl bg-ink p-5 text-paper-pure sm:p-10 md:rounded-5xl lg:p-12">
        <div aria-hidden className="absolute -top-20 left-1/3 h-[420px] w-[420px] rounded-full bg-signal/20 blur-3xl" />

        {/* On a phone the clock is the headline act, so it sits on the badge
            row where it is read first. On a wide screen there is room for it to
            hold the far end of the header instead. */}
        <div className="relative mb-6 flex flex-col gap-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-signal px-3 py-1.5 text-[12px] font-semibold text-white">
                <Zap size={13} fill="currentColor" strokeWidth={0} />
                Live now
              </span>
              {cd && !cd.expired && (
                <p className="text-[12.5px] tabular-nums text-white/40 sm:hidden">Ends in</p>
              )}
            </div>
            <h2 className="mt-3.5 text-[clamp(1.75rem,6.4vw,2.9rem)] font-bold leading-[1.02] tracking-[-0.035em] sm:mt-4">
              {sale.title || "Flash sale"}
            </h2>
            {sale.subtitle && (
              <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-white/50 sm:mt-2.5 sm:text-[15px]">
                {sale.subtitle}
              </p>
            )}
          </div>

          {cd && !cd.expired && (
            <div className="shrink-0">
              <p className="mb-2.5 hidden text-[12.5px] text-white/40 sm:block">Ends in</p>
              <Countdown cd={cd} />
            </div>
          )}
        </div>

        <div className="relative grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {sale.items.map((item) => (
            <FlashCard key={item.product._id} item={item} onAdd={setActive} />
          ))}
        </div>
      </div>

      {active && (
        <QuickAddModal
          product={active.product}
          flashPrice={active.salePrice}
          flashStock={active.remaining}
          onClose={() => setActive(null)}
        />
      )}
    </section>
  );
}
