"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Truck, RefreshCw, Headphones } from "lucide-react";
import toast from "react-hot-toast";
import { useSettings } from "@/context/SettingsContext";
import { normalizeSiteInfo, telHref } from "@/lib/siteInfo";
import Wordmark from "@/components/brand/Wordmark";

const PROMISES = [
  { Icon: Truck, title: "Free over Tk 1500", note: "Nationwide, 2–4 working days" },
  { Icon: RefreshCw, title: "7-day exchange", note: "Wrong size? Send it back" },
  { Icon: Headphones, title: "Real people", note: "Sat–Thu on WhatsApp" },
];

const COLUMNS = [
  {
    label: "Shop",
    links: [
      { label: "All products", href: "/shop" },
      { label: "New arrivals", href: "/shop?newArrival=true" },
      { label: "On sale", href: "/shop?onSale=true" },
      { label: "Gift ideas", href: "/shop?sort=featured" },
    ],
  },
  {
    label: "Help",
    links: [
      { label: "Track an order", href: "/account/orders" },
      { label: "Returns & exchanges", href: "/returns" },
      { label: "Shipping policy", href: "/shipping" },
      { label: "Size guide", href: "/shop" },
    ],
  },
  {
    label: "Company",
    links: [
      { label: "About Orvo", href: "/about" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms & conditions", href: "/terms" },
    ],
  },
];

export default function Footer() {
  const { settings } = useSettings();
  const { siteName, phone, email, address, social } = normalizeSiteInfo(
    settings?.siteInfo,
    settings?.socialLinks
  );

  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const socials = [
    { label: "Instagram", href: social.instagram },
    { label: "Facebook", href: social.facebook },
    { label: "TikTok", href: social.tiktok },
  ].filter((s) => s.href);

  const subscribe = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      setValue("");
      toast.success("You are on the list.");
    } catch {
      toast.error("Could not sign you up. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <footer className="container-custom pb-4">
      <div className="rounded-4xl md:rounded-5xl bg-ink text-paper-pure overflow-hidden">

        {/* ── Promises ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 sm:p-8 lg:p-10 pb-0">
          {PROMISES.map(({ Icon, title, note }) => (
            <div key={title} className="flex items-center gap-4 rounded-3xl bg-white/[0.05] p-5">
              <span className="w-11 h-11 rounded-full bg-beam flex items-center justify-center shrink-0">
                <Icon size={19} strokeWidth={2} className="text-ink" />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold tracking-[-0.015em]">{title}</p>
                <p className="text-[13px] text-white/45 mt-0.5">{note}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Signup + links ───────────────────────────────────────────────── */}
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-10 lg:gap-16">

            <div>
              <Wordmark size="lg" tone="paper" />
              <p className="text-[15px] text-white/50 leading-relaxed mt-5 max-w-[36ch]">
                Considered, everyday clothing. Drop dates and restocks, straight to your inbox.
              </p>

              {done ? (
                <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-beam px-4 py-2.5 text-[14px] font-semibold text-ink">
                  Subscribed — see you Thursday
                </p>
              ) : (
                <form onSubmit={subscribe} className="mt-6 flex items-center gap-2 max-w-[420px]">
                  <input
                    type="email"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="your@email.com"
                    className="input-dark flex-1"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    aria-label="Subscribe"
                    className="w-14 h-[54px] shrink-0 rounded-2xl bg-beam text-ink flex items-center justify-center hover:bg-beam-dark transition-colors disabled:opacity-50"
                  >
                    <ArrowRight size={19} strokeWidth={2.2} />
                  </button>
                </form>
              )}

              {socials.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-7">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-[13.5px] font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      {s.label}
                      <ArrowUpRight size={13} strokeWidth={2.2} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-9">
              {COLUMNS.map((col) => (
                <div key={col.label}>
                  <p className="text-[13px] font-semibold text-white/35 mb-4">{col.label}</p>
                  <ul className="space-y-2.5">
                    {col.links.map((link) => (
                      <li key={link.href + link.label}>
                        <Link
                          href={link.href}
                          className="text-[14.5px] text-white/70 hover:text-beam transition-colors"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div>
                <p className="text-[13px] font-semibold text-white/35 mb-4">Contact</p>
                <ul className="space-y-2.5 text-[14.5px] text-white/70">
                  {address && <li className="leading-relaxed">{address}</li>}
                  {phone && (
                    <li>
                      <a href={telHref(phone)} className="hover:text-beam transition-colors">
                        {phone}
                      </a>
                    </li>
                  )}
                  {email && (
                    <li>
                      <a href={`mailto:${email}`} className="hover:text-beam transition-colors break-all">
                        {email}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* ── Legal ──────────────────────────────────────────────────────── */}
          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[13px] text-white/30 order-2 sm:order-1">
              © {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 order-1 sm:order-2">
              {["bKash", "Nagad", "Visa", "Mastercard", "COD"].map((m) => (
                <span
                  key={m}
                  className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] text-white/45"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
