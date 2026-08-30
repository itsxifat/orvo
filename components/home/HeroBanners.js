import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { shouldUnoptimizeImage } from "@/lib/utils";

// The homepage hero: up to three banners, all visible at once. No slider —
// nothing is hidden behind a timer or a swipe.
//
// ─── Why nothing ever gets cropped ──────────────────────────────────────────
// Each slot declares the exact aspect ratio of the artwork it expects, so the
// container and the image always agree and `object-cover` has nothing to trim.
// The layout re-forms for 1, 2 or 3 banners, and because each configuration is
// tuned so that (slot width ÷ slot ratio) lands on the same number, the hero
// band keeps the same height no matter how many banners are in it:
//
//   1 banner  → full width  ÷ 2.4 = 0.417 W
//   2 banners → half width  ÷ 1.2 = 0.417 W
//   3 banners → third width ÷ 0.8 = 0.417 W
//
// Below the grid breakpoint every banner goes full width at 4:5 and stacks, so
// the portrait mobile artwork also fills its slot exactly.
//
// ─── What to upload ─────────────────────────────────────────────────────────
//   banners │ desktop artwork │ mobile artwork
//   ────────┼─────────────────┼───────────────
//      1    │ 2400 × 1000     │ 1080 × 1350
//      2    │ 1200 × 1000     │ 1080 × 1350
//      3    │  800 × 1000     │ 1080 × 1350
//
// Every desktop file is 1000 px tall; only the width changes with the count.

const LAYOUTS = {
  1: {
    grid: "grid-cols-1",
    slot: "aspect-[4/5] md:aspect-[12/5]",
    desktopOnly: "hidden md:block",
    mobileOnly: "md:hidden",
    sizes: "(max-width: 767px) 100vw, (max-width: 1680px) 100vw, 1680px",
  },
  2: {
    grid: "grid-cols-1 md:grid-cols-2",
    slot: "aspect-[4/5] md:aspect-[6/5]",
    desktopOnly: "hidden md:block",
    mobileOnly: "md:hidden",
    sizes: "(max-width: 767px) 100vw, 50vw",
  },
  3: {
    // Three across only once there is room for it; below that they stack at the
    // same 4:5 the mobile artwork already uses.
    grid: "grid-cols-1 lg:grid-cols-3",
    slot: "aspect-[4/5]",
    desktopOnly: "hidden lg:block",
    mobileOnly: "lg:hidden",
    sizes: "(max-width: 1023px) 100vw, 33vw",
  },
};

// Shown until the admin uploads anything, so the homepage never opens on a hole.
function EmptyHero() {
  return (
    <section className="container-custom pt-2 pb-4 md:pt-4">
      <div className="relative rounded-4xl md:rounded-5xl overflow-hidden bg-ink text-paper-pure aspect-[4/5] md:aspect-[12/5] flex items-center">
        <div aria-hidden className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full bg-beam/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 right-0 w-[460px] h-[460px] rounded-full bg-signal/15 blur-3xl" />

        <div className="relative px-7 sm:px-12 lg:px-16 max-w-[640px]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 text-[13px] font-semibold ring-1 ring-white/15">
            <span className="w-1.5 h-1.5 rounded-full bg-beam" />
            New season
          </span>
          <h1 className="text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[1.02] tracking-[-0.04em] mt-6">
            Considered clothing,{" "}
            <span className="relative inline-block">
              <span className="relative z-10">built to be worn</span>
              <span aria-hidden className="absolute left-0 right-0 bottom-[0.06em] h-[0.3em] bg-beam rounded-full" />
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-8">
            <Link href="/shop" className="btn-beam group">
              Shop everything
              <ArrowUpRight
                size={17}
                strokeWidth={2.4}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
            <Link href="/shop?newArrival=true" className="btn-invert-outline">
              New in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Banner({ banner, layout, priority }) {
  const desktop = banner.imageDesktop || banner.imageMobile;
  const mobile = banner.imageMobile || banner.imageDesktop;
  const href = banner.href && banner.href !== "/" ? banner.href : null;
  const alt = banner.alt || "";

  const art = (
    <>
      <Image
        src={desktop}
        alt={alt}
        fill
        priority={priority}
        unoptimized={shouldUnoptimizeImage(desktop)}
        sizes={layout.sizes}
        className={`${layout.desktopOnly} object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]`}
      />
      <Image
        src={mobile}
        alt={alt}
        fill
        priority={priority}
        unoptimized={shouldUnoptimizeImage(mobile)}
        sizes="100vw"
        className={`${layout.mobileOnly} object-cover`}
      />
    </>
  );

  const shell = `group relative block rounded-3xl md:rounded-4xl overflow-hidden bg-haze ${layout.slot} transition-shadow duration-300`;

  if (!href) {
    return <div className={shell}>{art}</div>;
  }

  return (
    <Link href={href} className={`${shell} hover:shadow-lift`} aria-label={alt || undefined}>
      {art}
      {/* Affordance that the panel is clickable, without covering the artwork */}
      <span className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-paper-pure/90 backdrop-blur flex items-center justify-center text-ink opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
        <ArrowUpRight size={19} strokeWidth={2.2} />
      </span>
    </Link>
  );
}

export default function HeroBanners({ banners = [] }) {
  // Only banners that actually have artwork, capped at the three the grid
  // is built for.
  const live = banners.filter((b) => b?.imageDesktop || b?.imageMobile).slice(0, 3);

  if (live.length === 0) return <EmptyHero />;

  const layout = LAYOUTS[live.length];

  return (
    <section className="container-custom pt-2 pb-4 md:pt-4">
      <div className={`grid ${layout.grid} gap-3 md:gap-4`}>
        {live.map((banner, i) => (
          <Banner
            key={banner._id || i}
            banner={banner}
            layout={layout}
            priority={i === 0}
          />
        ))}
      </div>
    </section>
  );
}
