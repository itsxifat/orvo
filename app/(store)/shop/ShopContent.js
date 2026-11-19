"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SlidersHorizontal, X, ChevronDown, Sparkles } from "lucide-react";
import ProductCard from "@/components/shop/ProductCard";
import FilterPanel from "@/components/shop/FilterPanel";
import Pagination from "@/components/shop/Pagination";
import Spinner from "@/components/ui/Spinner";
import { useCustomCampaign } from "@/hooks/useCustomCampaign";

// `short` is what the control shows on a phone. "Price — low to high" next to
// the Filters button left the two of them fighting over a 390px row.
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first", short: "Newest" },
  { value: "featured", label: "Featured", short: "Featured" },
  { value: "price-asc", label: "Price — low to high", short: "Price ↑" },
  { value: "price-desc", label: "Price — high to low", short: "Price ↓" },
];

const FILTER_KEYS = ["category", "size", "minPrice", "maxPrice", "newArrival", "onSale", "featured"];

/**
 * The shop's grid, filters and sort. The server page (page.js) renders the
 * first answer for this address (`initial`, with the `query` it was read for)
 * and the categories, so the products are in the HTML search engines and link
 * previews read; it is only fetched again here when the address changes
 * without a new server render, or the server could not read the ERP.
 */
export default function ShopContent({ initial = null, categories: served = [] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const current = searchParams.toString();

  const [products, setProducts] = useState(initial?.products || []);
  const [total, setTotal] = useState(initial?.total || 0);
  const [totalPages, setTotalPages] = useState(initial?.totalPages || 1);
  const [loading, setLoading] = useState(!initial);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [categories, setCategories] = useState(served);
  const rendered = useRef(initial ? initial.query : null);

  const page = parseInt(searchParams.get("page") || "1", 10) || 1;
  const sort = searchParams.get("sort") || "newest";

  // Custom-URL (?cu=) highlighted products, pinned above the listing.
  const campaign = useCustomCampaign(searchParams.get("cu"));
  const highlights = campaign?.highlightProducts || [];

  useEffect(() => {
    if (served.length) return;
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [served.length]);

  useEffect(() => {
    // The server already rendered this address's products.
    if (rendered.current !== null && rendered.current === current) {
      rendered.current = null;
      return;
    }
    rendered.current = null;
    setLoading(true);
    fetch(`/api/products?${current}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [current]);

  const categorySlug = searchParams.get("category");
  const searchQuery = searchParams.get("search");
  const activeCat = categories.find((c) => c.slug === categorySlug);
  // "On sale" is the ERP's own filter (M39b): a size with a regular price above
  // its price, or a live flash price. The flash sales keep their own pages.
  const onSale = searchParams.get("onSale") === "true";
  const title = activeCat
    ? activeCat.name
    : searchQuery
    ? searchQuery
    : onSale
    ? "On sale"
    : searchParams.get("newArrival") === "true"
    ? "New arrivals"
    : searchParams.get("featured") === "true"
    ? "Featured"
    : "Everything";

  const chips = useMemo(() => {
    const out = [];
    if (categorySlug) out.push({ key: "category", label: activeCat?.name || categorySlug });
    if (searchParams.get("size")) out.push({ key: "size", label: `Size ${searchParams.get("size")}` });
    const min = searchParams.get("minPrice");
    const max = searchParams.get("maxPrice");
    if (min || max) {
      out.push({
        key: "price",
        label: min && max ? `Tk ${min}–${max}` : min ? `Tk ${min}+` : `Under Tk ${max}`,
      });
    }
    if (searchParams.get("newArrival") === "true") out.push({ key: "newArrival", label: "New arrivals" });
    if (searchParams.get("onSale") === "true") out.push({ key: "onSale", label: "On sale" });
    if (searchParams.get("featured") === "true") out.push({ key: "featured", label: "Featured" });
    return out;
  }, [searchParams, categorySlug, activeCat]);

  // A changed filter or sort starts again at page 1, which is the bare address.
  const go = (params) => {
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const dropParam = (key) => {
    const params = new URLSearchParams(current);
    if (key === "price") {
      params.delete("minPrice");
      params.delete("maxPrice");
    } else {
      params.delete(key);
    }
    go(params);
  };

  const clearAll = () => {
    const params = new URLSearchParams(current);
    FILTER_KEYS.forEach((k) => params.delete(k));
    go(params);
  };

  const setSort = (value) => {
    const params = new URLSearchParams(current);
    params.set("sort", value);
    go(params);
    setSortOpen(false);
  };

  const activeSort = SORT_OPTIONS.find((o) => o.value === sort) || SORT_OPTIONS[0];

  return (
    <div className="container-custom pb-16">
      {/* ── Masthead ────────────────────────────────────────────────────────*/}
      <div className="pb-6 pt-5 md:pb-10 md:pt-10">
        {searchQuery && <span className="eyebrow">Search results</span>}
        <div
          className={`flex flex-wrap items-end justify-between gap-x-8 gap-y-3 ${
            searchQuery ? "mt-4" : ""
          }`}
        >
          <h1 className="text-[clamp(2rem,8vw,4rem)] font-bold leading-[1] tracking-[-0.04em] text-ink">
            {title}
          </h1>
          <p className="pb-1.5 text-[14px] tabular-nums text-smoke md:pb-2 md:text-[15px]">
            {loading ? "Loading…" : `${total} item${total === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {/* ── Control bar ─────────────────────────────────────────────────────*/}
      <div className="sticky top-[var(--header-h)] z-30 -mx-1 bg-paper/85 px-1 py-2.5 backdrop-blur-xl md:py-3">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="press inline-flex items-center gap-2.5 rounded-full bg-paper-pure px-4 py-2.5 text-[14px] font-semibold text-ink shadow-soft transition-shadow duration-base ease-swift hover:shadow-lift sm:px-5 sm:py-3 sm:text-[14.5px]"
          >
            <SlidersHorizontal size={16} strokeWidth={2.2} />
            Filters
            {chips.length > 0 && (
              <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-ink text-paper-pure flex items-center justify-center text-[12px] font-bold tabular-nums">
                {chips.length}
              </span>
            )}
          </button>

          {/* Closes when focus leaves the control and its menu (a click
              outside, or tabbing past the last option). */}
          <div
            className="relative"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setSortOpen(false);
            }}
          >
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              className="press inline-flex items-center gap-2 rounded-full bg-paper-pure px-4 py-2.5 text-[14px] font-semibold text-ink shadow-soft transition-shadow duration-base ease-swift hover:shadow-lift sm:px-5 sm:py-3 sm:text-[14.5px]"
            >
              <span className="hidden font-normal text-smoke sm:inline">Sort</span>
              <span className="sm:hidden">{activeSort.short}</span>
              <span className="hidden sm:inline">{activeSort.label}</span>
              <ChevronDown
                size={15}
                strokeWidth={2.2}
                className={`transition-transform duration-base ease-settle ${sortOpen ? "rotate-180" : ""}`}
              />
            </button>

            {sortOpen && (
              <div
                role="listbox"
                aria-label="Sort"
                className="absolute right-0 top-full z-40 mt-2 w-64 origin-top-right animate-pop rounded-2xl bg-paper-pure p-2 shadow-pop"
              >
                {SORT_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={o.value === sort}
                    onMouseDown={() => setSort(o.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSort(o.value);
                      }
                    }}
                    className={`block w-full rounded-xl px-4 py-2.5 text-left text-[14.5px] transition-colors duration-fast ease-swift ${
                      o.value === sort
                        ? "bg-haze font-semibold text-ink"
                        : "text-smoke hover:bg-haze hover:text-ink"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {chips.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => dropParam(chip.key)}
                aria-label={`Remove filter: ${chip.label}`}
                className="press group inline-flex items-center gap-2 rounded-full bg-ink py-2 pl-4 pr-3 text-[13.5px] font-medium text-paper-pure transition-colors duration-fast ease-swift hover:bg-ink-soft"
              >
                {chip.label}
                <X size={13} strokeWidth={2.6} className="opacity-60 group-hover:opacity-100" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="text-[13.5px] font-semibold text-smoke hover:text-ink transition-colors ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="pt-6 md:pt-8">
        {/* Highlighted products from a campaign link (?cu=) — pinned on top. */}
        {highlights.length > 0 && (
          <div className="mb-12 md:mb-14">
            <div className="flex items-center gap-2.5 mb-6">
              <span className="w-8 h-8 rounded-full bg-beam flex items-center justify-center">
                <Sparkles size={15} className="text-ink" />
              </span>
              <h2 className="text-[20px] font-bold text-ink tracking-[-0.03em]">Featured</h2>
            </div>
            <div className="grid grid-cols-2 gap-x-3.5 gap-y-7 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 xl:grid-cols-4">
              {highlights.map((product) => (
                <ProductCard key={`hl-${product._id}`} product={product} />
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-28">
            <Spinner size="lg" />
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-4xl bg-paper-pure px-6 py-16 text-center shadow-soft md:py-24">
            <p className="text-[21px] font-bold tracking-[-0.03em] text-ink md:text-[24px]">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-[40ch] text-[15px] leading-relaxed text-smoke">
              No products match this combination. Try loosening a filter or two.
            </p>
            {chips.length > 0 && (
              <button type="button" onClick={clearAll} className="btn-primary mt-8">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3.5 gap-y-7 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 xl:grid-cols-4">
            {products.map((product, i) => (
              <ProductCard key={product._id} product={product} priority={i < 4} />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} />
      </div>

      <FilterPanel open={filtersOpen} onClose={() => setFiltersOpen(false)} categories={categories} />
    </div>
  );
}
