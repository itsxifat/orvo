"use client";

import Link from "next/link";
import { ArrowUpRight, Truck, RefreshCw, Headphones, Users } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { normalizeSiteInfo, telHref } from "@/lib/siteInfo";
import Wordmark from "@/components/brand/Wordmark";

const COLUMNS = [
  {
    label: "Shop",
    links: [
      { label: "All products", href: "/shop" },
      { label: "New arrivals", href: "/shop?newArrival=true" },
      { label: "On sale", href: "/shop?onSale=true" },
      { label: "Flash sale", href: "/flash-sale" },
    ],
  },
  {
    label: "Help",
    links: [
      { label: "Track an order", href: "/account/orders" },
      { label: "Returns & exchanges", href: "/returns" },
      { label: "Shipping policy", href: "/shipping" },
    ],
  },
  {
    label: "Company",
    links: [
      { label: "About", href: "/about", about: true },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms & conditions", href: "/terms" },
    ],
  },
];

/** "Tk 1,500" from the ERP's free-delivery threshold (whole taka, display only). */
function takaLabel(amount) {
  const n = Number(amount);
  return `Tk ${(Number.isFinite(n) ? n : 0).toLocaleString("en-BD")}`;
}

// The shop's footer, every figure in it from the brand ERP's Website → Settings:
// the delivery promise (the free-delivery rule), the contact details, the
// social profiles, the ways to pay, and the shop's group (COMMUNITY_GROUP_URL on
// the server, see app/layout.js; else the Facebook page).
export default function Footer() {
  const { settings } = useSettings();
  const { siteName, phone, email, address, social } = normalizeSiteInfo(
    settings?.siteInfo,
    settings?.socialLinks
  );
  // The shop's group when COMMUNITY_GROUP_URL is set; until then its Facebook page.
  const groupUrl = settings?.communityGroupUrl || social.facebook || "";
  const whatsapp = settings?.siteInfo?.whatsappNumber || "";

  const shipping = settings?.shipping;
  const threshold = Number(shipping?.freeShippingThreshold);
  const freeOver = shipping?.freeShippingEnabled && Number.isFinite(threshold) && threshold > 0 ? threshold : null;

  const promises = [
    {
      Icon: Truck,
      title: freeOver ? `Free over ${takaLabel(freeOver)}` : "Cash on delivery",
      note: "Nationwide delivery",
      href: "/shipping",
    },
    { Icon: RefreshCw, title: "7-day exchange", note: "Wrong size? Send it back", href: "/returns" },
    {
      Icon: Headphones,
      title: "Real people",
      note: whatsapp ? "Message us on WhatsApp" : phone ? `Call ${phone}` : "We answer every message",
      href: whatsapp ? `https://wa.me/${whatsapp}` : phone ? telHref(phone) : null,
      external: !!whatsapp,
    },
  ];

  const socials = [
    { label: "Instagram", href: social.instagram },
    { label: "Facebook", href: social.facebook },
    { label: "TikTok", href: social.tiktok },
  ].filter((s) => s.href);

  // The ways to pay this shop takes (Website → Settings → payments): online
  // through SSLCommerz (bKash, Nagad and cards), and cash on delivery.
  const payments = [
    ...(settings?.paymentGateways?.sslcommerz?.enabled ? ["bKash", "Nagad", "Visa", "Mastercard"] : []),
    ...(settings?.paymentGateways?.cod?.enabled !== false ? ["Cash on delivery"] : []),
  ];

  return (
    <footer className="container-custom pb-4">
      <div className="rounded-4xl md:rounded-5xl bg-ink text-paper-pure overflow-hidden">

        {/* ── Promises ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 sm:p-8 lg:p-10 pb-0">
          {promises.map(({ Icon, title, note, href, external }) => {
            const body = (
              <>
                <span className="w-11 h-11 rounded-full bg-beam flex items-center justify-center shrink-0">
                  <Icon size={19} strokeWidth={2} className="text-ink" />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold tracking-[-0.015em]">{title}</p>
                  <p className="text-[13px] text-white/45 mt-0.5 truncate">{note}</p>
                </div>
              </>
            );
            const cls = "flex items-center gap-4 rounded-3xl bg-white/[0.05] p-5";
            if (!href) return <div key={title} className={cls}>{body}</div>;
            return external ? (
              <a
                key={title}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${cls} hover:bg-white/[0.09] transition-colors`}
              >
                {body}
              </a>
            ) : (
              <Link key={title} href={href} className={`${cls} hover:bg-white/[0.09] transition-colors`}>
                {body}
              </Link>
            );
          })}
        </div>

        {/* ── The shop's group + links ─────────────────────────────────────── */}
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-10 lg:gap-16">

            <div>
              <Link href="/" aria-label={`${siteName} home`} className="inline-block">
                <Wordmark size="lg" tone="paper" />
              </Link>
              <p className="text-[15px] text-white/50 leading-relaxed mt-5 max-w-[36ch]">
                Considered, everyday clothing.
                {groupUrl && " First look at new drops and members-only offers in our group."}
              </p>

              {groupUrl && (
                <a
                  href={groupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-beam mt-6"
                >
                  <Users size={17} strokeWidth={2.2} />
                  Join our group
                  <ArrowUpRight size={16} strokeWidth={2.2} />
                </a>
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
                <nav key={col.label} aria-label={col.label}>
                  <p className="text-[13px] font-semibold text-white/35 mb-4">{col.label}</p>
                  <ul className="space-y-2.5">
                    {col.links.map((link) => (
                      <li key={link.href + link.label}>
                        <Link
                          href={link.href}
                          className="text-[14.5px] text-white/70 hover:text-beam transition-colors"
                        >
                          {link.about ? `About ${siteName}` : link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
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
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row md:mt-12">
            <p className="text-[13px] text-white/30 order-2 sm:order-1">
              © {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
            {payments.length > 0 && (
              <ul aria-label="Ways to pay" className="flex flex-wrap items-center justify-center gap-1.5 order-1 sm:order-2">
                {payments.map((m) => (
                  <li
                    key={m}
                    className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] text-white/45"
                  >
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
