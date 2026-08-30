import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { shouldUnoptimizeImage } from "@/lib/utils";
import SectionHead from "@/components/home/SectionHead";

// Each collection is a tall rounded panel. The name sits on a frosted plate at
// the foot so it stays readable against any photograph.
function CategoryPanel({ cat, priority = false, tall = false }) {
  return (
    <Link
      href={`/shop?category=${cat.slug}`}
      className={`group relative rounded-4xl overflow-hidden bg-ink flex flex-col justify-end transition-shadow duration-300 hover:shadow-lift ${
        tall ? "aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[520px]" : "aspect-[4/5]"
      }`}
    >
      {cat.image ? (
        <Image
          src={cat.image}
          alt={cat.name}
          fill
          priority={priority}
          unoptimized={shouldUnoptimizeImage(cat.image)}
          className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink-soft to-signal/40" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />

      <div className="relative p-5 md:p-6">
        {cat.description && (
          <p className="text-[13px] text-white/60 mb-1.5">{cat.description}</p>
        )}
        <div className="flex items-end justify-between gap-4">
          <h3 className="text-[clamp(1.6rem,3.2vw,2.3rem)] font-bold text-paper-pure leading-[1.02] tracking-[-0.03em]">
            {cat.name}
          </h3>
          <span className="w-11 h-11 rounded-full bg-paper-pure/95 backdrop-blur flex items-center justify-center text-ink shrink-0 transition-colors group-hover:bg-beam">
            <ArrowUpRight size={19} strokeWidth={2.2} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function CategoryGrid({ categories = [] }) {
  if (categories.length === 0) return null;

  return (
    <section className="container-custom py-14 md:py-20">
      <SectionHead eyebrow="Where to start" title="Collections" href="/shop" />

      <div
        className={`grid gap-4 md:gap-5 ${
          categories.length >= 3
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : categories.length === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        {categories.map((cat, i) => (
          <CategoryPanel key={cat._id || i} cat={cat} priority={i === 0} />
        ))}
      </div>
    </section>
  );
}
