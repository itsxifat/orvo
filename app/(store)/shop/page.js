"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SlidersHorizontal, X, ChevronDown, Sparkles } from "lucide-react";
import ProductCard from "@/components/shop/ProductCard";
import FilterPanel from "@/components/shop/FilterPanel";
import Pagination from "@/components/shop/Pagination";
import Spinner from "@/components/ui/Spinner";
import { useCustomCampaign } from "@/hooks/useCustomCampaign";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price — low to high" },
  { value: "price-desc", label: "Price — high to low" },
];

const FILTER_KEYS = ["category", "size", "minPrice", "maxPrice", "newArrival", "onSale", "featured"];

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const sort = searchParams.get("sort") || "newest";

  // Custom-URL (?cu=) highlighted products, pinned above the listing.
  const campaign = useCustomCampaign(searchParams.get("cu"));
  const highlights = campaign?.highlightProducts || [];

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(searchParams.toString());
    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [searchParams]);

  const categorySlug = searchParams.get("category");
  const searchQuery = searchParams.get("search");
  const activeCat = categories.find((c) => c.slug === categorySlug);
  const title = activeCat ? activeCat.name : searchQuery ? searchQuery : "Everything";

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

  const dropParam = (key) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "price") {
      params.delete("minPrice");
      params.delete("maxPrice");
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((k) => params.delete(k));
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const setSort = (value) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
    setSortOpen(false);
  };

  const activeSort = SORT_OPTIONS.find((o) => o.value === sort) || SORT_OPTIONS[0];

  return (
    <div className="container-custom pb-16">
      {/* ── Masthead ────────────────────────────────────────────────────────*/}
      <div className="pt-6 pb-8 md:pt-10 md:pb-10">
        <span className="eyebrow">{searchQuery ? "Search results" : "Catalogue"}</span>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 mt-4">
          <h1 className="text-[clamp(2.4rem,6vw,4rem)] font-bold leading-[1] tracking-[-0.04em] text-ink">
            {title}
          </h1>
          <p className="text-[15px] text-smoke tabular-nums pb-2">
            {loading ? "Loading…" : `${total} item${total === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {/* ── Control bar ─────────────────────────────────────────────────────*/}
      <div className="sticky top-[var(--header-h)] z-30 -mx-1 px-1 py-3 bg-paper/85 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setFiltersOpen(true)}
            className="inline-flex items-center gap-2.5 rounded-full bg-paper-pure shadow-soft px-5 py-3 text-[14.5px] font-semibold text-ink hover:shadow-lift transition-shadow"
          >
            <SlidersHorizontal size={16} strokeWidth={2.2} />
            Filters
            {chips.length > 0 && (
              <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-ink text-paper-pure flex items-center justify-center text-[12px] font-bold tabular-nums">
                {chips.length}
              </span>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setSortOpen((v) => !v)}
              onBlur={() => setTimeout(() => setSortOpen(false), 150)}
              className="inline-flex items-center gap-2 rounded-full bg-paper-pure shadow-soft px-5 py-3 text-[14.5px] font-semibold text-ink hover:shadow-lift transition-shadow"
            >
              <span className="hidden sm:inline font-normal text-smoke">Sort</span>
              {activeSort.label}
              <ChevronDown
                size={15}
                strokeWidth={2.2}
                className={`transition-transform ${sortOpen ? "rotate-180" : ""}`}
              />
            </button>

            {sortOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-paper-pure shadow-pop p-2 z-40 animate-fade-in">
                {SORT_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onMouseDown={() => setSort(o.value)}
                    className={`block w-full text-left rounded-xl px-4 py-2.5 text-[14.5px] transition-colors ${
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
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {chips.map((chip) => (
              <button
                key={chip.key}
                onClick={() => dropParam(chip.key)}
                className="group inline-flex items-center gap-2 rounded-full bg-ink text-paper-pure pl-4 pr-3 py-2 text-[13.5px] font-medium hover:bg-ink-soft transition-colors"
              >
                {chip.label}
                <X size={13} strokeWidth={2.6} className="opacity-60 group-hover:opacity-100" />
              </button>
            ))}
            <button
              onClick={clearAll}
              className="text-[13.5px] font-semibold text-smoke hover:text-ink transition-colors ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="pt-8">
        {/* Highlighted products from a custom URL (?cu=) — pinned on top. */}
        {highlights.length > 0 && (
          <div className="mb-14">
            <div className="flex items-center gap-2.5 mb-6">
              <span className="w-8 h-8 rounded-full bg-beam flex items-center justify-center">
                <Sparkles size={15} className="text-ink" />
              </span>
              <h2 className="text-[20px] font-bold text-ink tracking-[-0.03em]">Picked for you</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
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
          <div className="rounded-4xl bg-paper-pure shadow-soft py-24 text-center px-6">
            <p className="text-[24px] font-bold text-ink tracking-[-0.03em]">Nothing here yet</p>
            <p className="text-[15px] text-smoke mt-2 max-w-[40ch] mx-auto leading-relaxed">
              No products match this combination. Try loosening a filter or two.
            </p>
            {chips.length > 0 && (
              <button onClick={clearAll} className="btn-primary mt-8">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} />
      </div>

      <FilterPanel open={filtersOpen} onClose={() => setFiltersOpen(false)} categories={categories} />
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-28">
          <Spinner size="lg" />
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}
