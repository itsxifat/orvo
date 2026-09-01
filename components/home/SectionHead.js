import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

// Every homepage block opens the same way: a large tight headline, and the
// link to the rest parked on the baseline at the right.
//
// The link used to be `hidden sm:inline-flex`, so on a phone some sections
// grew a full-width button at the bottom and others simply had no way through
// at all. It is always present now — as a bare disc on a phone, where the
// label would eat the headline's width, and with its label from `sm` up.
export default function SectionHead({ title, href, linkLabel = "View all", tone = "ink" }) {
  const light = tone === "paper";

  return (
    <div className="mb-7 flex items-end justify-between gap-4 md:mb-10 md:gap-6">
      <div className="min-w-0">
        <h2
          className={`text-[clamp(1.75rem,6.4vw,2.9rem)] font-bold leading-[1.02] tracking-[-0.035em] ${
            light ? "text-paper-pure" : "text-ink"
          }`}
        >
          {title}
        </h2>
      </div>

      {href && (
        <Link
          href={href}
          aria-label={linkLabel}
          className={`group inline-flex shrink-0 items-center gap-2 pb-1 text-[14.5px] font-semibold transition-colors duration-base ease-swift sm:pb-1.5 ${
            light ? "text-white/60 hover:text-white" : "text-smoke hover:text-ink"
          }`}
        >
          <span className="hidden sm:inline">{linkLabel}</span>
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-base ease-swift sm:h-8 sm:w-8 ${
              light ? "bg-white/10 group-hover:bg-white/20" : "bg-haze group-hover:bg-beam"
            }`}
          >
            <ArrowUpRight
              size={15}
              strokeWidth={2.2}
              className="transition-transform duration-base ease-swift group-hover:translate-x-px group-hover:-translate-y-px"
            />
          </span>
        </Link>
      )}
    </div>
  );
}
