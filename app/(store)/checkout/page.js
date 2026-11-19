"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import { useSettings } from "@/context/SettingsContext";
import { formatPrice, shouldUnoptimizeImage, PLACEHOLDER_IMAGE, normalizeBdPhone } from "@/lib/utils";
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
import WasPrice from "@/components/ui/WasPrice";
import { track, checkoutTracking } from "@/lib/tracking/client";
import { bdPhoneField } from "@/lib/phone-field";

// The checkout. Every figure on it is the brand ERP's quote for this cart,
// delivery zone and codes (POST /api/cart/quote); "Place order" sends that
// quote's figures as `expected`, and the ERP places the order only if nothing
// moved (otherwise 409 CART_REPRICED with the new figures, shown here to
// confirm). Each press carries its own idempotency key, reused if the press is
// retried after a dropped connection, so an order is never placed twice.

// The delivery zones the ERP's Website settings price (D-953): the shopper
// picks one and writes the whole address in one box (no district or thana
// pickers). The zone sets the delivery charge, so none is picked for them.
const ZONES = ["inside_dhaka", "suburbs", "outside_dhaka"];
const ZONE_OPTIONS = [
  { value: "inside_dhaka", label: "Inside Dhaka", desc: "Gulshan, Dhanmondi, Mirpur, Uttara…" },
  { value: "suburbs", label: "Suburbs", desc: "Savar, Gazipur, Narayanganj…" },
  { value: "outside_dhaka", label: "Outside Dhaka", desc: "Chittagong, Sylhet, Rajshahi…" },
];

// The ERP discount engine's commonest reasons for refusing a typed code, in
// the shop's voice; any other reason is shown as the ERP words it.
const CODE_REASONS = {
  not_found: "we couldn't find that code. Do check the spelling.",
  expired: "that code has expired.",
  minimum_not_met: "the bag doesn't reach that code's minimum yet.",
};

function newKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const taka = (money) => Number(money?.taka || 0);
const localPhone = (value) => String(value || "").replace(/^\+?880/, "0");

// Turn the ERP's verdict on the basket into one calm paragraph.
//
// Being told off at the till for something the shop did is the fastest way to
// lose an order that was otherwise finished, so this never blames the customer
// and always ends with the one thing they can do next.
function describeStockChanges(changed) {
  const gone = changed.filter((c) => c.status === "gone" || c.available === 0);
  const trimmed = changed.filter((c) => c.status === "limited" && c.available > 0);
  const repriced = changed.filter((c) => c.status === "repriced");
  if (!gone.length && !trimmed.length && !repriced.length) return null;

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

  if (repriced.length === 1) lines.push(repriced[0].reason || `The price of ${label(repriced[0])} changed.`);
  else if (repriced.length > 1) lines.push("A few prices in your bag changed since you added them.");

  return {
    blocking: gone.length > 0,
    title: gone.length
      ? "Sorry — that just sold out"
      : trimmed.length
      ? "We adjusted a quantity for you"
      : "A price changed",
    body: lines.join(" "),
    hint: gone.length
      ? "Take it out of the bag below, or swap it for something else you like — everything else is ready to go."
      : "Have a look at your order below — the total is the new one — and place it whenever you're ready.",
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
  const { items, subtotal, updateQuantity, removeItem, clearCart, syncWithServer, reconcile, mounted: cartMounted } = useCart();
  const { settings } = useSettings();
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [zone, setZone] = useState("");
  const [zoneError, setZoneError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCodes, setAppliedCodes] = useState([]);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [coupon, setCoupon] = useState(null);   // the answer to the last Apply
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [saved, setSaved] = useState([]);
  const [savedChoice, setSavedChoice] = useState(null);
  const [notice, setNotice] = useState(null);
  const noticeRef = useRef(null);
  const couponRef = useRef(null);
  const zoneRef = useRef(null);
  const pressKey = useRef(null);
  // The browser's half of the Purchase the ERP sends, fixed per press like its
  // key, so a retried press sends the same body (nothing while tracking is off).
  const pressTracking = useRef(undefined);

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
    setError,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: session?.user?.name || "",
      email: session?.user?.email || "",
      phone: "",
      addressLine: "",
      notes: "",
    },
  });
  const phone = watch("phone");

  const fillAddress = useCallback(
    (a) => {
      setValue("name", a.name || "");
      setValue("phone", localPhone(a.phone));
      // An address saved before D-953 kept its area apart: it joins the one line.
      setValue("addressLine", [a.addressLine, a.area].filter(Boolean).join(", "));
      if (ZONES.includes(a.zone)) setZone(a.zone);
      setSavedChoice(a.id || null);
    },
    [setValue]
  );

  // A signed-in shopper's saved addresses (kept in the ERP) fill the form in one tap.
  useEffect(() => {
    if (!session?.user?.id) return;
    if (session.user.name) setValue("name", session.user.name);
    if (session.user.email) setValue("email", session.user.email);
    fetch("/api/account/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((profile) => {
        if (!profile) return;
        setSaved(profile.addresses || []);
        if (profile.phone) setValue("phone", localPhone(profile.phone));
        const preferred = (profile.addresses || []).find((a) => a.isDefault) || profile.addresses?.[0];
        if (preferred) fillAddress(preferred);
      })
      .catch(() => {});
  }, [session?.user?.id, session?.user?.name, session?.user?.email, setValue, fillAddress]);

  // The ways to pay the shop has switched on in the ERP.
  const gateways = settings?.paymentGateways || {};
  const paymentOptions = useMemo(
    () => [
      ...(gateways.cod?.enabled !== false
        ? [{ value: "cod", label: "Cash on delivery", desc: "Pay the rider when your parcel arrives.", icon: Truck }]
        : []),
      ...(gateways.sslcommerz?.enabled
        ? [{ value: "sslcommerz", label: "Pay online", desc: "bKash, Nagad or card — through SSLCommerz.", icon: CreditCard }]
        : []),
    ],
    [gateways.cod?.enabled, gateways.sslcommerz?.enabled]
  );

  // Never leave a method selected that the shop has since switched off.
  useEffect(() => {
    if (paymentOptions.length && !paymentOptions.some((o) => o.value === paymentMethod)) {
      setPaymentMethod(paymentOptions[0].value);
    }
  }, [paymentOptions, paymentMethod]);

  const lines = useMemo(
    () => items.filter((i) => !i.unavailable).map((i) => ({ skuId: i.skuId, qty: i.quantity })),
    [items]
  );
  const quotePhone = normalizeBdPhone(phone || "");
  const phoneForQuote = quotePhone.length === 11 ? quotePhone : undefined;

  // Ask the ERP for the figures whenever the cart, the zone or the codes change.
  const requestQuote = useCallback(
    async (codes) => {
      if (!lines.length) return null;
      const res = await fetch("/api/cart/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines,
          address: zone ? { zone } : undefined,
          codes,
          phone: phoneForQuote,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not price your bag");
      return data.quote;
    },
    [lines, zone, phoneForQuote]
  );

  useEffect(() => {
    if (!lines.length) { setQuote(null); return; }
    let cancelled = false;
    setQuoting(true);
    const timer = setTimeout(() => {
      requestQuote(appliedCodes)
        .then((q) => { if (!cancelled) setQuote(q); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setQuoting(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [requestQuote, appliedCodes, lines.length]);

  // The figures, all the ERP's own.
  const shippingRule = settings?.shipping || {};
  const itemsTotal = quote ? taka(quote.items) : subtotal;
  const discountTotal = quote ? taka(quote.discount) : 0;
  const delivery = quote ? Math.max(0, taka(quote.delivery) - taka(quote.deliveryDiscount)) : 0;
  const deliveryCoupon = quote ? taka(quote.deliveryDiscount) > 0 : false;
  const priced = !!quote && !!zone && quote.deliverable && quote.zone === zone;
  const freeDelivery = !!quote?.freeShipping || (priced && delivery === 0);
  const total = quote ? taka(quote.total) : subtotal;
  const freeOver = shippingRule.freeShippingEnabled ? shippingRule.freeShippingThreshold : null;

  // Applying a code answers in the panel itself — a green line and a chip that
  // pops in, or a red line and one shake. A toast is the wrong place for it:
  // the field the customer is looking at is the thing that needs to react.
  // The ERP's quote is the judge: a code it does not apply is not kept.
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
      const q = await requestQuote(next);
      const verdict = (q?.codes || []).find((c) => c.code === code);
      if (verdict?.applied) {
        setAppliedCodes(next);
        setQuote(q);
        setCouponInput("");
        const applied = (q.discounts || []).find((d) => d.code === code);
        const amount = taka(applied?.amount);
        const saved = amount > 0
          ? `you saved ${formatPrice(amount)}`
          : taka(applied?.deliveryAmount) > 0
          ? "delivery is on us"
          : "it's on your order";
        setCoupon({ ok: true, text: `${code} applied — ${saved}.`, nonce: Date.now() });
      } else {
        const reason = verdict?.reason;
        setCoupon({
          ok: false,
          text: reason
            ? `${code} — ${CODE_REASONS[reason] || `${reason.replace(/_/g, " ")}.`}`
            : `We couldn't use ${code} on this order. Do check the spelling.`,
          nonce: Date.now(),
        });
        // The shake remounts the row, which drops focus. Put it back with the
        // code selected, so a typo is one keystroke from being fixed.
        requestAnimationFrame(() => couponRef.current?.select());
      }
    } catch {
      setCoupon({ ok: false, text: "We couldn't reach the shop just then. Try once more?", nonce: Date.now() });
    } finally {
      setApplyingCoupon(false);
    }
  };
  const removeCode = (code) => {
    setAppliedCodes((a) => a.filter((c) => c !== code));
    setCoupon(null);
  };

  // A line's name and size, for the ERP's refusals that only name SKUs.
  const describeSku = (skuId) => {
    const item = items.find((i) => i.skuId === skuId);
    return item ? { name: item.name, size: item.size } : {};
  };

  const onSubmit = async (data) => {
    if (liveItems.length === 0) {
      toast.error("Your bag is empty");
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
    if (!zone) {
      setZoneError("Pick the zone your address falls in — it sets the delivery charge.");
      zoneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setZoneError("");
    if (!paymentMethod || !paymentOptions.length) {
      toast.error("Please choose how you'd like to pay");
      return;
    }
    if (paymentMethod === "sslcommerz" && !data.email) {
      setError("email", { message: "Online payment needs an email — your receipt goes there" });
      return;
    }
    if (!quote || quoting) {
      toast("Updating your total — one moment…");
      return;
    }
    if (!quote.deliverable) {
      toast.error("We don't deliver to that zone yet. Please choose another.");
      return;
    }

    setPlacing(true);
    try {
      // Last look at the shelves before the order goes in. Stock can go in the
      // minutes it takes to fill in an address, and finding out here — with the
      // basket still editable — is far kinder than a refused order.
      const { changed } = await syncWithServer({ keepUnavailable: true });
      const moved = describeStockChanges(changed);
      if (moved || quote.unavailable?.length) {
        showNotice(
          moved || {
            blocking: false,
            title: "Your bag changed",
            body: "Something in your bag changed since the total was worked out.",
            hint: "Have a look at your order below and press Place order again.",
          }
        );
        return;
      }

      // One key per press; a press retried after a dropped connection reuses it.
      if (!pressKey.current) {
        pressKey.current = newKey();
        pressTracking.current = await checkoutTracking().catch(() => undefined);
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": pressKey.current },
        body: JSON.stringify({
          lines,
          contact: { name: data.name, phone: data.phone, email: data.email || undefined },
          address: { zone, addressLine: data.addressLine },
          codes: appliedCodes,
          paymentMethod,
          notes: data.notes || undefined,
          locale: "en",
          expected: {
            totalPoisha: quote.total.poisha,
            lines: quote.lines.map((l) => ({ skuId: l.skuId, unitPricePoisha: l.unitPrice.poisha })),
          },
          tracking: pressTracking.current,
        }),
      });
      const result = await res.json().catch(() => ({}));
      // Only a definitive answer ends this press: placed (2xx) or refused (4xx).
      // A gateway timeout, a 5xx or "still being placed" may mean the order went
      // in, so the next press reuses the key and gets that same order back.
      const definitive = res.ok || (res.status >= 400 && res.status < 500 && result.code !== "IDEMPOTENCY_IN_FLIGHT");
      if (definitive) pressKey.current = null;

      if (!res.ok) {
        if (result.code === "CART_REPRICED" && result.quote) {
          // The ERP's fresh figures replace the old ones on screen; the shopper
          // confirms them with another press.
          setQuote(result.quote);
          reconcile(
            result.quote.lines.map((l) => ({
              skuId: l.skuId,
              status: "ok",
              price: taka(l.unitPrice),
              regularPrice: l.compareAt ? taka(l.compareAt) : null,
              available: l.availableQty,
            })),
            { keepUnavailable: true }
          );
          showNotice({
            blocking: false,
            title: "Prices moved since you opened checkout",
            body: "The total below is the new one.",
            hint: "Have a look and press Place order again when you're happy with it.",
          });
        } else if (result.code === "OUT_OF_STOCK" && result.lines) {
          // Someone else took the last one between our check and the order.
          const changedLines = result.lines.map((l) => ({
            skuId: l.skuId,
            ...describeSku(l.skuId),
            status: l.availableQty > 0 ? "limited" : "gone",
            available: l.availableQty || 0,
          }));
          reconcile(changedLines, { keepUnavailable: true });
          showNotice(
            describeStockChanges(changedLines) || {
              blocking: true,
              title: "Sorry — that just sold out",
              body: result.error || "One of the pieces in your bag went while you were checking out.",
              hint: "Take it out of the bag below, or swap it for something else you like — everything else is ready to go.",
            }
          );
        } else if (result.code === "ORDER_PHONE_INVALID") {
          setError("phone", { message: result.error || "That doesn't look like a mobile number — 11 digits starting 01" });
        } else if (result.code === "CART_NOT_DELIVERABLE") {
          setZoneError(result.error || "We don't deliver to that zone yet. Please choose another.");
        } else {
          toast.error(result.error || "We couldn't place the order. Please try again.");
        }
        return;
      }

      const order = result.order;
      if (order.payment?.required) {
        // Online payment: the ERP opens SSLCommerz's page for this order.
        setDone({ kind: "redirect" });
        const payRes = await fetch("/api/payment/sslcommerz/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNo: order.orderNo }),
        });
        const pay = await payRes.json().catch(() => ({}));
        clearCart();
        if (payRes.ok && pay.gatewayUrl) {
          window.location.href = pay.gatewayUrl;
        } else {
          toast.error(pay.error || "The payment page could not be opened. You can pay from your order page.");
          router.push(`/order-confirmation/${order.orderNo}`);
        }
        return;
      }

      // Hold the confirmation on screen for a beat before navigating. The
      // order is already placed; this is the moment the customer needs to see
      // that it worked, and it covers the confirmation page's load.
      setDone({ kind: "placed" });
      clearCart();
      setTimeout(() => router.push(`/order-confirmation/${order.orderNo}`), 1150);
    } catch {
      // The connection dropped: the key is kept, so pressing again is safe.
      setDone(null);
      toast.error("Connection lost. Please press Place order again — you won't be charged twice.");
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

  // The bag is read from this browser's storage after the first paint.
  if (!cartMounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
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

  const canPlace = !placing && !blocked && liveItems.length > 0 && paymentOptions.length > 0;
  const deliveryLabel = !zone
    ? "Pick a zone"
    : quoting && !priced
    ? "…"
    : !quote?.deliverable
    ? "—"
    : freeDelivery
    ? "Free"
    : formatPrice(delivery);

  return (
    <div className="min-h-screen bg-paper pb-[104px] pt-5 md:pt-8 lg:pb-14">
      <div className="container-custom">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-2 md:mb-8">
          <h1 className="section-title">Checkout</h1>
          <p className="pb-1.5 text-[14px] tabular-nums text-smoke md:pb-2 md:text-[15px]">
            {unitCount} item{unitCount === 1 ? "" : "s"} · {formatPrice(total)}
          </p>
        </div>

        {/* Stock and price news lands here — above the fold on every screen
            size, in the page rather than in a toast, because it needs an answer. */}
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
          noValidate
          className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start lg:gap-8 xl:gap-10"
        >
          {/* ── Left: who, where, how ──────────────────────────────────────── */}
          <div className="space-y-5 lg:col-span-7 lg:space-y-6">
            <Panel
              title="Where should it go?"
              subtitle="A name, a number the rider can call, and the address."
              icon={MapPin}
            >
              {/* A signed-in shopper's addresses, kept in their account. */}
              {saved.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2 text-[14px] font-medium text-ink">Saved addresses</p>
                  <div className="flex flex-wrap gap-2">
                    {saved.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => fillAddress(a)}
                        aria-pressed={savedChoice === a.id}
                        className={`chip max-w-full ${savedChoice === a.id ? "chip-active" : ""}`}
                      >
                        <span className="truncate">
                          {a.label ? `${a.label} — ` : ""}
                          {a.addressLine}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    label="Full name *"
                    {...register("name", { required: "Please tell us who to address it to" })}
                    error={errors.name?.message}
                    placeholder="Your full name"
                    autoComplete="name"
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
                  label={paymentMethod === "sslcommerz" ? "Email address *" : "Email address"}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  {...register("email")}
                  error={errors.email?.message}
                  placeholder="your@email.com"
                />

                {/* One box instead of four. Addresses here are landmarks and
                    directions, not a house number and a postcode, and four
                    half-width fields on a phone had people writing the same
                    line twice. */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-[14px] font-medium text-ink" htmlFor="field-addressLine">
                    Delivery address *
                  </label>
                  <textarea
                    id="field-addressLine"
                    rows={4}
                    maxLength={500}
                    autoComplete="street-address"
                    {...register("addressLine", {
                      required: "We'll need an address to deliver to",
                      minLength: { value: 12, message: "A little more detail, please — enough for a rider to find you" },
                    })}
                    placeholder={"House / flat, road, area, city — and any landmark that helps.\ne.g. Flat 4B, House 12, Road 7, Banani — beside Banani Bidyaniketan, Dhaka"}
                    className={`input-base resize-y leading-relaxed ${
                      errors.addressLine ? "border-signal focus:border-signal focus:ring-signal/15" : ""
                    }`}
                  />
                  {errors.addressLine ? (
                    <p className="mt-1.5 text-[13px] text-signal">{errors.addressLine.message}</p>
                  ) : (
                    <p className="mt-1.5 text-[13px] leading-snug text-smoke">
                      Write it the way you would say it out loud — the whole thing in this one box.
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label="Order notes"
                    {...register("notes")}
                    placeholder="Anything the rider should know"
                    maxLength={1000}
                  />
                </div>
              </div>
            </Panel>

            <div ref={zoneRef}>
              <Panel
                title="Delivery zone *"
                subtitle="This sets the delivery charge, so pick the one your address falls in."
                icon={Truck}
              >
                <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Delivery zone">
                  {ZONE_OPTIONS.map((opt) => {
                    const active = zone === opt.value;
                    // The fee from the ERP's Website → Settings, or the quote's
                    // own figure once this zone is the one priced.
                    const fee = active && priced && !quoting ? delivery : shippingRule.zones?.[opt.value];
                    const free = !!quote?.freeShipping || (typeof fee === "number" && fee === 0);
                    return (
                      <label key={opt.value} className="press relative block cursor-pointer">
                        <input
                          type="radio"
                          name="deliveryZone"
                          value={opt.value}
                          checked={active}
                          onChange={() => { setZone(opt.value); setZoneError(""); }}
                          className="peer sr-only"
                        />
                        {/* Ring, not border width: a selected tile must not be a
                            pixel bigger than an unselected one, or the row jumps
                            every time you change your mind. */}
                        <div
                          className={`flex h-full flex-col rounded-3xl p-4 ring-2 ring-inset transition-[background-color,color,box-shadow] duration-base ease-swift peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper-pure ${
                            active
                              ? "bg-ink text-paper-pure ring-ink"
                              : zoneError
                              ? "bg-haze text-ink ring-signal/60"
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
                              free ? (active ? "text-beam" : "text-emerald-600") : ""
                            }`}
                            data-testid={active ? "delivery-fee" : undefined}
                          >
                            {free ? "Free" : typeof fee === "number" ? formatPrice(fee) : ""}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {zoneError && <p className="mt-3 text-[13px] text-signal">{zoneError}</p>}
                {!quote?.freeShipping && freeOver > 0 && itemsTotal < freeOver && (
                  <p className="mt-3.5 inline-flex items-center gap-2 rounded-full bg-beam-soft px-3.5 py-2 text-[12.5px] font-medium text-ink">
                    <Tag size={13} strokeWidth={2.4} />
                    {formatPrice(freeOver - itemsTotal)} more and delivery is on us
                  </p>
                )}
              </Panel>
            </div>

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
                    the scroll. Figures are the quote's own when it has them. */}
                <ul className="divide-y divide-haze-dark lg:max-h-[38vh] lg:overflow-y-auto">
                  {items.map((item) => {
                    const out = !!item.unavailable;
                    const atMax = typeof item.maxStock === "number" && item.quantity >= item.maxStock;
                    const line = quote?.lines?.find((l) => l.skuId === item.skuId);
                    const unit = line ? taka(line.unitPrice) : item.price;
                    const lineTotal = line ? taka(line.lineTotal) : item.price * item.quantity;
                    const shelf = line?.compareAt
                      ? taka(line.compareAt) * item.quantity
                      : item.regularPrice
                      ? item.regularPrice * item.quantity
                      : null;
                    return (
                      <li key={`${item.productId}-${item.size}`} className="flex gap-3.5 py-4 sm:gap-4">
                        <Link
                          href={`/shop/${item.slug}`}
                          className={`relative aspect-[4/5] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-haze ring-1 ring-inset ring-ink/5 transition-opacity duration-base ease-swift sm:w-[78px] ${
                            out ? "opacity-40 grayscale" : ""
                          }`}
                        >
                          <Image
                            src={item.image || PLACEHOLDER_IMAGE}
                            alt={item.name}
                            fill
                            unoptimized={shouldUnoptimizeImage(item.image || PLACEHOLDER_IMAGE)}
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
                                Size {item.size} · {formatPrice(unit)} each
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
                              <span className="ml-auto flex flex-col items-end leading-tight">
                                {shelf > lineTotal && <WasPrice amount={shelf} className="text-[12px]" />}
                                <span
                                  className={`text-[15px] font-bold tabular-nums tracking-[-0.02em] ${
                                    shelf > lineTotal ? "text-signal" : "text-ink"
                                  }`}
                                >
                                  {formatPrice(lineTotal)}
                                </span>
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
                  on a hairline it looks glued to. The ERP decides whether a
                  code applies. */}
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
                      maxLength={40}
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

                  {/* Discounts the shop applies by itself (the ERP's automatic offers). */}
                  {(quote?.discounts || []).filter((d) => d.automatic).map((d) => (
                    <p key={d.title} className="mt-2.5 flex items-start gap-1.5 px-1 text-[12.5px] leading-snug text-emerald-700">
                      <Check size={13} strokeWidth={3} className="mt-0.5 shrink-0" />
                      {d.title} applied
                    </p>
                  ))}
                </div>
              </div>

              {/* Totals and the button, on the dark ground the bag already
                  uses. The order stops being a list here and becomes an
                  amount — the ERP's quote, to the poisha. */}
              <div className="bg-ink p-6 text-paper-pure sm:p-7">
                <dl className="space-y-3 text-[14.5px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/50">Subtotal</dt>
                    <dd className="tabular-nums" data-testid="quote-items">{formatPrice(itemsTotal)}</dd>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/50">Discount</dt>
                      <dd className="tabular-nums text-beam">− {formatPrice(discountTotal)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/50">Delivery{deliveryCoupon ? " (coupon)" : ""}</dt>
                    <dd className={zone && freeDelivery ? "font-semibold text-beam" : "tabular-nums"}>
                      {deliveryLabel}
                    </dd>
                  </div>
                </dl>

                <div className="my-5 border-t border-white/12" />

                <div className="flex items-end justify-between gap-4">
                  <span className="text-[14.5px] text-white/50">Total</span>
                  <span className="text-[30px] font-bold leading-none tracking-[-0.03em] tabular-nums" data-testid="quote-total">
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
              {blocked
                ? "One item needs a look"
                : !zone
                ? "Total · pick a delivery zone"
                : `Total${freeDelivery ? " · free delivery" : ""}`}
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
