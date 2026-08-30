import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

// Every homepage block opens the same way: a small pill label, a large tight
// headline, and an optional link parked on the baseline at the right.
export default function SectionHead({ eyebrow, title, href, linkLabel = "View all", tone = "ink" }) {
  const light = tone === "paper";

  return (
    <div className="flex items-end justify-between gap-6 mb-8 md:mb-10">
      <div className="min-w-0">
        {eyebrow && (
          <span className={light ? "eyebrow bg-white/10 text-white/70" : "eyebrow"}>{eyebrow}</span>
        )}
        <h2
          className={`text-[clamp(1.9rem,4.6vw,2.9rem)] font-bold leading-[1.02] tracking-[-0.035em] mt-4 ${
            light ? "text-paper-pure" : "text-ink"
          }`}
        >
          {title}
        </h2>
      </div>

      {href && (
        <Link
          href={href}
          className={`hidden sm:inline-flex items-center gap-2 shrink-0 text-[14.5px] font-semibold transition-colors pb-1.5 ${
            light ? "text-white/60 hover:text-white" : "text-smoke hover:text-ink"
          }`}
        >
          {linkLabel}
          <span
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              light ? "bg-white/10 group-hover:bg-white/20" : "bg-haze"
            }`}
          >
            <ArrowUpRight size={15} strokeWidth={2.2} />
          </span>
        </Link>
      )}
    </div>
  );
}
