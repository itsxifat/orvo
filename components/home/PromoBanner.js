import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

function splitHeadline(headline) {
  const trimmed = (headline || "").trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) return { main: "", highlight: trimmed };
  return { main: trimmed.slice(0, lastSpace), highlight: trimmed.slice(lastSpace + 1) };
}

// A rounded black slab with the offer on the left and a big soft yellow disc
// carrying the number on the right.
export default function PromoBanner({ promoBanner }) {
  if (!promoBanner?.enabled) return null;

  const { main, highlight } = splitHeadline(promoBanner.headline);

  return (
    <section className="container-custom py-8 md:py-12">
      <div className="relative rounded-4xl md:rounded-5xl bg-ink text-paper-pure overflow-hidden">
        {/* Soft glows so the slab isn't flat */}
        <div aria-hidden className="absolute -top-24 -right-16 w-[420px] h-[420px] rounded-full bg-beam/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 left-1/4 w-[380px] h-[380px] rounded-full bg-signal/15 blur-3xl" />

        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-center gap-10 p-8 sm:p-12 lg:p-16">
          <div>
            <span className="eyebrow bg-white/10 text-white/75">Limited time</span>
            <h2 className="text-[clamp(2.2rem,5.5vw,4rem)] font-bold leading-[1.02] tracking-[-0.04em] mt-5">
              {main && (
                <>
                  {main}{" "}
                </>
              )}
              <span className="text-beam">{highlight}</span>
            </h2>

            {promoBanner.subtext && (
              <p className="text-[16px] text-white/60 leading-relaxed mt-5 max-w-[46ch]">
                {promoBanner.subtext}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-8">
              {promoBanner.primaryLabel && promoBanner.primaryHref && (
                <Link href={promoBanner.primaryHref} className="btn-beam group">
                  {promoBanner.primaryLabel}
                  <ArrowUpRight
                    size={17}
                    strokeWidth={2.4}
                    className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
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
              <p className="text-[13.5px] text-white/40 mt-5">{promoBanner.note}</p>
            )}
          </div>

          {promoBanner.decorativeText && (
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-[300px] h-[300px] rounded-full bg-beam flex items-center justify-center animate-float">
                <span className="text-[clamp(3rem,7vw,5.5rem)] font-bold text-ink tracking-[-0.05em] leading-none">
                  {promoBanner.decorativeText}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
