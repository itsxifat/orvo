"use client";

import Link from "next/link";
import { RotateCw } from "lucide-react";

// A storefront page whose data could not be read (the brand ERP is down or slow).
// The frame (navbar, footer) stays; the shopper can try again.
export default function StoreError({ reset }) {
  return (
    <div className="container-custom py-16 md:py-24">
      <div className="card-quiet mx-auto max-w-[560px] px-6 py-12 text-center sm:px-10 sm:py-14">
        <span className="eyebrow">Sorry</span>
        <h1 className="mt-4 text-[clamp(1.75rem,6vw,2.6rem)] font-bold leading-[1.04] tracking-[-0.035em] text-ink">
          We couldn&apos;t load this page
        </h1>
        <p className="mx-auto mt-3 max-w-[40ch] text-[15px] leading-relaxed text-smoke">
          The shop is busy for a moment. Please try again.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center sm:gap-3">
          <button type="button" onClick={() => reset()} className="btn-primary">
            <RotateCw size={16} strokeWidth={2.2} />
            Try again
          </button>
          <Link href="/" className="btn-outline">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
