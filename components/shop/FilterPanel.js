"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X, ChevronDown, Check } from "lucide-react";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

const PRICE_BANDS = [
  { label: "Under Tk 500", min: "", max: "500" },
  { label: "Tk 500 – 1,000", min: "500", max: "1000" },
  { label: "Tk 1,000 – 2,000", min: "1000", max: "2000" },
  { label: "Tk 2,000 and up", min: "2000", max: "" },
];

// The ERP's own list filters (lib/storefront.js → listProducts): "On sale" is a
// size with a regular price above its price, or a live flash price (M39b).
const FLAGS = [
  { key: "newArrival", label: "New arrivals" },
  { key: "onSale", label: "On sale" },
  { key: "featured", label: "Featured" },
];

function buildTree(cats, parentId = null) {
  return cats
    .filter((c) => String(c.parent || "") === String(parentId || ""))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
    .map((c) => ({ ...c, children: buildTree(cats, c._id) }));
}

function Block({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="py-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full py-3.5 text-left"
      >
        <span className="text-[16px] font-semibold text-ink tracking-[-0.02em]">{title}</span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-haze text-ink transition-transform duration-base ease-settle ${
            open ? "rotate-180" : ""
          }`}
        >
          <ChevronDown size={15} strokeWidth={2.2} />
        </span>
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  );
}

function Tick({ on, label, onClick }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className="flex items-center justify-between w-full py-2 text-left group"
    >
      <span className={`text-[15px] transition-colors ${on ? "text-ink font-medium" : "text-smoke group-hover:text-ink"}`}>
        {label}
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-swift ${
          on ? "bg-ink" : "bg-haze group-hover:bg-haze-dark"
        }`}
      >
        {on && <Check size={11} strokeWidth={3.2} className="text-beam" aria-hidden />}
      </span>
    </button>
  );
}

function CatNode({ cat, depth, current, onPick }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = cat.children?.length > 0;
  const active = current === cat.slug;

  return (
    <div>
      <div className="flex items-center gap-1" style={{ paddingLeft: depth * 14 }}>
        <button
          type="button"
          onClick={() => onPick(cat.slug)}
          className={`flex-1 text-left py-2 text-[15px] transition-colors ${
            active ? "text-ink font-semibold" : "text-smoke hover:text-ink"
          }`}
        >
          {cat.name}
        </button>
        {active && (
          <span className="w-5 h-5 rounded-full bg-ink flex items-center justify-center shrink-0">
            <Check size={11} strokeWidth={3.2} className="text-beam" />
          </span>
        )}
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Collapse" : "Expand"}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-smoke transition-[background-color,transform] duration-base ease-settle hover:bg-haze ${
              open ? "rotate-180" : ""
            }`}
          >
            <ChevronDown size={13} strokeWidth={2.4} />
          </button>
        )}
      </div>
      {hasChildren && open && cat.children.map((ch) => (
        <CatNode key={ch._id} cat={ch} depth={depth + 1} current={current} onPick={onPick} />
      ))}
    </div>
  );
}

// Filters live in a right-hand sheet at every breakpoint — the grid keeps the
// full width of the page and the filter state is always one deliberate action
// away, on desktop as much as on a phone.
export default function FilterPanel({ open, onClose, categories = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const tree = buildTree(categories);
  const currentCategory = searchParams.get("category");
  const currentSize = searchParams.get("size");
  const currentMin = searchParams.get("minPrice");
  const currentMax = searchParams.get("maxPrice");

  // A changed filter starts again at page 1, which is the bare address.
  const push = (mutate) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const setParam = (key, value) => push((p) => (value ? p.set(key, value) : p.delete(key)));
  const toggleParam = (key, value) =>
    setParam(key, searchParams.get(key) === value ? null : value);

  const setBand = (band) => {
    const isActive = currentMin === band.min && currentMax === band.max;
    push((p) => {
      if (isActive || !band.min) p.delete("minPrice");
      if (isActive || !band.max) p.delete("maxPrice");
      if (!isActive) {
        if (band.min) p.set("minPrice", band.min);
        if (band.max) p.set("maxPrice", band.max);
      }
    });
  };

  const clearAll = () =>
    push((p) => ["category", "size", "minPrice", "maxPrice", "newArrival", "onSale", "featured"].forEach((k) => p.delete(k)));

  const flagged = FLAGS.some((flag) => searchParams.get(flag.key) === "true");

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-[65] bg-ink/40 backdrop-blur-sm transition-opacity duration-slow ease-swift ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        aria-hidden={!open}
        aria-label="Filters"
        className={`fixed inset-y-3 right-3 z-[75] flex w-[92%] max-w-[420px] flex-col overflow-hidden rounded-4xl bg-paper-pure shadow-pop transition-[transform,visibility] duration-slow ease-soft ${
          // Closed, the sheet is also invisible (once it has slid away), so its
          // controls leave the tab order.
          open ? "visible translate-x-0" : "invisible translate-x-[calc(100%+1rem)]"
        }`}
      >
        <div className="flex items-center justify-between px-6 h-[70px] shrink-0">
          <p className="text-[20px] font-bold text-ink tracking-[-0.03em]">Filters</p>
          <button
            type="button"
            onClick={onClose}
            className="press -mr-1 flex h-10 w-10 items-center justify-center rounded-full bg-haze text-ink transition-colors duration-fast ease-swift hover:bg-haze-dark"
            aria-label="Close filters"
          >
            <X size={19} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 divide-y divide-haze-dark">
          <Block title="Category">
            <button
              type="button"
              onClick={() => setParam("category", null)}
              className={`block py-2 text-[15px] transition-colors ${
                !currentCategory ? "text-ink font-semibold" : "text-smoke hover:text-ink"
              }`}
            >
              Everything
            </button>
            {tree.map((cat) => (
              <CatNode
                key={cat._id}
                cat={cat}
                depth={0}
                current={currentCategory}
                onPick={(slug) => toggleParam("category", slug)}
              />
            ))}
            {tree.length === 0 && <p className="text-[14px] text-smoke py-1">No categories yet.</p>}
          </Block>

          <Block title="Size">
            <div className="flex flex-wrap gap-2">
              {SIZES.map((size) => {
                const on = currentSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleParam("size", size)}
                    className={on ? "chip chip-active min-w-[58px]" : "chip min-w-[58px]"}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </Block>

          <Block title="Price">
            {PRICE_BANDS.map((band) => (
              <Tick
                key={band.label}
                label={band.label}
                on={currentMin === band.min && currentMax === band.max}
                onClick={() => setBand(band)}
              />
            ))}
          </Block>

          <Block title="Collections" defaultOpen={flagged}>
            {FLAGS.map((flag) => (
              <Tick
                key={flag.key}
                label={flag.label}
                on={searchParams.get(flag.key) === "true"}
                onClick={() => toggleParam(flag.key, "true")}
              />
            ))}
          </Block>
        </div>

        <div className="shrink-0 p-5 flex gap-3 bg-paper-pure">
          <button type="button" onClick={clearAll} className="btn-outline flex-1">
            Clear
          </button>
          <button type="button" onClick={onClose} className="btn-primary flex-1">
            Show results
          </button>
        </div>
      </aside>
    </>
  );
}
