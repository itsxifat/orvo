"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { Minus, Plus, X, ArrowUpRight, ArrowLeft, ShoppingBag, Truck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useSettings } from "@/context/SettingsContext";
import { formatPrice, shouldUnoptimizeImage } from "@/lib/utils";

function ShippingMeter({ subtotal, threshold }) {
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
  const remaining = Math.max(0, threshold - subtotal);
  const unlocked = remaining === 0;

  return (
    <div className={`rounded-3xl p-5 ${unlocked ? "bg-beam" : "bg-paper-pure shadow-soft"}`}>
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            unlocked ? "bg-ink" : "bg-haze"
          }`}
        >
          <Truck size={16} strokeWidth={2.2} className={unlocked ? "text-beam" : "text-ink"} />
        </span>
        <p className="text-[14.5px] font-semibold text-ink">
          {unlocked ? "Free delivery unlocked" : `${formatPrice(remaining)} to free delivery`}
        </p>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${unlocked ? "bg-ink/15" : "bg-haze"}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-[700ms] ease-swift ${unlocked ? "bg-ink" : "bg-beam"}`}
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>
    </div>
  );
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, syncWithServer, mounted } = useCart();
  const { settings } = useSettings();

  // Check the basket against the shop the moment it is opened. A cart can sit
  // in localStorage for weeks, so this is where sold-out sizes get clamped and
  // withdrawn products drop out — rather than at checkout, where the customer
  // could only watch it fail.
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    syncWithServer().then(({ changed }) => {
      if (cancelled || !changed.length) return;
      const gone = changed.filter((c) => c.status === "gone" || c.available === 0);
      const trimmed = changed.filter((c) => c.status === "limited");
      if (gone.length) toast(`${gone.length === 1 ? gone[0].name || "An item" : `${gone.length} items`} sold out and left your bag.`);
      for (const t of trimmed) toast(t.reason);
    });
    return () => { cancelled = true; };
    // Runs once per visit to the bag; syncWithServer reads the live cart itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const freeShippingThreshold = settings?.siteInfo?.freeShippingThreshold || 1500;
  const shippingFee = settings?.siteInfo?.shippingFee || 80;
  const shipping = subtotal >= freeShippingThreshold ? 0 : shippingFee;
  const total = subtotal + shipping;
  const unitCount = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="container-custom pb-28 lg:pb-16">
      <div className="pb-6 pt-5 md:pb-8 md:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <h1 className="text-[clamp(2rem,8vw,4rem)] font-bold leading-[1] tracking-[-0.04em] text-ink">
            Bag
          </h1>
          <p className="pb-1.5 text-[14px] tabular-nums text-smoke md:pb-2 md:text-[15px]">
            {unitCount} item{unitCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-4xl bg-paper-pure px-6 py-16 text-center shadow-soft md:py-24">
          <span className="w-16 h-16 rounded-full bg-haze flex items-center justify-center mx-auto">
            <ShoppingBag size={26} strokeWidth={1.8} className="text-smoke" />
          </span>
          <p className="mt-6 text-[22px] font-bold tracking-[-0.03em] text-ink md:text-[26px]">Nothing in the bag</p>
          <p className="text-[15px] text-smoke mt-2 max-w-[40ch] mx-auto leading-relaxed">
            Pieces you add will collect here, with sizes and totals kept until you check out.
          </p>
          <Link href="/shop" className="btn-beam mt-8">
            Browse the catalogue
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] gap-6 lg:gap-8 items-start">

          <div className="space-y-4">
            <ShippingMeter subtotal={subtotal} threshold={freeShippingThreshold} />

            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={`${item.productId}-${item.size}`}
                  className="rounded-3xl bg-paper-pure shadow-soft p-4 flex gap-4 sm:gap-5"
                >
                  <Link
                    href={`/shop/${item.slug}`}
                    className="relative w-[96px] sm:w-[112px] aspect-[4/5] rounded-2xl bg-haze overflow-hidden shrink-0"
                  >
                    <Image
                      src={item.image || "/placeholder.jpg"}
                      alt={item.name}
                      fill
                      unoptimized={shouldUnoptimizeImage(item.image)}
                      className="object-cover"
                      sizes="112px"
                    />
                  </Link>

                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/shop/${item.slug}`}
                          className="text-[16px] font-semibold text-ink tracking-[-0.02em] hover:text-signal transition-colors line-clamp-2 leading-snug"
                        >
                          {item.name}
                        </Link>
                        <p className="text-[13.5px] text-smoke mt-1">
                          Size {item.size}
                          {item.sku ? ` · ${item.sku}` : ""}
                        </p>
                        <p className="text-[13.5px] text-smoke tabular-nums">
                          {formatPrice(item.price)} each
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId, item.size)}
                        aria-label={`Remove ${item.name}`}
                        className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-smoke transition-colors duration-fast ease-swift hover:bg-signal-soft hover:text-signal"
                      >
                        <X size={16} strokeWidth={2.2} />
                      </button>
                    </div>

                    {/* Stepper, stock note and line total in one row needed
                        more width than a phone gives a card with a photo in it,
                        so the row is allowed to wrap and the total goes last. */}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4">
                      <div className="flex items-center rounded-full bg-haze">
                        <button
                          onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="flex h-10 w-10 items-center justify-center rounded-l-full text-ink transition-colors duration-fast ease-swift hover:bg-haze-dark active:bg-haze-dark sm:h-9 sm:w-9"
                        >
                          <Minus size={13} strokeWidth={2.4} />
                        </button>
                        <span className="w-8 text-center text-[14.5px] font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                          disabled={typeof item.maxStock === "number" && item.quantity >= item.maxStock}
                          aria-label="Increase quantity"
                          className="flex h-10 w-10 items-center justify-center rounded-r-full text-ink transition-colors duration-fast ease-swift hover:bg-haze-dark active:bg-haze-dark disabled:text-smoke-light disabled:hover:bg-transparent sm:h-9 sm:w-9"
                        >
                          <Plus size={13} strokeWidth={2.4} />
                        </button>
                      </div>
                      {typeof item.maxStock === "number" && item.quantity >= item.maxStock && (
                        <span className="order-3 text-[12.5px] text-smoke sm:order-none">
                          {item.maxStock} in stock
                        </span>
                      )}
                      <span className="ml-auto text-[17px] font-bold tracking-[-0.02em] tabular-nums text-ink sm:text-[18px]">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              href="/shop"
              className="inline-flex items-center gap-2 mt-2 text-[14.5px] font-medium text-smoke hover:text-ink transition-colors"
            >
              <ArrowLeft size={16} strokeWidth={2.2} />
              Keep shopping
            </Link>
          </div>

          {/* ── Summary ───────────────────────────────────────────────────── */}
          <aside className="lg:sticky lg:top-[calc(var(--header-h)+16px)]">
            <div className="rounded-4xl bg-ink text-paper-pure p-7">
              <p className="text-[13px] text-white/40">Summary</p>
              <p className="text-[26px] font-bold tracking-[-0.03em] mt-1 mb-6">Order total</p>

              <dl className="space-y-3.5 text-[15px]">
                <div className="flex justify-between">
                  <dt className="text-white/50">Subtotal</dt>
                  <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/50">Delivery</dt>
                  <dd className={shipping === 0 ? "text-beam font-semibold" : "tabular-nums"}>
                    {shipping === 0 ? "Free" : formatPrice(shipping)}
                  </dd>
                </div>
              </dl>

              <div className="my-6 border-t border-white/12" />

              <div className="flex items-end justify-between">
                <span className="text-[15px] text-white/50">Total</span>
                <span className="text-[32px] font-bold tabular-nums leading-none tracking-[-0.03em]">
                  {formatPrice(total)}
                </span>
              </div>

              <Link href="/checkout" className="btn-beam w-full mt-7 group">
                Checkout
                <ArrowUpRight
                  size={17}
                  strokeWidth={2.4}
                  className="transition-transform duration-base ease-swift group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>

              <p className="text-[13px] text-white/35 mt-4 leading-relaxed text-center">
                Taxes included. Cash on delivery available.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
              {["bKash", "Nagad", "Visa", "Mastercard", "COD"].map((m) => (
                <span key={m} className="rounded-full bg-haze px-3 py-1.5 text-[12px] text-smoke">
                  {m}
                </span>
              ))}
            </div>
          </aside>

          {/* On a phone the summary lands under however many items are in the
              bag, so the one control that matters is a scroll away from the
              moment the page opens. This carries it. */}
          <div
            className="fixed inset-x-0 bottom-0 z-40 border-t border-haze-dark bg-paper-pure/92 backdrop-blur-xl lg:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="container-custom flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] text-smoke">
                  Total{shipping === 0 ? " · free delivery" : ""}
                </p>
                <p className="text-[19px] font-bold leading-tight tracking-[-0.03em] tabular-nums text-ink">
                  {formatPrice(total)}
                </p>
              </div>
              <Link href="/checkout" className="btn-beam group h-12 shrink-0 px-6">
                Checkout
                <ArrowUpRight
                  size={16}
                  strokeWidth={2.4}
                  className="transition-transform duration-base ease-swift group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
