"use client";

import { Star } from "lucide-react";
import SectionHead from "@/components/home/SectionHead";

function getInitials(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// Reviews run as a hand-scrolled rail of rounded cards — no carousel chrome and
// nothing auto-advancing under the reader.
export default function Testimonials({ testimonials = [] }) {
  if (testimonials.length === 0) return null;

  const average =
    testimonials.reduce((sum, t) => sum + (t.rating || 5), 0) / testimonials.length;

  return (
    <section className="py-14 md:py-20">
      <div className="container-custom">
        <SectionHead eyebrow="Straight from customers" title="Worn and rated" />

        <div className="flex items-center gap-3 -mt-4 mb-8">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={16}
                className={i < Math.round(average) ? "fill-beam text-beam" : "fill-haze-dark text-haze-dark"}
              />
            ))}
          </div>
          <p className="text-[14px] text-smoke tabular-nums">
            {average.toFixed(1)} average · {testimonials.length} review
            {testimonials.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 md:gap-5 px-5 sm:px-8 lg:px-10 min-w-max">
          {testimonials.map((t, i) => (
            <figure
              key={t._id || i}
              className="w-[300px] sm:w-[380px] shrink-0 rounded-3xl bg-paper-pure shadow-soft p-7 flex flex-col"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    size={14}
                    className={j < (t.rating || 5) ? "fill-beam text-beam" : "fill-haze-dark text-haze-dark"}
                  />
                ))}
              </div>

              <blockquote className="text-[15.5px] leading-[1.65] text-ink/80 mt-5 flex-1">
                {t.text}
              </blockquote>

              <figcaption className="flex items-center gap-3 mt-7">
                <span className="w-11 h-11 rounded-full bg-beam text-ink flex items-center justify-center text-[14px] font-bold shrink-0">
                  {getInitials(t.name)}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-ink truncate">{t.name}</span>
                  <span className="block text-[13px] text-smoke truncate">
                    {t.location ? `${t.location} · ` : ""}Verified purchase
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
          {/* Tail spacer so the last card can clear the right edge */}
          <span className="w-1 shrink-0" aria-hidden />
        </div>
      </div>
    </section>
  );
}
