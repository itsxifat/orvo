"use client";

import { useState } from "react";
import FlashDealCard from "./FlashDealCard";
import QuickAddModal from "@/components/shop/QuickAddModal";
import { cn } from "@/lib/utils";

// Columns per breakpoint: 2 on phones, 3 from md, 4 from lg.
const COLS = { base: 2, md: 3, lg: 4 };

// Which cards a `maxRows` grid shows at each breakpoint. Past the first
// `rows × columns` a card is hidden at that width, so the grid never grows a
// third row however many deals the sale has — it stays a tidy teaser and the
// "view all" button carries the rest.
function rowClamp(index, rows) {
  if (!rows) return "";
  if (index < rows * COLS.base) return "";
  if (index < rows * COLS.md) return "hidden md:flex";
  return "hidden lg:flex";
}

/**
 * Flash deals in a responsive grid, each buyable in place through the quick-add
 * modal at its per-size flash prices (read from the ERP when it opens). `maxRows` caps the grid (the homepage and
 * the flash-sale hub use 2); without it every item is shown. `mode` other than
 * "live" shows the deals without letting them be bought (FlashDealCard). `tone`
 * "dark" draws the cards for the home page's ink band.
 */
export default function FlashDealGrid({ items = [], maxRows = null, mode = "live", tone = "light", className }) {
  const [active, setActive] = useState(null);
  const shown = maxRows ? items.slice(0, maxRows * COLS.lg) : items;

  return (
    <>
      <div
        className={cn(
          "grid min-w-0 grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
          tone === "dark" ? "gap-3 sm:gap-4" : "gap-x-3 gap-y-8 sm:gap-x-4 md:gap-x-5 md:gap-y-10",
          className
        )}
      >
        {shown.map((item, i) => (
          <FlashDealCard
            key={item.product._id}
            item={item}
            mode={mode}
            tone={tone}
            onBuy={setActive}
            className={rowClamp(i, maxRows)}
          />
        ))}
      </div>

      {active && (
        <QuickAddModal product={active.product} onClose={() => setActive(null)} />
      )}
    </>
  );
}
