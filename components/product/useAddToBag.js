"use client";

import { useCallback } from "react";
import toast from "react-hot-toast";
import { useCart } from "@/context/CartContext";

/* One place where "add this to the bag" is defined.

   Two controls trigger it on a product page — the button in the buy panel and
   the bar that follows you up the page on a phone — and they have to agree
   about what happens when no size is picked, when the size is sold out, and
   how the line is capped against stock. Returns true when something was
   actually added, so a caller can react (scroll to the sizes, close a sheet). */
export function useAddToBag({ product, selectedSize, selectedVariant }) {
  const { addItem } = useCart();

  return useCallback(
    (quantity = 1) => {
      if (!selectedSize) {
        toast.error("Pick a size first");
        return false;
      }
      if (!selectedVariant || selectedVariant.stock <= 0) {
        toast.error("That size is out of stock");
        return false;
      }

      addItem(
        {
          id: product._id,
          slug: product.slug,
          name: product.name,
          image: product.images?.[0],
          price: selectedVariant.price,
          sku: selectedVariant.sku || "",
        },
        selectedSize,
        quantity,
        // The stepper caps a single add; this caps the LINE. Without it,
        // adding 10 twice put 20 in the bag against a stock of 5.
        selectedVariant.stock
      );
      toast.success(`${product.name} added to your bag`);
      return true;
    },
    [addItem, product, selectedSize, selectedVariant]
  );
}
