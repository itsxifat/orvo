"use client";

import { Ruler } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";

// A dot of colour beside a colour's name, for the common names. A colour the
// ERP names otherwise ("Ocean Mist") shows its name alone.
const SWATCHES = {
  white: "#FFFFFF", "off white": "#F4F1EA", cream: "#F1E9DA", ivory: "#F6F1E5", beige: "#D9C7A7",
  khaki: "#B5A27B", sand: "#D6C29F", camel: "#B88A55", tan: "#C19A6B", brown: "#6B4A33",
  chocolate: "#4A2E21", coffee: "#5B3E2E", black: "#1B1B1B", charcoal: "#3A3A3A", grey: "#9A9A9A",
  gray: "#9A9A9A", silver: "#C7C7C7", navy: "#1F2A44", blue: "#3B5BA9", "sky blue": "#8EC5E8",
  teal: "#2D7D7A", green: "#3F7D4E", olive: "#6B6B3A", mint: "#BFE3CF", red: "#B3261E",
  maroon: "#6B1E2A", burgundy: "#6D1F33", wine: "#6A1B2E", pink: "#E8A5B5", peach: "#F3C1A4",
  orange: "#E07A2F", rust: "#A9502A", mustard: "#D4A12A", yellow: "#EBC944", purple: "#6A4C93",
  lavender: "#C8B6E2", lilac: "#C8A2C8",
};

function swatchOf(colour) {
  const name = String(colour || "").trim().toLowerCase();
  return SWATCHES[name] || SWATCHES[name.split(/\s+/).pop()] || null;
}

// The colours a product comes in (when it has more than one): picking one shows
// that colour's sizes and switches the gallery to its photos.
export function ColourSelector({ colours = [], selected, onChange, variants = [] }) {
  if (colours.length < 2) return null;
  return (
    <div>
      <p className="mb-4 text-[15px] font-semibold text-ink">
        Colour
        {selected && <span className="ml-2 font-normal text-smoke">· {selected}</span>}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Colour">
        {colours.map((colour) => {
          const isSelected = selected === colour;
          const available = variants.some((v) => v.colour === colour && v.stock > 0);
          const swatch = swatchOf(colour);
          return (
            <button
              key={colour}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(colour)}
              className={cn(
                "chip min-h-[44px] gap-2 py-2.5",
                isSelected && "chip-active",
                !available && !isSelected && "text-smoke"
              )}
            >
              {swatch && (
                <span
                  aria-hidden
                  className={cn("h-4 w-4 shrink-0 rounded-full border", isSelected ? "border-white/30" : "border-ink/15")}
                  style={{ background: swatch }}
                />
              )}
              {colour}
              {!available && <span className="sr-only"> (sold out)</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The line under the sizes — one row, always in the same place: why "Add to
// bag" did nothing, how many are left (at a flash price, or at all), and the
// chosen size's price.
function StockLine({ selected, error }) {
  if (error) {
    return (
      <>
        <span className="h-2 w-2 shrink-0 rounded-full bg-signal" />
        <span className="text-[14px] font-medium text-signal">Pick a size first</span>
      </>
    );
  }
  if (!selected) return <span className="text-[14px] text-smoke">Pick a size to see availability</span>;

  const deal = selected.flash;
  let dot = "bg-emerald-500";
  let text = "In stock, ships in 24 hours";
  if (selected.stock === 0) {
    dot = "bg-smoke";
    text = "Out of stock";
  } else if (deal && deal.remaining > 0 && deal.remaining <= 10) {
    dot = "bg-signal animate-pulse-dot";
    text = `Only ${deal.remaining} left at this price`;
  } else if (selected.stock <= 5) {
    dot = "bg-signal animate-pulse-dot";
    text = `Only ${selected.stock} left`;
  }
  return (
    <>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />
      <span className="text-[14px] text-smoke">{text}</span>
      {selected.price != null && (
        <span className={cn("ml-auto text-[15px] font-semibold tabular-nums", selected.compareAt > selected.price ? "text-signal" : "text-ink")}>
          {formatPrice(selected.price)}
        </span>
      )}
    </>
  );
}

/**
 * The sizes, as pills. A size shows its price only when the sizes are priced
 * differently; screen readers always hear its price, its regular price when it
 * is reduced, and "sold out". `labelOf` names a size within the chosen colour.
 * `error` counts the tries to add without a size: each one shakes the sizes
 * again.
 */
export default function VariantSelector({
  variants = [],
  selectedSize,
  onSizeChange,
  onSizeGuideClick,
  hasSizeChart = false,
  labelOf = (v) => v.size,
  error = 0,
}) {
  const selected = variants.find((v) => v.size === selectedSize);
  const pricesVary = new Set(variants.map((v) => v.price)).size > 1;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold text-ink">
          Size
          {selected && <span className="ml-2 font-normal text-smoke">· {labelOf(selected)}</span>}
        </p>
        {hasSizeChart && (
          <button
            type="button"
            onClick={onSizeGuideClick}
            className="link-draw inline-flex items-center gap-1.5 text-[14px] font-medium text-smoke transition-colors hover:text-ink"
          >
            <Ruler size={14} strokeWidth={2} aria-hidden />
            Size guide
          </button>
        )}
      </div>

      <div
        key={error}
        role="group"
        aria-label="Size"
        className={cn("flex flex-wrap gap-2", error > 0 && "animate-shake motion-reduce:animate-none")}
      >
        {variants.map((v) => {
          const available = v.stock > 0;
          const isSelected = selectedSize === v.size;
          const reduced = v.compareAt > v.price;
          return (
            <button
              key={v.skuId || v.size}
              type="button"
              onClick={() => available && onSizeChange(v.size)}
              disabled={!available}
              aria-pressed={isSelected}
              className={cn(
                "chip relative min-w-[62px] py-2.5",
                pricesVary && "flex-col rounded-2xl py-1.5 leading-tight",
                isSelected && "chip-active",
                !available && "chip-off line-through",
                available && !isSelected && error > 0 && "border-signal/60"
              )}
            >
              <span>{labelOf(v)}</span>
              {pricesVary && (
                <span
                  className={cn(
                    "text-[11px] font-normal tabular-nums no-underline",
                    isSelected ? "text-paper-pure/75" : reduced ? "text-signal" : "text-smoke"
                  )}
                >
                  {formatPrice(v.price)}
                </span>
              )}
              <span className="sr-only">
                {` ${pricesVary ? "" : formatPrice(v.price)}${reduced ? `, regular price ${formatPrice(v.compareAt)}` : ""}${available ? "" : ", sold out"}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Availability line — one row, always in the same place */}
      <div className="mt-4 flex h-6 items-center gap-2.5" aria-live="polite">
        <StockLine selected={selected} error={error > 0 && !selected} />
      </div>
    </div>
  );
}
