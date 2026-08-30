"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ArrowLeft, ArrowRight, Star } from "lucide-react";
import { shouldUnoptimizeImage } from "@/lib/utils";

const AUTOPLAY_MS = 6500;

// Shown only until slides are configured in the admin.
const PLACEHOLDER = [
  {
    imageDesktop: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1760&q=80",
    imageMobile: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80",
    href: "/shop",
    eyebrow: "Season 01",
    title: "Built for the everyday",
    subtitle: "Considered cuts, honest fabric, priced to be worn out — not saved for later.",
    ctaLabel: "Shop the drop",
  },
  {
    imageDesktop: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1760&q=80",
    imageMobile: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&q=80",
    href: "/shop?newArrival=true",
    eyebrow: "Just landed",
    title: "New arrivals",
    subtitle: "Fresh pieces added every Thursday, in limited runs.",
    ctaLabel: "See what is new",
  },
];

// Split the headline so the last word can carry the yellow highlight.
function splitTail(text) {
  const t = (text || "").trim();
  const i = t.lastIndexOf(" ");
  if (i === -1) return { head: "", tail: t };
  return { head: t.slice(0, i), tail: t.slice(i + 1) };
}

export default function HeroSlider({ slides }) {
  const items = slides?.length ? slides : PLACEHOLDER;
  const count = items.length;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  const go = useCallback((next) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    timer.current = setTimeout(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearTimeout(timer.current);
  }, [index, count, paused]);

  const active = items[index] || items[0];
  const { head, tail } = splitTail(active?.title || "The new season is live");

  return (
    <section
      className="container-custom pt-2 pb-4 md:pt-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="relative rounded-4xl md:rounded-5xl overflow-hidden bg-ink text-paper-pure min-h-[560px] md:min-h-[620px] lg:min-h-[680px] flex">

        {/* Imagery — full bleed inside the rounded frame */}
        {items.map((slide, i) => {
          const desktop = slide.imageDesktop || slide.imageMobile;
          const mobile = slide.imageMobile || slide.imageDesktop;
          if (!desktop && !mobile) return null;
          const on = i === index;
          return (
            <div
              key={i}
              aria-hidden={!on}
              className={`absolute inset-0 transition-opacity duration-[900ms] ease-out ${
                on ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={desktop}
                alt={slide.title || ""}
                fill
                priority={i === 0}
                unoptimized={shouldUnoptimizeImage(desktop)}
                sizes="(max-width: 768px) 100vw, 100vw"
                className={`hidden md:block object-cover transition-transform duration-[8000ms] ease-out ${
                  on ? "scale-110" : "scale-100"
                }`}
              />
              <Image
                src={mobile}
                alt={slide.title || ""}
                fill
                priority={i === 0}
                unoptimized={shouldUnoptimizeImage(mobile)}
                sizes="100vw"
                className={`md:hidden object-cover transition-transform duration-[8000ms] ease-out ${
                  on ? "scale-110" : "scale-100"
                }`}
              />
            </div>
          );
        })}

        {/* Scrim so the copy always holds against the photograph */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/10 md:bg-gradient-to-r md:from-ink md:via-ink/75 md:to-transparent" />

        {/* Copy */}
        <div className="relative z-10 flex flex-col justify-end md:justify-center w-full p-7 sm:p-10 lg:p-14">
          <div className="max-w-[620px]">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 text-[13px] font-semibold text-paper-pure ring-1 ring-white/15">
              <span className="w-1.5 h-1.5 rounded-full bg-beam" />
              {active?.eyebrow || "New collection"}
            </span>

            <div key={index} className="animate-rise">
              <h1 className="text-[clamp(2.6rem,6.5vw,4.8rem)] font-bold leading-[0.98] tracking-[-0.04em] mt-6">
                {head && <>{head} </>}
                <span className="relative inline-block">
                  <span className="relative z-10">{tail}</span>
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 bottom-[0.08em] h-[0.32em] bg-beam rounded-full -z-0"
                  />
                </span>
              </h1>
              {active?.subtitle && (
                <p className="text-[15.5px] md:text-[17px] text-white/65 leading-relaxed mt-5 max-w-[46ch]">
                  {active.subtitle}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-8">
              <Link href={active?.href || "/shop"} className="btn-beam group">
                {active?.ctaLabel || "Shop now"}
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

            {/* Social proof strip */}
            <div className="flex items-center gap-3 mt-8">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className="fill-beam text-beam" />
                ))}
              </div>
              <p className="text-[13.5px] text-white/50">
                Loved by 5,000+ customers across Bangladesh
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        {count > 1 && (
          <div className="absolute z-20 bottom-6 right-6 sm:bottom-8 sm:right-8 flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 mr-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? "w-7 bg-beam" : "w-1.5 bg-white/35 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/15 flex items-center justify-center text-paper-pure hover:bg-white/20 transition-colors"
            >
              <ArrowLeft size={17} strokeWidth={2} />
            </button>
            <button
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/15 flex items-center justify-center text-paper-pure hover:bg-white/20 transition-colors"
            >
              <ArrowRight size={17} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
