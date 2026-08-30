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
    <div className="flex gap-2">
      {cells.map((c) => (
        <div
          key={c.label}
          className="w-[62px] rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/10 py-2.5 text-center"
        >
          <p className="text-[22px] font-bold tabular-nums leading-none text-paper-pure tracking-[-0.03em]">
            {pad(c.value)}
          </p>
          <p className="text-[11px] text-white/45 mt-1.5">{c.label}</p>
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
    <div className="group rounded-3xl bg-white/[0.04] ring-1 ring-white/10 p-3 flex flex-col transition-colors hover:bg-white/[0.07]">
      <div className="relative rounded-2xl overflow-hidden bg-ink-soft aspect-[4/5]">
        <Image
          src={image}
          alt={product.name}
          fill
          unoptimized={shouldUnoptimizeImage(image)}
          className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-[1.06]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
            className="absolute bottom-3 right-3 z-20 w-11 h-11 rounded-full bg-beam text-ink flex items-center justify-center shadow-beam transition-all duration-300 hover:scale-105
                       opacity-100 md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0"
          >
            <Plus size={19} strokeWidth={2.4} />
          </button>
        )}
      </div>

      <div className="pt-4 px-1.5 pb-1 flex-1 flex flex-col">
        <Link href={`/shop/${product.slug}`}>
          <h3 className="text-[15px] font-semibold text-paper-pure truncate tracking-[-0.015em] group-hover:text-beam transition-colors">
            {product.name}
          </h3>
        </Link>

        <p className="flex items-baseline gap-2 mt-1.5">
          <span className="text-[17px] font-bold text-beam tabular-nums tracking-[-0.02em]">
            {formatPrice(salePrice)}
          </span>
          {origPrice > salePrice && (
            <span className="text-[13px] text-white/35 line-through tabular-nums">
              {formatPrice(origPrice)}
            </span>
          )}
        </p>

        <div className="mt-4">
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
      <div className="relative rounded-4xl md:rounded-5xl bg-ink text-paper-pure overflow-hidden p-6 sm:p-10 lg:p-12">
        <div aria-hidden className="absolute -top-20 left-1/3 w-[420px] h-[420px] rounded-full bg-signal/20 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-signal px-3 py-1.5 text-[12px] font-semibold text-white">
              <Zap size={13} fill="currentColor" strokeWidth={0} />
              Live now
            </span>
            <h2 className="text-[clamp(1.9rem,4.6vw,2.9rem)] font-bold leading-[1.02] tracking-[-0.035em] mt-4">
              {sale.title || "Flash sale"}
            </h2>
            {sale.subtitle && (
              <p className="text-[15px] text-white/50 mt-2.5 max-w-[52ch] leading-relaxed">
                {sale.subtitle}
              </p>
            )}
          </div>

          {cd && !cd.expired && (
            <div className="shrink-0">
              <p className="text-[12.5px] text-white/40 mb-2.5">Ends in</p>
              <Countdown cd={cd} />
            </div>
          )}
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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
