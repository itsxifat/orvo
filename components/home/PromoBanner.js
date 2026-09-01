import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Reveal from "@/components/motion/Reveal";

function splitHeadline(headline) {
  const trimmed = (headline || "").trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) return { main: "", highlight: trimmed };
  return { main: trimmed.slice(0, lastSpace), highlight: trimmed.slice(lastSpace + 1) };
}

// A rounded black slab with the offer on the left and a big soft yellow disc
// carrying the number on the right.
//
// The disc used to be `hidden lg:flex`, which meant a phone got the offer with
// its entire visual removed — black slab, some text, a button. So mobile gets
// its own arrangement of the same parts: the number rides as a yellow disc
// beside the headline, sized to sit in the copy rather than tower over it.
export default function PromoBanner({ promoBanner }) {
  if (!promoBanner?.enabled) return null;

  const { main, highlight } = splitHeadline(promoBanner.headline);
  const badge = promoBanner.decorativeText;

  return (
    <section className="container-custom py-8 md:py-12">
      <Reveal className="relative overflow-hidden rounded-4xl bg-ink text-paper-pure md:rounded-5xl">
        {/* Soft glows so the slab isn't flat */}
        <div aria-hidden className="absolute -right-16 -top-24 h-[420px] w-[420px] rounded-full bg-beam/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 left-1/4 h-[380px] w-[380px] rounded-full bg-signal/15 blur-3xl" />

        <div className="relative grid grid-cols-1 items-center gap-10 p-7 sm:p-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:p-16">
          <div>
            {/* Phone: the number sits in the copy, at a size that reads as a
                stamp on the offer rather than as decoration cropped off-screen. */}
            {badge && (
              <div className="mb-5 flex h-[92px] w-[92px] animate-float items-center justify-center rounded-full bg-beam lg:hidden">
                <span className="text-[34px] font-bold leading-none tracking-[-0.05em] text-ink">
                  {badge}
                </span>
              </div>
            )}

            <h2 className="text-[clamp(2rem,8vw,4rem)] font-bold leading-[1.02] tracking-[-0.04em]">
              {main && <>{main} </>}
              <span className="text-beam">{highlight}</span>
            </h2>

            {promoBanner.subtext && (
              <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-white/60 sm:mt-5 sm:text-[16px]">
                {promoBanner.subtext}
              </p>
            )}

            <div className="mt-7 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              {promoBanner.primaryLabel && promoBanner.primaryHref && (
                <Link href={promoBanner.primaryHref} className="btn-beam group/cta">
                  {promoBanner.primaryLabel}
                  <ArrowUpRight
                    size={17}
                    strokeWidth={2.4}
                    className="transition-transform duration-base ease-swift group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
                  />
                </Link>
              )}
              {promoBanner.secondaryLabel && promoBanner.secondaryHref && (
                <Link href={promoBanner.secondaryHref} className="btn-invert-outline">
                  {promoBanner.secondaryLabel}
                </Link>
              )}
            </div>

            {promoBanner.note && (
              <p className="mt-5 text-[13.5px] text-white/40">{promoBanner.note}</p>
            )}
          </div>

          {badge && (
            <div className="hidden items-center justify-center lg:flex">
              <div className="relative flex h-[300px] w-[300px] animate-float items-center justify-center rounded-full bg-beam">
                <span className="text-[clamp(3rem,7vw,5.5rem)] font-bold leading-none tracking-[-0.05em] text-ink">
                  {badge}
                </span>
              </div>
            </div>
          )}
        </div>
      </Reveal>
    </section>
  );
}
