"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountdownBoxes } from "@/components/flash/Countdown";
import FlashDealGrid from "@/components/flash/FlashDealGrid";

// The homepage teaser for the live flash sales (lib/storefront.js →
// getFlashSales), on its own ink band. One campaign at a time — a tab per
// campaign when several are running — and never more than two rows of deals,
// so a big sale can't swamp the page. The links carry the rest: the campaign's
// own page, and the /flash-sale hub with every campaign.
export default function FlashSaleSection({ sales = [] }) {
  const [activeId, setActiveId] = useState(sales[0]?._id || null);
  const [ended, setEnded] = useState([]);

  const visible = sales.filter((s) => !ended.includes(s._id));
  if (!visible.length) return null;
  const sale = visible.find((s) => s._id === activeId) || visible[0];
  const markEnded = (id) => setEnded((e) => (e.includes(id) ? e : [...e, id]));
  const count = sale.stats.count;

  return (
    <section className="container-custom py-8 md:py-12" aria-labelledby="flash-sale-title">
      <div className="relative overflow-hidden rounded-4xl bg-ink p-5 text-paper-pure sm:p-10 md:rounded-5xl lg:p-12">
        <div aria-hidden className="absolute -top-20 left-1/3 h-[420px] w-[420px] rounded-full bg-signal/20 blur-3xl" />

        {/* On a phone the clock is the headline act, so it sits on the badge
            row where it is read first. On a wide screen there is room for it to
            hold the far end of the header instead. */}
        <div className="relative mb-6 flex flex-col gap-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-signal px-3 py-1.5 text-[12px] font-semibold text-white">
                <Zap size={13} fill="currentColor" strokeWidth={0} />
                Live now
              </span>
              {sale.stats.maxDiscount > 0 && (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/80 tabular-nums">
                  Up to {sale.stats.maxDiscount}% off
                </span>
              )}
            </div>
            <h2
              id="flash-sale-title"
              className="mt-3.5 break-words text-[clamp(1.75rem,6.4vw,2.9rem)] font-bold leading-[1.02] tracking-[-0.035em] sm:mt-4"
            >
              {sale.title || "Flash sale"}
            </h2>
            {sale.subtitle && (
              <p className="mt-2 max-w-[52ch] break-words text-[14.5px] leading-relaxed text-white/50 sm:mt-2.5 sm:text-[15px]">
                {sale.subtitle}
              </p>
            )}
          </div>

          <div className="shrink-0">
            {sale.endsAt ? (
              <>
                <p className="mb-2.5 text-[12.5px] text-white/40">Ends in</p>
                <CountdownBoxes key={sale._id} target={sale.endsAt} tone="light" onDone={() => markEnded(sale._id)} />
              </>
            ) : (
              <p className="text-[13px] font-medium text-white/50">While stocks last</p>
            )}
          </div>
        </div>

        {/* One tab per campaign */}
        {visible.length > 1 && (
          <div role="tablist" aria-label="Flash sales" className="rail relative -mx-1 mb-6 gap-2 px-1 pb-1 scrollbar-hide sm:mb-8">
            {visible.map((s) => {
              const on = s._id === sale._id;
              return (
                <button
                  key={s._id}
                  role="tab"
                  aria-selected={on}
                  type="button"
                  onClick={() => setActiveId(s._id)}
                  className={cn(
                    "press min-h-10 max-w-xs shrink-0 truncate rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors duration-fast ease-swift",
                    on ? "bg-beam text-ink" : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
                  )}
                >
                  {s.title}
                </button>
              );
            })}
          </div>
        )}

        {/* Two rows at most, whatever the screen */}
        <FlashDealGrid key={sale._id} items={sale.items} maxRows={2} tone="dark" className="relative" />

        <div className="relative mt-8 flex flex-col items-stretch gap-2.5 sm:mt-10 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
          <Link href={`/flash-sale/${sale.slug}`} className="btn-beam group/cta">
            View all {count} deal{count === 1 ? "" : "s"}
            <ArrowUpRight
              size={17}
              strokeWidth={2.4}
              className="transition-transform duration-base ease-swift group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
            />
          </Link>
          <Link href="/flash-sale" className="btn-invert-outline">
            All flash sales{visible.length > 1 ? ` (${visible.length})` : ""}
          </Link>
        </div>
      </div>
    </section>
  );
}
