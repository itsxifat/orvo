"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

const round =
  "press flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-fast ease-swift";
const arrowLive = `${round} bg-paper-pure text-ink shadow-soft hover:bg-ink hover:text-paper-pure`;
const arrowOff = `${round} bg-paper-pure text-ink shadow-soft opacity-35`;

// The shop's page numbers as real links (`?page=3`), so search engines can walk
// every page of a listing and reach every product; page 1 is the bare address.
export default function Pagination({ page, totalPages }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const hrefFor = (p) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  const arrow = (to, label, Icon) =>
    to < 1 || to > totalPages ? (
      <span aria-hidden className={arrowOff}>
        <Icon size={17} strokeWidth={2.2} />
      </span>
    ) : (
      <Link href={hrefFor(to)} aria-label={label} rel={label === "Next page" ? "next" : "prev"} className={arrowLive}>
        <Icon size={17} strokeWidth={2.2} />
      </Link>
    );

  return (
    <nav aria-label="Pages" className="mt-14 flex items-center justify-center gap-2">
      {arrow(page - 1, "Previous page", ArrowLeft)}

      <div className="flex items-center gap-1.5">
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} aria-hidden className="w-6 text-center text-smoke">
              ·
            </span>
          ) : p === page ? (
            <span
              key={p}
              aria-current="page"
              className={`${round} bg-ink text-[14.5px] font-semibold tabular-nums text-paper-pure`}
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={hrefFor(p)}
              aria-label={`Page ${p}`}
              className={`${round} text-[14.5px] font-semibold tabular-nums text-smoke hover:bg-haze hover:text-ink`}
            >
              {p}
            </Link>
          )
        )}
      </div>

      {arrow(page + 1, "Next page", ArrowRight)}
    </nav>
  );
}
