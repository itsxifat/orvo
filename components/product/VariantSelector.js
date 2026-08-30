"use client";

import { cn, formatPrice } from "@/lib/utils";

// Sizes are pills. The price for the picked size is stated once above the run
// rather than repeated inside every cell.
export default function VariantSelector({
  variants = [],
  selectedSize,
  onSizeChange,
  onSizeGuideClick,
  hasSizeChart = false,
}) {
  const picked = variants.find((v) => v.size === selectedSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[15px] font-semibold text-ink">
          Size
          {picked && <span className="text-smoke font-normal ml-2">· {picked.size}</span>}
        </p>
        {hasSizeChart && (
          <button
            type="button"
            onClick={onSizeGuideClick}
            className="text-[14px] font-medium text-smoke hover:text-ink transition-colors link-draw"
          >
            Size guide
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const available = v.stock > 0;
          const isSelected = selectedSize === v.size;
          return (
            <button
              key={v.size}
              type="button"
              onClick={() => available && onSizeChange(v.size)}
              disabled={!available}
              aria-pressed={isSelected}
              className={cn(
                "chip min-w-[62px] py-2.5 relative",
                isSelected && "chip-active",
                !available && "chip-off line-through"
              )}
            >
              {v.size}
            </button>
          );
        })}
      </div>

      {/* Availability line — one row, always in the same place */}
      <div className="flex items-center gap-2.5 mt-4 h-6">
        {picked ? (
          <>
            <span
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                picked.stock === 0
                  ? "bg-smoke"
                  : picked.stock < 5
                  ? "bg-signal animate-pulse-dot"
                  : "bg-emerald-500"
              )}
            />
            <span className="text-[14px] text-smoke">
              {picked.stock === 0
                ? "Out of stock"
                : picked.stock < 5
                ? `Only ${picked.stock} left in ${picked.size}`
                : "In stock, ships in 24 hours"}
            </span>
            {picked.price != null && (
              <span className="ml-auto text-[15px] font-semibold text-ink tabular-nums">
                {formatPrice(picked.price)}
              </span>
            )}
          </>
        ) : (
          <span className="text-[14px] text-smoke">Pick a size to see availability</span>
        )}
      </div>
    </div>
  );
}
