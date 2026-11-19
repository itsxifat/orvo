"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Zap } from "lucide-react";
import { shouldUnoptimizeImage } from "@/lib/utils";
import { CountdownBoxes } from "./Countdown";
import FlashDealGrid from "./FlashDealGrid";

// One live campaign on the /flash-sale hub: its banner (when staff uploaded
// one), title, countdown and a two-row preview of its deals — each buyable
// right here — with a link into the campaign's own page for the rest.
export default function FlashCampaignBlock({ sale, maxRows = 2 }) {
  const [ended, setEnded] = useState(false);
  const { stats } = sale;
  const facts = [
    `${stats.count} deal${stats.count === 1 ? "" : "s"}`,
    stats.maxDiscount > 0 ? `up to ${stats.maxDiscount}% off` : null,
  ].filter(Boolean);

  return (
    <section id={sale.slug} className="min-w-0 scroll-mt-40" aria-labelledby={`${sale.slug}-title`}>
      {sale.bannerImage && (
        <div className="relative mb-8 aspect-[16/7] overflow-hidden rounded-4xl bg-haze sm:aspect-[16/5] md:rounded-5xl">
          <Image
            src={sale.bannerImage}
            alt=""
            fill
            unoptimized={shouldUnoptimizeImage(sale.bannerImage)}
            className="object-cover"
            sizes="(max-width: 1680px) 100vw, 1680px"
          />
        </div>
      )}

      <div className="mb-7 flex flex-col gap-5 md:mb-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <span className="eyebrow-beam">
            <Zap size={12} fill="currentColor" strokeWidth={0} />
            {facts.join(" · ")}
          </span>
          <h2
            id={`${sale.slug}-title`}
            className="mt-3 text-[clamp(1.75rem,6.4vw,2.9rem)] font-bold leading-[1.02] tracking-[-0.035em] text-ink [overflow-wrap:anywhere]"
          >
            {sale.title}
          </h2>
          {sale.subtitle && <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-smoke [overflow-wrap:anywhere]">{sale.subtitle}</p>}
        </div>

        <div className="min-w-0 max-w-full lg:flex-shrink-0">
          {ended ? (
            <p className="text-[14px] font-medium text-smoke">This sale has ended</p>
          ) : sale.endsAt ? (
            <>
              <p className="mb-2.5 text-[12.5px] text-smoke">Ends in</p>
              <CountdownBoxes target={sale.endsAt} onDone={() => setEnded(true)} />
            </>
          ) : (
            <p className="text-[14px] font-medium text-smoke">While stocks last</p>
          )}
        </div>
      </div>

      <FlashDealGrid items={sale.items} maxRows={maxRows} mode={ended ? "ended" : "live"} />

      <div className="mt-10 flex justify-center">
        <Link href={`/flash-sale/${sale.slug}`} className="btn-outline group/cta">
          View all {stats.count} deal{stats.count === 1 ? "" : "s"}
          <ArrowUpRight
            size={17}
            strokeWidth={2.2}
            className="transition-transform duration-base ease-swift group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
          />
        </Link>
      </div>
    </section>
  );
}
