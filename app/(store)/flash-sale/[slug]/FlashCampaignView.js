"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, ChevronRight, Eye, Zap } from "lucide-react";
import { cn, shouldUnoptimizeImage } from "@/lib/utils";
import { CountdownBoxes, CountdownText } from "@/components/flash/Countdown";
import FlashDealGrid from "@/components/flash/FlashDealGrid";
import SectionHead from "@/components/home/SectionHead";

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "discount", label: "Biggest discount" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "almost-gone", label: "Almost gone" },
];

// A deal with no unit limit (`remaining` null) is never "almost gone"; a sale
// that has not started has no price yet, so it sorts by the shelf price.
const left = (item) => (item.remaining === null ? Number.MAX_SAFE_INTEGER : item.remaining);
const priceOf = (item) => item.price ?? item.regularPrice ?? 0;
const COMPARE = {
  discount: (a, b) => b.maxDiscount - a.maxDiscount,
  "price-asc": (a, b) => priceOf(a) - priceOf(b),
  "price-desc": (a, b) => priceOf(b) - priceOf(a),
  "almost-gone": (a, b) => left(a) - left(b),
};

// How often a live sale re-reads what is left, while the tab is in view.
const REFRESH_MS = 45000;

// Letter sizes in wearing order, then numeric sizes ascending, then anything
// else alphabetically — so the size filter reads S M L XL, not first-seen.
const LETTER_SIZES = ["XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL", "4XL", "5XL"];
function sizeKey(size) {
  const s = String(size).trim().toUpperCase();
  const letter = LETTER_SIZES.indexOf(s);
  if (letter >= 0) return [0, s === "2XL" ? LETTER_SIZES.indexOf("XXL") : s === "3XL" ? LETTER_SIZES.indexOf("XXXL") : letter, ""];
  const n = parseFloat(s);
  return Number.isFinite(n) ? [1, n, ""] : [2, 0, s];
}
function compareSizes(a, b) {
  const [ga, na, sa] = sizeKey(a);
  const [gb, nb, sb] = sizeKey(b);
  return ga - gb || na - nb || sa.localeCompare(sb);
}

function OtherSaleCard({ sale }) {
  const thumbs = sale.items.map((i) => i.product.images?.[0]).filter(Boolean).slice(0, 3);
  return (
    <Link
      href={`/flash-sale/${sale.slug}`}
      className="group flex min-w-0 w-full items-center gap-4 rounded-3xl bg-paper-pure p-3 shadow-soft transition-shadow duration-base ease-swift hover:shadow-lift sm:pr-5"
    >
      <div className="flex flex-shrink-0 -space-x-3">
        {thumbs.map((src) => (
          <div key={src} className="relative h-16 w-12 overflow-hidden rounded-xl bg-haze ring-2 ring-paper-pure">
            <Image src={src} alt="" fill unoptimized={shouldUnoptimizeImage(src)} className="object-cover" sizes="48px" />
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[15px] font-semibold tracking-[-0.015em] text-ink [overflow-wrap:anywhere] sm:truncate">{sale.title}</p>
        <p className="mt-0.5 text-[13px] text-smoke">
          {sale.stats.count} deal{sale.stats.count === 1 ? "" : "s"}
          {sale.stats.maxDiscount > 0 && <> · up to {sale.stats.maxDiscount}% off</>}
        </p>
        {sale.endsAt && (
          <p className="mt-0.5 text-[13px] text-smoke">
            Ends in <CountdownText target={sale.endsAt} className="font-semibold text-signal" />
          </p>
        )}
      </div>
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-haze text-ink transition-colors duration-base ease-swift group-hover:bg-beam">
        <ArrowUpRight size={16} strokeWidth={2.2} />
      </span>
    </Link>
  );
}

export default function FlashCampaignView({ sale: initial, others = [], preview = false }) {
  const router = useRouter();
  const [sale, setSale] = useState(initial);
  const [status, setStatus] = useState(initial.status);
  const [sort, setSort] = useState("featured");
  const [size, setSize] = useState("");
  const [hideSoldOut, setHideSoldOut] = useState(false);

  // A server refresh (the sale going live) hands us a new sale.
  useEffect(() => {
    setSale(initial);
    setStatus(initial.status);
  }, [initial]);

  // Keep "X left" honest while people are buying.
  useEffect(() => {
    if (status !== "live" || preview) return;
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/flash-sale?slug=${encodeURIComponent(initial.slug)}`, { cache: "no-store" });
        const data = await res.json();
        if (data.sale) {
          setSale(data.sale);
          // Ended early (the end time moved up) — stop selling on this page too.
          if (data.sale.status !== "live") setStatus(data.sale.status);
        }
      } catch {}
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [status, preview, initial.slug]);

  // Every size any deal covers.
  const sizes = useMemo(() => {
    const seen = new Set();
    for (const it of sale.items) for (const s of it.sizes) seen.add(s.size);
    return [...seen].sort(compareSizes);
  }, [sale.items]);

  const items = useMemo(() => {
    let list = sale.items;
    if (size) list = list.filter((it) => it.sizes.some((s) => s.size === size && (s.remaining === null || s.remaining > 0 || status !== "live")));
    if (hideSoldOut) list = list.filter((it) => !it.soldOut);
    const compare = COMPARE[sort];
    const sorted = compare ? [...list].sort(compare) : [...list];
    // Whatever the order, what can still be bought comes first.
    return sorted.sort((a, b) => Number(a.soldOut) - Number(b.soldOut));
  }, [sale.items, size, hideSoldOut, sort, status]);

  const { stats } = sale;
  const mode = preview ? "preview" : status === "scheduled" ? "upcoming" : status === "live" ? "live" : "ended";

  const facts = [
    `${stats.count} deal${stats.count === 1 ? "" : "s"}`,
    stats.maxDiscount > 0 ? `up to ${stats.maxDiscount}% off` : null,
    status === "live" && stats.sold > 0 ? `${stats.sold} sold` : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen min-w-0">
      {preview && (
        <div className="flex items-center justify-center gap-2 bg-beam-soft px-4 py-2.5 text-center text-[13px] font-medium text-ink">
          <Eye size={15} strokeWidth={2} /> Preview — this sale is switched off, so only staff can see this page.
        </div>
      )}

      <div className="container-custom pb-16 md:pb-24">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 pt-5 text-[13px] text-smoke md:pt-10">
          <Link href="/" className="transition-colors hover:text-ink">Home</Link>
          <ChevronRight size={13} strokeWidth={2} className="text-smoke-light" />
          <Link href="/flash-sale" className="transition-colors hover:text-ink">Flash Sale</Link>
          <ChevronRight size={13} strokeWidth={2} className="hidden text-smoke-light sm:block" />
          <span aria-current="page" className="hidden max-w-[260px] truncate text-ink sm:block">{sale.title}</span>
        </nav>

        {/* ── The campaign, on an ink band ───────────────────────────────── */}
        <section className="relative mt-5 overflow-hidden rounded-4xl bg-ink text-paper-pure md:mt-6 md:rounded-5xl">
          {sale.bannerImage && (
            <div className="relative aspect-[16/8] w-full overflow-hidden sm:aspect-[16/5] lg:max-h-[440px]">
              <Image
                src={sale.bannerImage}
                alt=""
                fill
                priority
                unoptimized={shouldUnoptimizeImage(sale.bannerImage)}
                className="object-cover"
                sizes="(max-width: 1680px) 100vw, 1680px"
              />
            </div>
          )}

          <div aria-hidden className="absolute -bottom-24 left-1/3 h-[420px] w-[420px] rounded-full bg-signal/20 blur-3xl" />

          <div className="relative grid grid-cols-1 gap-6 p-6 sm:gap-8 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-12">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-signal px-3 py-1.5 text-[12px] font-semibold text-white">
                  <Zap size={13} fill="currentColor" strokeWidth={0} />
                  {status === "live" ? "Live now" : status === "scheduled" ? "Coming soon" : "Flash sale"}
                </span>
                {facts.map((f) => (
                  <span key={f} className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/80 tabular-nums">
                    {f}
                  </span>
                ))}
              </div>
              <h1 className="mt-4 text-[clamp(2rem,7.5vw,4rem)] font-bold leading-[1.02] tracking-[-0.04em] [overflow-wrap:anywhere]">{sale.title}</h1>
              {sale.subtitle && <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-white/60 [overflow-wrap:anywhere]">{sale.subtitle}</p>}
              {sale.description && (
                <p className="mt-3 max-w-2xl whitespace-pre-line text-[14.5px] leading-relaxed text-white/50 [overflow-wrap:anywhere]">{sale.description}</p>
              )}
            </div>

            <div className="min-w-0 max-w-full">
              {status === "live" && sale.endsAt ? (
                <>
                  <p className="mb-2.5 text-[12.5px] text-white/40">Ends in</p>
                  <CountdownBoxes target={sale.endsAt} tone="light" size="lg" onDone={() => setStatus("ended")} />
                </>
              ) : status === "live" ? (
                <p className="text-[14px] font-medium text-white/55">While stocks last</p>
              ) : status === "scheduled" ? (
                <>
                  <p className="mb-2.5 text-[12.5px] text-white/40">Starts in</p>
                  <CountdownBoxes target={sale.startsAt} tone="accent" size="lg" onDone={() => router.refresh()} />
                  <p className="mt-3 text-[13px] text-white/50">Prices go live the moment the countdown ends.</p>
                </>
              ) : status === "ended" ? (
                <div>
                  <p className="text-[20px] font-bold tracking-[-0.02em]">This sale has ended</p>
                  <Link href="/flash-sale" className="btn-beam mt-4">
                    See the live flash sales <ArrowRight size={15} strokeWidth={2.4} />
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="pt-8 md:pt-10">
          {mode !== "ended" && (
            <>
              {/* Toolbar */}
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[14px] tabular-nums text-smoke md:text-[15px]">
                  {items.length === sale.items.length
                    ? `${items.length} deal${items.length === 1 ? "" : "s"}`
                    : `${items.length} of ${sale.items.length} deals`}
                </p>
                <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                  {mode === "live" && (
                    <button
                      type="button"
                      onClick={() => setHideSoldOut((v) => !v)}
                      aria-pressed={hideSoldOut}
                      className={cn("chip min-h-11 gap-2", hideSoldOut && "chip-active")}
                    >
                      Hide sold out
                    </button>
                  )}
                  <label className="flex w-full min-w-0 items-center gap-2 rounded-full bg-paper-pure px-4 shadow-soft sm:inline-flex sm:w-auto">
                    <span className="flex-shrink-0 text-[14px] text-smoke">Sort</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="min-h-11 w-full min-w-0 cursor-pointer bg-transparent py-2 pr-1 text-base font-semibold text-ink focus:outline-none sm:w-auto sm:text-[14px]"
                    >
                      {SORTS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {sizes.length > 1 && (
                <div className="mb-8 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by size">
                  <span className="mr-1 text-[14px] text-smoke">Size</span>
                  {["", ...sizes].map((s) => (
                    <button
                      key={s || "all"}
                      type="button"
                      onClick={() => setSize(s)}
                      aria-pressed={size === s}
                      className={cn("chip min-h-10 min-w-[44px] max-w-full [overflow-wrap:anywhere]", size === s && "chip-active")}
                    >
                      {s || "All"}
                    </button>
                  ))}
                </div>
              )}

              {items.length ? (
                <FlashDealGrid items={items} mode={mode} />
              ) : (
                <div className="card-quiet px-6 py-14 text-center">
                  <p className="text-[17px] font-semibold text-ink">
                    {sale.items.length ? "No deals match these filters." : "There are no deals in this sale right now."}
                  </p>
                  {sale.items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setSize(""); setHideSoldOut(false); }}
                      className="btn-outline mt-5"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {others.length > 0 && (
            <section className={cn(mode !== "ended" && "mt-16 md:mt-24")}>
              <SectionHead title="More flash sales" href="/flash-sale" />
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((s) => (
                  <OtherSaleCard key={s._id} sale={s} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
