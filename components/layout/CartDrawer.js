"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Minus, Plus, ArrowUpRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice, shouldUnoptimizeImage } from "@/lib/utils";

export default function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer, removeItem, updateQuantity, subtotal } = useCart();

  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isDrawerOpen]);

  const unitCount = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <>
      <div
        onClick={closeDrawer}
        className={`fixed inset-0 z-[65] bg-ink/40 backdrop-blur-sm transition-opacity duration-300 ${
          isDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        aria-hidden={!isDrawerOpen}
        className={`fixed inset-y-3 right-3 z-[75] w-[92%] max-w-[440px] rounded-4xl bg-paper-pure shadow-pop flex flex-col overflow-hidden transform transition-transform duration-300 ease-out ${
          isDrawerOpen ? "translate-x-0" : "translate-x-[calc(100%+1rem)]"
        }`}
      >
        <div className="flex items-center justify-between px-6 h-[70px] shrink-0">
          <div className="flex items-baseline gap-2.5">
            <p className="text-[20px] font-bold text-ink tracking-[-0.03em]">Your bag</p>
            <span className="text-[14px] text-smoke tabular-nums">{unitCount}</span>
          </div>
          <button
            onClick={closeDrawer}
            className="w-10 h-10 -mr-1 rounded-full bg-haze hover:bg-haze-dark flex items-center justify-center text-ink transition-colors"
            aria-label="Close bag"
          >
            <X size={19} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-5 py-16 px-4">
              <span className="w-16 h-16 rounded-full bg-haze flex items-center justify-center">
                <ShoppingBag size={26} strokeWidth={1.8} className="text-smoke" />
              </span>
              <div>
                <p className="text-[19px] font-bold text-ink tracking-[-0.03em]">Bag is empty</p>
                <p className="text-[14.5px] text-smoke mt-1.5 max-w-[30ch] leading-relaxed">
                  Add a piece and it will hold here until you check out.
                </p>
              </div>
              <Link href="/shop" onClick={closeDrawer} className="btn-beam">
                Start browsing
              </Link>
            </div>
          ) : (
            <ul className="space-y-3 pb-4">
              {items.map((item) => (
                <li
                  key={`${item.productId}-${item.size}`}
                  className="flex gap-4 rounded-3xl bg-haze/60 p-3"
                >
                  <Link
                    href={`/shop/${item.slug}`}
                    onClick={closeDrawer}
                    className="relative w-[84px] aspect-[4/5] rounded-2xl bg-haze overflow-hidden shrink-0"
                  >
                    <Image
                      src={item.image || "/placeholder.jpg"}
                      alt={item.name}
                      fill
                      unoptimized={shouldUnoptimizeImage(item.image)}
                      className="object-cover"
                      sizes="84px"
                    />
                  </Link>

                  <div className="flex-1 min-w-0 flex flex-col py-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/shop/${item.slug}`}
                        onClick={closeDrawer}
                        className="text-[15px] font-semibold text-ink tracking-[-0.02em] hover:text-signal transition-colors line-clamp-2 leading-snug"
                      >
                        {item.name}
                      </Link>
                      <button
                        onClick={() => removeItem(item.productId, item.size)}
                        aria-label={`Remove ${item.name}`}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-smoke hover:bg-signal-soft hover:text-signal transition-colors shrink-0 -mt-0.5"
                      >
                        <X size={14} strokeWidth={2.2} />
                      </button>
                    </div>

                    <p className="text-[13px] text-smoke mt-0.5">Size {item.size}</p>

                    <div className="flex items-center justify-between mt-auto pt-2.5">
                      <div className="flex items-center rounded-full bg-paper-pure">
                        <button
                          onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="w-8 h-8 rounded-l-full flex items-center justify-center text-ink hover:bg-haze transition-colors"
                        >
                          <Minus size={12} strokeWidth={2.4} />
                        </button>
                        <span className="w-7 text-center text-[13.5px] font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="w-8 h-8 rounded-r-full flex items-center justify-center text-ink hover:bg-haze transition-colors"
                        >
                          <Plus size={12} strokeWidth={2.4} />
                        </button>
                      </div>
                      <span className="text-[15.5px] font-bold text-ink tabular-nums tracking-[-0.02em]">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="shrink-0 p-4">
            <div className="rounded-3xl bg-ink text-paper-pure p-6">
              <div className="flex items-end justify-between">
                <span className="text-[14px] text-white/50">Subtotal</span>
                <span className="text-[26px] font-bold tabular-nums leading-none tracking-[-0.03em]">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <p className="text-[13px] text-white/35 mt-1.5">Delivery calculated at checkout</p>

              <Link href="/checkout" onClick={closeDrawer} className="btn-beam w-full mt-5 group">
                Checkout
                <ArrowUpRight
                  size={17}
                  strokeWidth={2.4}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="block text-center mt-3 text-[14px] font-medium text-white/45 hover:text-white transition-colors"
              >
                View full bag
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
