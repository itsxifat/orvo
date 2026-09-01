"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import { useSettings } from "@/context/SettingsContext";
import { formatPrice, shouldUnoptimizeImage } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  Minus,
  Plus,
  X,
  Check,
  Truck,
  CreditCard,
  MapPin,
  Tag,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { track } from "@/lib/tracking/client";
import { bdPhoneField } from "@/lib/phone-field";

// The zone the customer picks is the only structured piece of geography we ask
// for now that the address is one free-text box, so it is what fills the `city`
// the order schema, the courier and the payment gateway all expect. The detail
// a rider actually navigates by lives in `street`.
const ZONE_CITY = {
  inside_dhaka: "Dhaka",
  suburbs: "Dhaka (Suburb)",
  outside_dhaka: "Outside Dhaka",
};

// Turn the server's verdict on the basket into one calm paragraph.
//
// Being told off at the till for something the shop did is the fastest way to
// lose an order that was otherwise finished, so this never blames the customer
// and always ends with the one thing they can do next.
function describeStockChanges(changed) {
  const gone = changed.filter((c) => c.status === "gone" || c.available === 0);
  const trimmed = changed.filter((c) => c.status === "limited" && c.available > 0);
  if (!gone.length && !trimmed.length) return null;

  const label = (c) => `${c.name || "One of your pieces"}${c.size ? ` (size ${c.size})` : ""}`;
  const lines = [];

  if (gone.length === 1) lines.push(`${label(gone[0])} sold out while you were shopping.`);
  else if (gone.length > 1) lines.push(`${gone.length} of the pieces in your bag sold out while you were shopping.`);

  if (trimmed.length === 1)
    lines.push(
      `There ${trimmed[0].available === 1 ? "is" : "are"} only ${trimmed[0].available} left of ${label(trimmed[0])}, so we set that line to ${trimmed[0].available} for you.`
    );
  else if (trimmed.length > 1)
    lines.push("A few lines had less stock left than you asked for, so we set them to what is still there.");

  return {
    blocking: gone.length > 0,
    title: gone.length ? "Sorry — that just sold out" : "We adjusted a quantity for you",
    body: lines.join(" "),
    hint: gone.length
      ? "Take it out of the bag below, or swap it for something else you like — everything else is ready to go."
      : "Have a look at the quantities below and place your order whenever you're ready.",
  };
}

// Every card on this page is the same object: one white sheet, one heading, one
// line of guidance. Repeating those classes per section is how the spacing
// drifted apart in the first place.
function Panel({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="rounded-4xl bg-paper-pure p-5 shadow-soft sm:p-7">
      <div className="mb-5 flex items-center gap-3 sm:mb-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-haze text-ink">
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold tracking-[-0.025em] text-ink sm:text-[19px]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] leading-snug text-smoke">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { items, subtotal, updateQuantity, removeItem, clearCart, syncWithServer, mounted: cartMounted } = useCart();
  const { settings } = useSettings();
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [shippingZone, setShippingZone] = useState("inside_dhaka");
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCodes, setAppliedCodes] = useState([]);
  const [discountResult, setDiscountResult] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [coupon, setCoupon] = useState(null);   // the answer to the last Apply
  const [notice, setNotice] = useState(null);
  const noticeRef = useRef(null);
  const couponRef = useRef(null);

  // Sold-out lines stay in the bag on this page so the customer can see what
  // happened to their order; they are simply not part of it any more.
  const soldOut = items.filter((i) => i.unavailable);
  const liveItems = items.filter((i) => !i.unavailable);
  const unitCount = liveItems.reduce((n, i) => n + i.quantity, 0);
  const blocked = soldOut.length > 0;

  const showNotice = (n) => {
    setNotice(n);
    if (n) requestAnimationFrame(() => noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  // Validate the basket against the shop before the customer fills anything in.
  // Anything that moved is explained in the page itself rather than in a toast
  // that slides away while they are typing an address.
  useEffect(() => {
    if (!cartMounted) return;
    syncWithServer({ keepUnavailable: true }).then(({ changed }) => {
      showNotice(describeStockChanges(changed));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartMounted]);

  // InitiateCheckout — fires once when the cart has hydrated with items.
  const icFired = useRef(false);
  useEffect(() => {
    if (icFired.current || !liveItems.length) return;
    icFired.current = true;
    track.initiateCheckout({
      customData: {
        value: subtotal,
        currency: "BDT",
        content_type: "product",
        num_items: unitCount,
        content_ids: liveItems.map((i) => i.productId),
        contents: liveItems.map((i) => ({ id: i.productId, quantity: i.quantity, item_price: i.price })),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, subtotal]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: session?.user?.name || "",
      email: session?.user?.email || "",
    },
  });

  const s = settings?.shipping || {};
  const zoneFees = {
    inside_dhaka: s.insideDhaka ?? 60,
    suburbs: s.suburbs ?? 100,
    outside_dhaka: s.outsideDhaka ?? 130,
  };
  const freeShippingEnabled = s.freeShippingEnabled ?? false;
  const freeThreshold = s.freeShippingThreshold ?? settings?.siteInfo?.freeShippingThreshold ?? 1500;
  const shippingIsFree = freeShippingEnabled || (freeThreshold > 0 && subtotal >= freeThreshold);
  const baseShipping = shippingIsFree ? 0 : (zoneFees[shippingZone] ?? 60);
  const discountTotal = discountResult?.discountTotal || 0;
  const freeShip = !!discountResult?.freeShipping;
  const shipping = freeShip ? 0 : baseShipping;
  const total = Math.max(0, subtotal + shipping - discountTotal);

  // Re-evaluate automatic + applied-code discounts whenever the cart, zone, or
  // codes change. Prices/eligibility are computed server-side.
  useEffect(() => {
    if (liveItems.length === 0) { setDiscountResult(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/discounts/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: liveItems.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
            codes: appliedCodes,
            shippingFee: baseShipping,
          }),
        });
        const d = await res.json();
        if (!cancelled) setDiscountResult(d);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
    // liveItems is derived from items, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, appliedCodes, baseShipping]);

  // Applying a code answers in the panel itself — a green line and a chip that
  // pops in, or a red line and one shake. A toast is the wrong place for it:
  // the field the customer is looking at is the thing that needs to react.
  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (appliedCodes.includes(code)) {
      setCoupon({ ok: true, text: `${code} is already on this order.`, nonce: Date.now() });
      setCouponInput("");
      return;
    }
    setApplyingCoupon(true);
    const next = [...appliedCodes, code];
    try {
      const res = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: liveItems.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
          codes: next,
          shippingFee: baseShipping,
        }),
      });
      const d = await res.json();
      setDiscountResult(d);
      const rejected = (d.rejected || []).find((r) => r.code === code);
      const applied = (d.applied || []).find((a) => a.code === code);
      if (applied) {
        setAppliedCodes(next);
        setCouponInput("");
        const saved = applied.amount > 0
          ? `you saved ${formatPrice(applied.amount)}`
          : applied.freeShipping
          ? "delivery is on us"
          : "it's on your order";
        setCoupon({ ok: true, text: `${code} applied — ${saved}.`, nonce: Date.now() });
      } else {
        setCoupon({
          ok: false,
          text: rejected?.reason
            ? `${code} — ${rejected.reason}`
            : `We couldn't use ${code} on this order. Do check the spelling.`,
          nonce: Date.now(),
        });
        // The shake remounts the row, which drops focus. Put it back with the
        // code selected, so a typo is one keystroke from being fixed.
        requestAnimationFrame(() => couponRef.current?.select());
      }
    } catch {
      setCoupon({ ok: false, text: "We couldn't reach the server just then. Try once more?", nonce: Date.now() });
    } finally {
      setApplyingCoupon(false);
    }
  };
  const removeCode = (code) => {
    setAppliedCodes((a) => a.filter((c) => c !== code));
    setCoupon(null);
  };

  const shippingZoneOptions = [
    { value: "inside_dhaka", label: "Inside Dhaka", desc: "Gulshan, Dhanmondi, Mirpur, Uttara…", fee: zoneFees.inside_dhaka },
    { value: "suburbs", label: "Suburbs", desc: "Savar, Gazipur, Narayanganj…", fee: zoneFees.suburbs },
    { value: "outside_dhaka", label: "Outside Dhaka", desc: "Chittagong, Sylhet, Rajshahi…", fee: zoneFees.outside_dhaka },
  ];

  const enabledGateways = settings?.paymentGateways || {};
  const paymentOptions = [
    ...(enabledGateways.cod?.enabled
      ? [{ value: "cod", label: "Cash on delivery", desc: "Pay the rider when your parcel arrives.", icon: Truck }]
      : []),
    ...(enabledGateways.sslcommerz?.enabled
      ? [{ value: "sslcommerz", label: "Pay online", desc: "bKash, Nagad or card — through SSLCommerz.", icon: CreditCard }]
      : []),
  ];

  // Never leave a method selected that the shop has since switched off.
  useEffect(() => {
    if (!paymentOptions.length) return;
    if (!paymentOptions.some((o) => o.value === paymentMethod)) setPaymentMethod(paymentOptions[0].value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const onSubmit = async (data) => {
    if (liveItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (!paymentMethod) {
      toast.error("Please choose how you'd like to pay");
      return;
    }
    // Something in the bag is already known to be gone. Ask first — an order
    // placed now would only be refused a second later.
    if (blocked) {
      showNotice(
        notice?.blocking
          ? notice
          : {
              blocking: true,
              title: "One piece is no longer available",
              body: `${soldOut.length === 1 ? "An item in your bag" : `${soldOut.length} items in your bag`} sold out while you were shopping.`,
              hint: "Take it out of the bag below, or swap it for something else you like — everything else is ready to go.",
            }
      );
      return;
    }

    setPlacing(true);
    try {
      // Last look at the shelves before we charge anyone. Stock can go in the
      // minutes it takes to fill in an address, and finding out here — with the
      // basket still editable — is far kinder than a failed order.
      const { changed } = await syncWithServer({ keepUnavailable: true });
      const moved = describeStockChanges(changed);
      if (moved) {
        showNotice(moved);
        setPlacing(false);
        return;
      }

      const orderPayload = {
        items: liveItems.map((i) => ({
          productId: i.productId,
          name: i.name,
          image: i.image,
          size: i.size,
          price: i.price,
          quantity: i.quantity,
        })),
        shippingAddress: {
          name: data.name,
          phone: data.phone,
          email: data.email,
          street: (data.address || "").trim(),
          city: ZONE_CITY[shippingZone] || "Dhaka",
          state: "",
          postalCode: "",
        },
        guestEmail: !session ? data.email : undefined,
        shippingZone,
        paymentMethod,
        discountCodes: appliedCodes,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });
      const result = await res.json();

      if (!res.ok) {
        // 409 means the shop moved under us between that check and this write —
        // someone else took the last one. Re-sync so the offending line is
        // clamped or marked sold out, and say so on the page rather than in a
        // toast the customer has to catch before it fades.
        if (res.status === 409) {
          const { changed } = await syncWithServer({ keepUnavailable: true });
          showNotice(
            describeStockChanges(changed) || {
              blocking: true,
              title: "Sorry — that just sold out",
              body: result.error || "One of the pieces in your bag went while you were checking out.",
              hint: "Take it out of the bag below, or swap it for something else you like — everything else is ready to go.",
            }
          );
        } else {
          toast.error(result.error || "Failed to place order");
        }
        return;
      }

      if (paymentMethod === "cod") {
        // Hold the confirmation on screen for a beat before navigating. The
        // order is already written; this is the moment the customer needs to
        // see that it worked, and it covers the confirmation page's load.
        setDone({ kind: "placed" });
        clearCart();
        setTimeout(() => router.push(`/order-confirmation/${result.orderId}`), 1150);
        return;
      }

      if (paymentMethod === "sslcommerz") {
        setDone({ kind: "redirect" });
        const payRes = await fetch("/api/payment/sslcommerz/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: result.orderId }),
        });
        const payData = await payRes.json();
        if (payData.GatewayPageURL) {
          clearCart();
          window.location.href = payData.GatewayPageURL;
          return;
        }
        setDone(null);
        toast.error("Failed to initiate payment. Please try again.");
      }
    } catch (err) {
      setDone(null);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  // The order landed. Everything else on the page is noise now, and the cart
  // has just been emptied underneath us — so this returns before the empty-bag
  // state below can flash up in the moment before the route changes.
  if (done) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-5 py-16">
        <div className="animate-pop text-center">
          <span className="relative mx-auto flex h-24 w-24 items-center justify-center">
            <span className="absolute inset-2 animate-halo rounded-full bg-beam" />
            <span className="relative flex h-20 w-20 animate-check-in items-center justify-center rounded-full bg-beam shadow-beam">
              {done.kind === "placed" ? (
                <Check size={34} strokeWidth={3} className="text-ink" />
              ) : (
                <Spinner size="md" className="border-ink/25 border-t-ink" />
              )}
            </span>
          </span>
          <p className="mt-7 text-[24px] font-bold tracking-[-0.03em] text-ink md:text-[28px]">
            {done.kind === "placed" ? "Order placed" : "Taking you to secure payment"}
          </p>
          <p className="mx-auto mt-2 max-w-[34ch] text-[15px] leading-relaxed text-smoke">
            {done.kind === "placed"
              ? "Thank you — we're opening your confirmation now."
              : "One moment while we hand you over to SSLCommerz."}
          </p>
        </div>
      </div>
    );
  }

  // Reaching checkout with an empty bag is a dead end, so it gets the same
  // card, disc and tone as the bag's own empty state rather than a bare
  // heading floating in the middle of the page.
  if (items.length === 0) {
    return (
      <div className="container-custom py-10 md:py-16">
        <div className="mx-auto max-w-[520px] rounded-4xl bg-paper-pure px-6 py-16 text-center shadow-soft md:py-20">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-haze">
            <ShoppingBag size={26} strokeWidth={1.8} className="text-smoke" />
          </span>
          <p className="mt-6 text-[22px] font-bold tracking-[-0.03em] text-ink md:text-[26px]">
            There is nothing to check out
          </p>
          <p className="mx-auto mt-2 max-w-[38ch] text-[15px] leading-relaxed text-smoke">
            Your bag is empty. Add a piece or two and the order form will be waiting here.
          </p>
          <Link href="/shop" className="btn-beam mt-8">
            Browse the catalogue
          </Link>
        </div>
      </div>
    );
  }

  const canPlace = !placing && !blocked && liveItems.length > 0;

  return (
    <div className="min-h-screen bg-paper pb-[104px] pt-5 md:pt-8 lg:pb-14">
      <div className="container-custom">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-2 md:mb-8">
          <h1 className="section-title">Checkout</h1>
          <p className="pb-1.5 text-[14px] tabular-nums text-smoke md:pb-2 md:text-[15px]">
            {unitCount} item{unitCount === 1 ? "" : "s"} · {formatPrice(total)}
          </p>
        </div>

        {/* Stock news lands here — above the fold on every screen size, in the
            page rather than in a toast, because it needs an answer. */}
        {notice && (!notice.blocking || blocked) && (
          <div
            ref={noticeRef}
            role="status"
            className={`mb-5 animate-pop rounded-4xl p-5 sm:p-6 md:mb-8 ${
              notice.blocking ? "bg-signal-soft" : "bg-beam-soft"
            }`}
          >
            <div className="flex gap-3.5">
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  notice.blocking ? "bg-signal text-white" : "bg-beam text-ink"
                }`}
              >
                <ShoppingBag size={17} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="text-[15.5px] font-bold tracking-[-0.02em] text-ink">{notice.title}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-smoke-dark">{notice.body}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-smoke">{notice.hint}</p>
                {!notice.blocking && (
                  <button
                    type="button"
                    onClick={() => setNotice(null)}
                    className="press mt-3 inline-flex h-9 items-center rounded-full bg-paper-pure px-4 text-[13.5px] font-semibold text-ink shadow-soft transition-shadow duration-fast ease-swift hover:shadow-lift"
                  >
                    Got it
                  </button>
                )}
                {notice.blocking && (
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        for (const i of soldOut) removeItem(i.productId, i.size);
                        setNotice(null);
                        toast.success("Thanks — your bag is ready to go");
                      }}
                      className="press inline-flex h-11 items-center rounded-full bg-ink px-5 text-[14px] font-semibold text-paper-pure transition-colors duration-fast ease-swift hover:bg-ink-soft"
                    >
                      {soldOut.length > 1 ? "Remove those items" : "Remove it for me"}
                    </button>
                    <Link
                      href="/shop"
                      className="press inline-flex h-11 items-center rounded-full bg-paper-pure px-5 text-[14px] font-semibold text-ink shadow-soft transition-shadow duration-fast ease-swift hover:shadow-lift"
                    >
                      Find something else
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form
          id="checkout-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start lg:gap-8 xl:gap-10"
        >
          {/* ── Left: who, where, how ──────────────────────────────────────── */}
          <div className="space-y-5 lg:col-span-7 lg:space-y-6">
            <Panel
              title="Where should it go?"
              subtitle="A name, a number the rider can call, and the address."
              icon={MapPin}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    label="Full name *"
                    {...register("name", { required: "Please tell us who to address it to" })}
                    error={errors.name?.message}
                    placeholder="Your full name"
                  />
                </div>
                {/* Bangla digits, +880, spaces, dashes — all of it is the
                    same number, so all of it is accepted and tidied into
                    01XXXXXXXXX as they go. */}
                <div>
                  <Input
                    label="Phone number *"
                    {...bdPhoneField(register, setValue, "phone", {
                      required: true,
                      requiredMessage: "The rider will need a number to call",
                    })}
                    error={errors.phone?.message}
                    placeholder="01700000000"
                  />
                  {!errors.phone && (
                    <p className="mt-1.5 text-[13px] leading-snug text-smoke">
                      Bangla digits or +880 are fine — we&apos;ll tidy it up.
                    </p>
                  )}
                </div>
                <Input
                  label="Email address"
                  type="email"
                  inputMode="email"
                  {...register("email")}
                  placeholder="your@email.com"
                />

                {/* One box instead of four. Addresses here are landmarks and
                    directions, not a house number and a postcode, and four
                    half-width fields on a phone had people writing the same
                    line twice. */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-[14px] font-medium text-ink" htmlFor="address">
                    Delivery address *
                  </label>
                  <textarea
                    id="address"
                    rows={4}
                    {...register("address", {
                      required: "We'll need an address to deliver to",
                      minLength: { value: 12, message: "A little more detail, please — enough for a rider to find you" },
                    })}
                    placeholder={"House / flat, road, area, city — and any landmark that helps.\ne.g. Flat 4B, House 12, Road 7, Banani — beside Banani Bidyaniketan, Dhaka"}
                    className={`input-base resize-y leading-relaxed ${
                      errors.address ? "border-signal focus:border-signal focus:ring-signal/15" : ""
                    }`}
                  />
                  {errors.address ? (
                    <p className="mt-1.5 text-[13px] text-signal">{errors.address.message}</p>
                  ) : (
                    <p className="mt-1.5 text-[13px] leading-snug text-smoke">
                      Write it the way you would say it out loud — the whole thing in this one box.
                    </p>
                  )}
                </div>
              </div>
            </Panel>

            <Panel
              title="Delivery zone"
              subtitle="This sets the delivery charge, so pick the one your address falls in."
              icon={Truck}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {shippingZoneOptions.map((opt) => {
                  const active = shippingZone === opt.value;
                  return (
                    <label key={opt.value} className="press relative block cursor-pointer">
                      <input
                        type="radio"
                        name="shippingZone"
                        value={opt.value}
                        checked={active}
                        onChange={() => setShippingZone(opt.value)}
                        className="peer sr-only"
                      />
                      {/* Ring, not border width: a selected tile must not be a
                          pixel bigger than an unselected one, or the row jumps
                          every time you change your mind. */}
                      <div
                        className={`flex h-full flex-col rounded-3xl p-4 ring-2 ring-inset transition-[background-color,color,box-shadow] duration-base ease-swift peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper-pure ${
                          active
                            ? "bg-ink text-paper-pure ring-ink"
                            : "bg-haze text-ink ring-transparent hover:ring-haze-dark"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[15px] font-semibold tracking-[-0.02em]">{opt.label}</p>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-swift ${
                              active ? "bg-beam text-ink" : "bg-paper-pure text-transparent"
                            }`}
                          >
                            <Check size={12} strokeWidth={3.2} />
                          </span>
                        </div>
                        <p className={`mt-1 text-[12.5px] leading-snug ${active ? "text-white/55" : "text-smoke"}`}>
                          {opt.desc}
                        </p>
                        <p
                          className={`mt-3 text-[15px] font-bold tabular-nums tracking-[-0.02em] ${
                            shippingIsFree ? (active ? "text-beam" : "text-emerald-600") : ""
                          }`}
                        >
                          {shippingIsFree ? "Free" : formatPrice(opt.fee)}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {!shippingIsFree && freeThreshold > 0 && subtotal < freeThreshold && (
                <p className="mt-3.5 inline-flex items-center gap-2 rounded-full bg-beam-soft px-3.5 py-2 text-[12.5px] font-medium text-ink">
                  <Tag size={13} strokeWidth={2.4} />
                  {formatPrice(freeThreshold - subtotal)} more and delivery is on us
                </p>
              )}
            </Panel>

            <Panel title="How would you like to pay?" icon={ShieldCheck}>
              {paymentOptions.length === 0 ? (
                <p className="text-[14px] leading-relaxed text-smoke">
                  No payment method is switched on right now. Do get in touch and we&apos;ll take the order by hand.
                </p>
              ) : (
                <div className="space-y-3">
                  {paymentOptions.map((opt) => {
                    const active = paymentMethod === opt.value;
                    const Icon = opt.icon;
                    return (
                      <label key={opt.value} className="press relative block cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={opt.value}
                          checked={active}
                          onChange={() => setPaymentMethod(opt.value)}
                          className="peer sr-only"
                        />
                        <div
                          className={`flex items-center gap-4 rounded-3xl p-4 ring-2 ring-inset transition-[background-color,box-shadow] duration-base ease-swift peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper-pure ${
                            active ? "bg-haze ring-ink" : "bg-haze/60 ring-transparent hover:ring-haze-dark"
                          }`}
                        >
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors duration-base ease-swift ${
                              active ? "bg-ink text-beam" : "bg-paper-pure text-ink"
                            }`}
                          >
                            <Icon size={19} strokeWidth={2} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-semibold tracking-[-0.02em] text-ink">{opt.label}</p>
                            <p className="mt-0.5 text-[12.5px] leading-snug text-smoke">{opt.desc}</p>
                          </div>
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-swift ${
                              active ? "bg-ink text-beam" : "bg-paper-pure text-transparent ring-1 ring-inset ring-haze-dark"
                            }`}
                          >
                            <Check size={13} strokeWidth={3.2} />
                          </span>
                        </div>
                      </label>
                    );
                  })}
                  <p className="flex items-start gap-2 pt-0.5 text-[12.5px] leading-snug text-smoke">
                    <ShieldCheck size={14} strokeWidth={2.2} className="mt-px shrink-0" />
                    {paymentMethod === "sslcommerz"
                      ? "You'll finish on SSLCommerz's secure page and come straight back here."
                      : "Nothing to pay now — just have the amount ready for the rider."}
                  </p>
                </div>
              )}
            </Panel>
          </div>

          {/* ── Right: the order itself ────────────────────────────────────── */}
          <aside className="lg:col-span-5 lg:sticky lg:top-[calc(var(--header-h)+16px)]">
            <div className="overflow-hidden rounded-4xl bg-paper-pure shadow-soft">
              <div className="p-5 sm:p-6">
                <div className="mb-1 flex items-center justify-between gap-4">
                  <h2 className="text-[17px] font-bold tracking-[-0.025em] text-ink sm:text-[19px]">
                    Your order
                  </h2>
                  <Link
                    href="/cart"
                    className="text-[13px] font-medium text-smoke underline decoration-haze-dark underline-offset-4 transition-colors duration-fast ease-swift hover:text-ink"
                  >
                    Back to bag
                  </Link>
                </div>

                {/* Editable here as well as in the bag: the last place someone
                    looks at their order is the place they change their mind
                    about it. Rows are separated by a divider rather than by
                    margins, so the rhythm holds however long a name runs. The
                    list only scrolls on the desktop sticky panel — on a phone
                    it is simply part of the page, so a stepper never fights
                    the scroll. */}
                <ul className="divide-y divide-haze-dark lg:max-h-[38vh] lg:overflow-y-auto">
                  {items.map((item) => {
                    const out = !!item.unavailable;
                    const atMax = typeof item.maxStock === "number" && item.quantity >= item.maxStock;
                    return (
                      <li key={`${item.productId}-${item.size}`} className="flex gap-3.5 py-4 sm:gap-4">
                        <Link
                          href={`/shop/${item.slug}`}
                          className={`relative aspect-[4/5] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-haze ring-1 ring-inset ring-ink/5 transition-opacity duration-base ease-swift sm:w-[78px] ${
                            out ? "opacity-40 grayscale" : ""
                          }`}
                        >
                          <Image
                            src={item.image || "/placeholder.jpg"}
                            alt={item.name}
                            fill
                            unoptimized={shouldUnoptimizeImage(item.image)}
                            className="object-cover object-center"
                            sizes="(min-width: 640px) 78px, 72px"
                          />
                        </Link>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-[14.5px] font-semibold leading-snug tracking-[-0.015em] text-ink">
                                {item.name}
                              </p>
                              <p className="mt-1 text-[12.5px] text-smoke">
                                Size {item.size} · {formatPrice(item.price)} each
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.productId, item.size)}
                              aria-label={`Remove ${item.name} from your order`}
                              className="press -mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-smoke transition-colors duration-fast ease-swift hover:bg-signal-soft hover:text-signal"
                            >
                              <X size={15} strokeWidth={2.2} />
                            </button>
                          </div>

                          {out ? (
                            <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3">
                              <span className="inline-flex items-center rounded-full bg-signal-soft px-2.5 py-1 text-[12px] font-semibold text-signal">
                                Sold out
                              </span>
                              <Link
                                href="/shop"
                                className="text-[12.5px] font-medium text-smoke underline decoration-haze-dark underline-offset-4 transition-colors duration-fast ease-swift hover:text-ink"
                              >
                                See something similar
                              </Link>
                            </div>
                          ) : (
                            <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-3">
                              <div className="flex items-center rounded-full bg-haze">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  aria-label={`One less ${item.name}`}
                                  className="flex h-10 w-10 items-center justify-center rounded-l-full text-ink transition-colors duration-fast ease-swift hover:bg-haze-dark active:bg-haze-dark disabled:text-smoke-light disabled:hover:bg-transparent sm:h-9 sm:w-9"
                                >
                                  <Minus size={13} strokeWidth={2.4} />
                                </button>
                                <span className="w-7 text-center text-[14px] font-semibold tabular-nums text-ink">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                                  disabled={atMax}
                                  aria-label={`One more ${item.name}`}
                                  className="flex h-10 w-10 items-center justify-center rounded-r-full text-ink transition-colors duration-fast ease-swift hover:bg-haze-dark active:bg-haze-dark disabled:text-smoke-light disabled:hover:bg-transparent sm:h-9 sm:w-9"
                                >
                                  <Plus size={13} strokeWidth={2.4} />
                                </button>
                              </div>
                              {atMax && <span className="text-[12px] text-smoke">{item.maxStock} left</span>}
                              <span className="ml-auto text-[15px] font-bold tabular-nums tracking-[-0.02em] text-ink">
                                {formatPrice(item.price * item.quantity)}
                              </span>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Coupon — in its own tinted well, so the field is not sitting
                  on a hairline it looks glued to. */}
              <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <div className="rounded-3xl bg-haze p-3.5">
                  <div
                    key={coupon?.nonce || "coupon"}
                    className={`flex gap-2 ${coupon && !coupon.ok ? "animate-shake" : ""}`}
                  >
                    <input
                      ref={couponRef}
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        if (coupon && !coupon.ok) setCoupon(null);
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }}
                      placeholder="Coupon code"
                      aria-label="Coupon code"
                      className={`h-11 min-w-0 flex-1 rounded-full border bg-paper-pure px-4 text-[14px] uppercase tracking-[0.04em] text-ink placeholder-smoke-light transition-colors duration-fast ease-swift focus:outline-none ${
                        coupon && !coupon.ok ? "border-signal" : "border-transparent focus:border-ink"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={applyingCoupon || !couponInput.trim()}
                      className="press inline-flex h-11 w-[92px] shrink-0 items-center justify-center rounded-full bg-ink text-[13.5px] font-semibold text-paper-pure transition-colors duration-fast ease-swift hover:bg-ink-soft disabled:bg-haze-dark disabled:text-smoke"
                    >
                      {applyingCoupon ? <Spinner size="sm" className="border-white/25 border-t-beam" /> : "Apply"}
                    </button>
                  </div>

                  {coupon && (
                    <p
                      key={`msg-${coupon.nonce}`}
                      role="status"
                      className={`mt-2.5 flex animate-pop items-start gap-1.5 px-1 text-[12.5px] leading-snug ${
                        coupon.ok ? "text-emerald-700" : "text-signal"
                      }`}
                    >
                      {coupon.ok ? (
                        <Check size={13} strokeWidth={3} className="mt-0.5 shrink-0" />
                      ) : (
                        <X size={13} strokeWidth={3} className="mt-0.5 shrink-0" />
                      )}
                      {coupon.text}
                    </p>
                  )}

                  {appliedCodes.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {appliedCodes.map((c) => (
                        <span
                          key={c}
                          className="inline-flex animate-pop items-center gap-1.5 rounded-full bg-ink py-1.5 pl-3 pr-1.5 text-[12.5px] font-semibold tracking-[0.02em] text-paper-pure"
                        >
                          {c}
                          <button
                            type="button"
                            onClick={() => removeCode(c)}
                            aria-label={`Remove coupon ${c}`}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-paper-pure transition-colors duration-fast ease-swift hover:bg-signal"
                          >
                            <X size={11} strokeWidth={3} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Totals and the button, on the dark ground the bag already
                  uses. The order stops being a list here and becomes an
                  amount. */}
              <div className="bg-ink p-6 text-paper-pure sm:p-7">
                <dl className="space-y-3 text-[14.5px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/50">Subtotal</dt>
                    <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/50">Discount</dt>
                      <dd className="tabular-nums text-beam">− {formatPrice(discountTotal)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/50">Delivery{freeShip ? " (coupon)" : ""}</dt>
                    <dd className={shipping === 0 ? "font-semibold text-beam" : "tabular-nums"}>
                      {shipping === 0 ? "Free" : formatPrice(shipping)}
                    </dd>
                  </div>
                </dl>

                <div className="my-5 border-t border-white/12" />

                <div className="flex items-end justify-between gap-4">
                  <span className="text-[14.5px] text-white/50">Total</span>
                  <span className="text-[30px] font-bold leading-none tracking-[-0.03em] tabular-nums">
                    {formatPrice(total)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!canPlace}
                  className={`btn-base relative mt-6 w-full overflow-hidden py-4 text-[15px] ${
                    blocked
                      ? "cursor-not-allowed bg-white/10 text-white/45"
                      : "bg-beam text-ink shadow-beam hover:bg-beam-dark disabled:cursor-wait disabled:bg-beam/75"
                  }`}
                >
                  {placing ? (
                    <>
                      <Spinner size="sm" className="border-ink/25 border-t-ink" />
                      Placing your order…
                      {/* A light running under the label, so a slow network
                          still reads as progress rather than as a stall. */}
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] overflow-hidden">
                        <span className="block h-full w-1/3 animate-sweep bg-ink/35" />
                      </span>
                    </>
                  ) : blocked ? (
                    "Sort out the sold-out item first"
                  ) : (
                    <>Place order · {formatPrice(total)}</>
                  )}
                </button>

                <p className="mt-3.5 text-center text-[12.5px] leading-snug text-white/40">
                  {blocked
                    ? "Remove it above and this button comes straight back."
                    : "By placing your order you agree to our Terms & Privacy Policy."}
                </p>
              </div>
            </div>
          </aside>
        </form>
      </div>

      {/* On a phone the summary sits below three panels of form, so the control
          that finishes the job is several screens from wherever you are. This
          carries it: same submit, same disabled logic. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-haze-dark bg-paper-pure/92 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="container-custom flex items-center gap-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] text-smoke">
              {blocked ? "One item needs a look" : `Total${shipping === 0 ? " · free delivery" : ""}`}
            </p>
            <p className="text-[19px] font-bold leading-tight tracking-[-0.03em] tabular-nums text-ink">
              {formatPrice(total)}
            </p>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={!canPlace}
            className={`btn-base relative h-12 shrink-0 overflow-hidden px-6 ${
              blocked
                ? "cursor-not-allowed bg-haze text-smoke"
                : "bg-ink text-paper-pure shadow-soft hover:bg-ink-soft disabled:cursor-wait disabled:bg-ink/75"
            }`}
          >
            {placing ? (
              <>
                <Spinner size="sm" className="border-white/25 border-t-beam" />
                Placing…
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] overflow-hidden">
                  <span className="block h-full w-1/3 animate-sweep bg-beam/70" />
                </span>
              </>
            ) : blocked ? (
              "Review bag"
            ) : (
              "Place order"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
