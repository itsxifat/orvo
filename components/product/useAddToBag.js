"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useCart } from "@/context/CartContext";

/* One place where "add this to the bag" is defined.

   Two controls trigger it on a product page — the button in the buy panel and
   the bar that follows you up the page on a phone — and they share one of
   these, so they agree about the quantity, what happens when no size is
   picked, when the size is sold out, and how the line is capped against stock.

   `selectedVariant` is the size from the ERP (lib/storefront-map.js →
   mapProduct): its `skuId`, its label, the price a shopper pays now, its
   regular price struck through (`compareAt`), its live stock, and its flash
   offer ({ sale, remaining }) if a live flash sale prices it. `image` is the
   photo the gallery shows (the chosen colour's). With no size chosen,
   `onNeedSize` is called instead. */
export function useAddToBag({ product, selectedVariant, image = null, onNeedSize }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const deal = selectedVariant?.flash || null;
  const isAvailable = !!selectedVariant && selectedVariant.stock > 0;
  // A flash line can only hold what the deal has left — past that the whole
  // line would be charged the normal price at checkout.
  const lineCap = selectedVariant ? Math.min(selectedVariant.stock, deal ? deal.remaining : Infinity) : 1;
  const maxQty = Math.max(1, Math.min(lineCap, 10));

  // A new size (or deal) can have less room than the quantity already chosen.
  useEffect(() => {
    setQuantity((q) => Math.min(q, maxQty));
  }, [maxQty]);

  // Returns true when something was actually added, so a caller can react.
  const add = (count = quantity) => {
    if (!selectedVariant) {
      if (onNeedSize) onNeedSize();
      else toast.error("Pick a size first");
      return false;
    }
    if (!isAvailable) {
      toast.error("That size is out of stock");
      return false;
    }
    // Opens the bag drawer, which is the confirmation.
    addItem(
      {
        id: product._id,
        skuId: selectedVariant.skuId,
        slug: product.slug,
        name: product.name,
        image: image || product.images?.[0],
        // What the shop charges now and, struck through, the ERP's regular price.
        price: selectedVariant.price,
        regularPrice: selectedVariant.compareAt ?? undefined,
        sku: selectedVariant.sku || "",
      },
      selectedVariant.size,
      Math.min(Math.max(1, count), maxQty),
      // The stepper caps a single add; this caps the LINE. Without it, adding
      // 10 twice put 20 in the bag against a stock of 5.
      lineCap
    );
    return true;
  };

  return { quantity, setQuantity, maxQty, isAvailable, add };
}
