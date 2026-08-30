"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Pagination({ page, totalPages }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const goTo = (p) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  const round =
    "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200";

  return (
    <div className="mt-14 flex items-center justify-center gap-2">
      <button
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={`${round} bg-paper-pure text-ink shadow-soft hover:bg-ink hover:text-paper-pure disabled:opacity-35 disabled:hover:bg-paper-pure disabled:hover:text-ink disabled:cursor-not-allowed`}
      >
        <ArrowLeft size={17} strokeWidth={2.2} />
      </button>

      <div className="flex items-center gap-1.5">
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="w-6 text-center text-smoke">
              ·
            </span>
          ) : (
            <button
              key={p}
              onClick={() => goTo(p)}
              aria-current={p === page ? "page" : undefined}
              className={`${round} text-[14.5px] font-semibold tabular-nums ${
                p === page
                  ? "bg-ink text-paper-pure"
                  : "text-smoke hover:bg-haze hover:text-ink"
              }`}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={`${round} bg-paper-pure text-ink shadow-soft hover:bg-ink hover:text-paper-pure disabled:opacity-35 disabled:hover:bg-paper-pure disabled:hover:text-ink disabled:cursor-not-allowed`}
      >
        <ArrowRight size={17} strokeWidth={2.2} />
      </button>
    </div>
  );
}
