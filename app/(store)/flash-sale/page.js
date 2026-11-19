export const dynamic = "force-dynamic";

import { cache } from "react";
import Link from "next/link";
import { ArrowDown, ChevronRight, Zap } from "lucide-react";
import { getFlashSales } from "@/lib/storefront";
import FlashCampaignBlock from "@/components/flash/FlashCampaignBlock";
import UpcomingSaleCard from "@/components/flash/UpcomingSaleCard";
import { CountdownText } from "@/components/flash/Countdown";
import JsonLd from "@/components/seo/JsonLd";
import SectionHead from "@/components/home/SectionHead";
import { getSite } from "@/lib/storefront";
import { DEFAULT_SITE_NAME, breadcrumbJsonLd, clip, collectionJsonLd, pageMetadata } from "@/lib/seo";

// The hub's search and sharing text follows what is on: the best saving and the
// live sales by name, or what is coming.
export async function generateMetadata() {
  const [{ live, upcoming }, site] = await Promise.all([getData(), getSite()]);
  const siteName = site?.siteInfo?.siteName || DEFAULT_SITE_NAME;
  const off = live.reduce((m, s) => Math.max(m, s.stats.maxDiscount), 0);
  const names = live.map((s) => s.title).slice(0, 3).join(", ");
  const description = live.length
    ? `On now at ${siteName}: ${names}${off > 0 ? ` — up to ${off}% off` : ""}. Limited-time prices on limited stock, cash on delivery across Bangladesh.`
    : upcoming.length
    ? `Coming soon at ${siteName}: ${upcoming.map((s) => s.title).slice(0, 3).join(", ")}. Limited-time prices on limited stock.`
    : `Limited-time prices on limited stock at ${siteName}. When a deal's gone, it's gone.`;
  return pageMetadata({
    title: off > 0 ? `Flash Sale — up to ${off}% off` : "Flash Sale",
    description: clip(description, 160),
    path: "/flash-sale",
    siteName,
    image: null,
  });
}

// Live and scheduled sales from the brand ERP (GET /storefront/v1/flash-sales),
// read once per request for the metadata and the page.
const getData = cache(async function getData() {
  try {
    return await getFlashSales();
  } catch (err) {
    console.error("GET /flash-sale error:", err?.code || err?.message);
    return { live: [], upcoming: [] };
  }
});

// Every live flash sale on one page, each with a two-row preview that can be
// bought from directly and a link into the campaign's own page. Campaigns
// switched on for later appear underneath as "coming soon".
export default async function FlashSaleHubPage() {
  const { live, upcoming } = await getData();
  const deals = live.reduce((n, s) => n + s.stats.count, 0);
  const maxDiscount = live.reduce((m, s) => Math.max(m, s.stats.maxDiscount), 0);
  const facts = live.length
    ? [
        `${live.length} sale${live.length === 1 ? "" : "s"} on now`,
        `${deals} deal${deals === 1 ? "" : "s"}`,
        maxDiscount > 0 ? `up to ${maxDiscount}% off` : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="container-custom pb-16 md:pb-24">
      {/* The live sales, and the breadcrumbs, for Google. */}
      <JsonLd
        data={[
          collectionJsonLd({
            name: "Flash Sale",
            path: "/flash-sale",
            items: [...live, ...upcoming].map((s) => ({ name: s.title, path: `/flash-sale/${s.slug}`, image: s.bannerImage || s.items[0]?.product.images?.[0] })),
          }),
          breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Flash Sale", path: "/flash-sale" }]),
        ]}
      />

      {/* ── Header: a dark band, like the home page's flash teaser ─────────── */}
      <section className="pt-5 md:pt-10">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-smoke">
          <Link href="/" className="transition-colors hover:text-ink">Home</Link>
          <ChevronRight size={13} strokeWidth={2} className="text-smoke-light" />
          <span aria-current="page" className="text-ink">Flash Sale</span>
        </nav>

        <div className="relative mt-5 overflow-hidden rounded-4xl bg-ink p-6 text-paper-pure sm:p-10 md:mt-6 md:rounded-5xl lg:p-12">
          <div aria-hidden className="absolute -top-24 right-1/4 h-[420px] w-[420px] rounded-full bg-signal/20 blur-3xl" />
          <div aria-hidden className="absolute -bottom-32 -left-16 h-[360px] w-[360px] rounded-full bg-beam/15 blur-3xl" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-signal px-3 py-1.5 text-[12px] font-semibold text-white">
              <Zap size={13} fill="currentColor" strokeWidth={0} />
              {live.length ? "Live now" : upcoming.length ? "Coming soon" : "Flash sale"}
            </span>
            <h1 className="mt-4 text-[clamp(2.2rem,8vw,4.4rem)] font-bold leading-[1] tracking-[-0.04em]">Flash Sale</h1>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-white/55 sm:text-[16px]">
              Limited-time prices on limited stock. When a deal&apos;s gone, it&apos;s gone.
            </p>
            {facts.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {facts.map((f) => (
                  <span key={f} className="inline-flex items-center rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold text-white/80 tabular-nums">
                    {f}
                  </span>
                ))}
              </div>
            )}

            {/* Jump to a campaign */}
            {live.length > 1 && (
              <ul className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {live.map((s) => (
                  <li key={s._id} className="min-w-0">
                    <a
                      href={`#${s.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10 transition-colors duration-base ease-swift hover:bg-white/10"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[14.5px] font-semibold text-paper-pure group-hover:text-beam">{s.title}</span>
                        <span className="mt-0.5 block text-[12.5px] text-white/45">
                          {s.endsAt ? (
                            <>Ends in <CountdownText target={s.endsAt} className="font-semibold text-beam" /></>
                          ) : (
                            "While stocks last"
                          )}
                        </span>
                      </span>
                      <ArrowDown size={16} strokeWidth={2.2} className="shrink-0 text-white/40 group-hover:text-beam" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <div className="space-y-16 pt-12 md:space-y-24 md:pt-16">
        {live.map((sale) => (
          <FlashCampaignBlock key={sale._id} sale={sale} />
        ))}

        {!live.length && (
          <div className="card-quiet px-6 py-14 text-center">
            <p className="text-[20px] font-bold tracking-[-0.02em] text-ink">No flash sale on right now</p>
            <p className="mx-auto mt-2 max-w-sm text-[15px] text-smoke">
              {upcoming.length ? "The next one is on its way — see what's coming below." : "Check back soon — new deals drop regularly."}
            </p>
            <Link href="/shop" className="btn-primary mt-6">
              Browse the shop
            </Link>
          </div>
        )}

        {upcoming.length > 0 && (
          <section>
            <SectionHead title="Coming soon" />
            <div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((sale) => (
                <UpcomingSaleCard key={sale._id} sale={sale} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
