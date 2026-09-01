import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { shouldUnoptimizeImage } from "@/lib/utils";
import SectionHead from "@/components/home/SectionHead";
import Reveal from "@/components/motion/Reveal";

// Collections.
//
// Desktop keeps the three tall panels side by side — they are the most
// atmospheric thing on the page and they deserve the room.
//
// A phone gets a rail instead. Stacked, those same panels were 4:5 each, so
// three collections cost three screens of scrolling to see three names. As a
// rail they cost one thumb movement, the next panel peeks at the edge to say
// there is more, and the panels can stay tall and photographic instead of
// being squashed into letterboxes to fit.

function CategoryPanel({ cat, priority = false, className = "" }) {
  return (
    <Link
      href={`/shop?category=${cat.slug}`}
      className={`group relative flex flex-col justify-end overflow-hidden rounded-4xl bg-ink transition-shadow duration-slow ease-swift hover:shadow-lift ${className}`}
    >
      {cat.image ? (
        <Image
          src={cat.image}
          alt={cat.name}
          fill
          priority={priority}
          unoptimized={shouldUnoptimizeImage(cat.image)}
          className="media-zoom object-cover"
          sizes="(max-width: 768px) 80vw, 33vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink-soft to-signal/40" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />

      <div className="relative p-5 md:p-6">
        {cat.description && (
          <p className="mb-1.5 line-clamp-1 text-[13px] text-white/60">{cat.description}</p>
        )}
        <div className="flex items-end justify-between gap-4">
          <h3 className="text-[clamp(1.5rem,5vw,2.3rem)] font-bold leading-[1.02] tracking-[-0.03em] text-paper-pure">
            {cat.name}
          </h3>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper-pure/95 text-ink backdrop-blur transition-colors duration-base ease-swift group-hover:bg-beam">
            <ArrowUpRight size={19} strokeWidth={2.2} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function CategoryGrid({ categories = [] }) {
  if (categories.length === 0) return null;

  const many = categories.length > 1;

  return (
    <section className="container-custom py-12 md:py-20">
      <SectionHead title="Collections" href="/shop" />

      {/* Phone — a rail. Only when there is more than one thing to scroll to. */}
      {many && (
        <div className="rail bleed gap-3 pb-1 sm:hidden">
          {categories.map((cat, i) => (
            <CategoryPanel
              key={cat._id || i}
              cat={cat}
              priority={i === 0}
              className="aspect-[4/5] w-[78%] max-w-[340px]"
            />
          ))}
        </div>
      )}

      {/* Tablet and up — the panels side by side. */}
      <div
        className={`${many ? "hidden sm:grid" : "grid"} gap-4 md:gap-5 ${
          categories.length >= 3
            ? "sm:grid-cols-2 lg:grid-cols-3"
            : categories.length === 2
            ? "sm:grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        {categories.map((cat, i) => (
          <Reveal key={cat._id || i} delay={i * 70}>
            <CategoryPanel cat={cat} priority={i === 0} className="aspect-[4/5] w-full" />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
