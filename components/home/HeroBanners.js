"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { shouldUnoptimizeImage } from "@/lib/utils";

// The homepage hero: up to three banners.
//
// ─── Two designs, not one design squeezed ───────────────────────────────────
// On a desktop the banners sit side by side, all visible at once — nothing is
// hidden behind a timer or a swipe.
//
// On a phone that same layout meant three portrait banners stacked one under
// the other: roughly three full screens of hero before a visitor reached a
// single product. So the phone gets a different composition — a snap carousel
// with the next banner peeking at the edge, and dots underneath. One thumb
// movement covers what used to take three flicks, and the fold still lands on
// the products.
//
// ─── Why nothing ever gets cropped ──────────────────────────────────────────
// Each slot declares the exact aspect ratio of the artwork it expects, so the
// container and the image always agree and `object-cover` has nothing to trim.
// Because each desktop configuration is tuned so that (slot width ÷ slot ratio)
// lands on the same number, the hero band keeps the same height no matter how
// many banners are in it:
//
//   1 banner  → full width  ÷ 2.4 = 0.417 W
//   2 banners → half width  ÷ 1.2 = 0.417 W
//   3 banners → third width ÷ 0.8 = 0.417 W
//
// ─── What to upload ─────────────────────────────────────────────────────────
//   banners │ desktop artwork │ mobile artwork
//   ────────┼─────────────────┼───────────────
//      1    │ 2400 × 1000     │ 1080 × 1350
//      2    │ 1200 × 1000     │ 1080 × 1350
//      3    │  800 × 1000     │ 1080 × 1350
//
// Every desktop file is 1000 px tall; only the width changes with the count.

// Class strings are written out in full rather than composed, so Tailwind's
// scanner can see every one of them.
const LAYOUTS = {
  1: {
    mobileOnly: "md:hidden",
    desktopGrid: "hidden md:grid grid-cols-1",
    slot: "aspect-[12/5]",
    sizes: "(max-width: 1680px) 100vw, 1680px",
  },
  2: {
    mobileOnly: "md:hidden",
    desktopGrid: "hidden md:grid grid-cols-2",
    slot: "aspect-[6/5]",
    sizes: "50vw",
  },
  3: {
    // Three across only once there is room for it.
    mobileOnly: "lg:hidden",
    desktopGrid: "hidden lg:grid grid-cols-3",
    slot: "aspect-[4/5]",
    sizes: "33vw",
  },
};

// Shown until the admin uploads anything, so the homepage never opens on a hole.
function EmptyHero() {
  return (
    <section className="container-custom pb-4 pt-2 md:pt-4">
      <div className="relative flex aspect-[4/5] items-center overflow-hidden rounded-4xl bg-ink text-paper-pure sm:aspect-[16/10] md:aspect-[12/5] md:rounded-5xl">
        <div aria-hidden className="absolute -left-24 -top-32 h-[520px] w-[520px] animate-float rounded-full bg-beam/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 right-0 h-[460px] w-[460px] rounded-full bg-signal/15 blur-3xl" />

        <div className="relative max-w-[640px] px-6 sm:px-12 lg:px-16">
          <span className="inline-flex animate-reveal items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[13px] font-semibold ring-1 ring-white/15 backdrop-blur-md">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-beam" />
            New season
          </span>
          <h1
            className="mt-5 animate-reveal text-[clamp(2.1rem,7vw,4rem)] font-bold leading-[1.02] tracking-[-0.04em] sm:mt-6"
            style={{ animationDelay: "70ms" }}
          >
            Considered clothing,{" "}
            <span className="relative inline-block">
              <span className="relative z-10">built to be worn</span>
              <span aria-hidden className="absolute bottom-[0.06em] left-0 right-0 h-[0.3em] rounded-full bg-beam" />
            </span>
          </h1>
          <div
            className="mt-7 flex animate-reveal flex-wrap items-center gap-3 md:mt-8"
            style={{ animationDelay: "140ms" }}
          >
            <Link href="/shop" className="btn-beam group/cta">
              Shop everything
              <ArrowUpRight
                size={17}
                strokeWidth={2.4}
                className="transition-transform duration-base ease-swift group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
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

function Artwork({ src, alt, sizes, priority, className = "" }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      unoptimized={shouldUnoptimizeImage(src)}
      sizes={sizes}
      draggable={false}
      className={`media-zoom object-cover ${className}`}
    />
  );
}

function BannerShell({ href, alt, className, children }) {
  if (!href) {
    return <div className={className}>{children}</div>;
  }

  return (
    <Link href={href} className={className} aria-label={alt || undefined}>
      {children}
      {/* Affordance that the panel is clickable, without covering the artwork.
          Present at all times on touch, revealed by the pointer on a mouse. */}
      <span className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-paper-pure/90 text-ink backdrop-blur transition-[opacity,transform] duration-base ease-swift can-hover:translate-y-1 can-hover:opacity-0 can-hover:group-hover:translate-y-0 can-hover:group-hover:opacity-100">
        <ArrowUpRight size={19} strokeWidth={2.2} />
      </span>
    </Link>
  );
}

/* ── Phone: a snap carousel ───────────────────────────────────────────────── */
function MobileHero({ banners, className }) {
  const railRef = useRef(null);
  const [active, setActive] = useState(0);
  const single = banners.length === 1;

  // Whichever card's left edge sits closest to the rail's snap line is the one
  // the reader is looking at. Measured from rects, so it stays right mid-flick.
  const syncActive = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const pad = parseFloat(getComputedStyle(rail).paddingLeft) || 0;
    const origin = rail.getBoundingClientRect().left + pad;
    let closest = 0;
    let best = Infinity;
    Array.from(rail.children).forEach((card, i) => {
      const distance = Math.abs(card.getBoundingClientRect().left - origin);
      if (distance < best) {
        best = distance;
        closest = i;
      }
    });
    setActive(closest);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || single) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncActive);
    };
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      rail.removeEventListener("scroll", onScroll);
    };
  }, [single, syncActive]);

  const goTo = (i) => {
    // scrollIntoView honours the rail's scroll-padding, so the card lands on
    // the same line the snap points use. `block: nearest` keeps the page from
    // scrolling vertically underneath the reader.
    railRef.current?.children?.[i]?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  };

  return (
    <div className={className}>
      <div
        ref={railRef}
        className={single ? "" : "rail bleed gap-3 pb-1"}
        aria-roledescription={single ? undefined : "carousel"}
      >
        {banners.map((banner, i) => (
          <BannerShell
            key={banner._id || i}
            href={banner.href && banner.href !== "/" ? banner.href : null}
            alt={banner.alt || ""}
            className={`group relative block overflow-hidden rounded-3xl bg-haze ${
              // The peek at the right edge is the whole point: it says "there is
              // another one" without a single pixel of chrome.
              single ? "aspect-[4/5] w-full" : "aspect-[4/5] w-[86%] max-w-[420px]"
            }`}
          >
            <Artwork
              src={banner.imageMobile || banner.imageDesktop}
              alt={banner.alt || ""}
              sizes="86vw"
              priority={i === 0}
            />
          </BannerShell>
        ))}
      </div>

      {!single && (
        <div className="mt-3.5 flex items-center justify-center gap-1.5">
          {banners.map((banner, i) => (
            <button
              key={banner._id || i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show banner ${i + 1}`}
              aria-current={active === i}
              className="group/dot flex h-6 items-center px-0.5"
            >
              <span
                className={`h-1.5 rounded-full transition-[width,background-color] duration-base ease-swift ${
                  active === i ? "w-6 bg-ink" : "w-1.5 bg-ink/20"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HeroBanners({ banners = [] }) {
  // Only banners that actually have artwork, capped at the three the grid
  // is built for.
  const live = banners.filter((b) => b?.imageDesktop || b?.imageMobile).slice(0, 3);

  if (live.length === 0) return <EmptyHero />;

  const layout = LAYOUTS[live.length];

  return (
    <section className="container-custom pb-4 pt-2 md:pt-4">
      <MobileHero banners={live} className={layout.mobileOnly} />

      <div className={`${layout.desktopGrid} gap-4`}>
        {live.map((banner, i) => (
          <BannerShell
            key={banner._id || i}
            href={banner.href && banner.href !== "/" ? banner.href : null}
            alt={banner.alt || ""}
            className={`group relative block overflow-hidden rounded-4xl bg-haze transition-shadow duration-slow ease-swift hover:shadow-lift ${layout.slot}`}
          >
            <Artwork
              src={banner.imageDesktop || banner.imageMobile}
              alt={banner.alt || ""}
              sizes={layout.sizes}
              priority={i === 0}
            />
          </BannerShell>
        ))}
      </div>
    </section>
  );
}
