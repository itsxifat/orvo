import Link from "next/link";
import { CalendarClock, Mail, Phone, Receipt, Tag } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { getSiteInfo } from "@/lib/storefront";
import { telHref } from "@/lib/siteInfo";

// The title takes the shop's name from the layout's template (the ERP's
// Website → Settings); the canonical address and share text come with it
// (lib/seo.js).
export const metadata = pageMetadata({
  title: "Returns & Exchanges",
  description: "Orvo's returns & exchanges policy — send back unused, unwashed items with their tags within 7 days of delivery.",
  path: "/returns",
});

// Contact details come from the brand ERP (Website → Settings) on each request.
export const dynamic = "force-dynamic";

// The policy is the one the Terms state (§5, app/(store)/terms); lib/seo.js's
// returnPolicyJsonLd tells Google the same (7 days, refunded). When the policy
// changes, change all three.
const LAST_UPDATED = "1 May 2025";

const AT_A_GLANCE = [
  { Icon: CalendarClock, title: "7 days", note: "to return or exchange, from the day it arrives" },
  { Icon: Tag, title: "Unused, tags on", note: "unwashed, in its original packaging" },
  { Icon: Receipt, title: "5–7 business days", note: "to refund, once it is back and inspected" },
];

export default async function ReturnsPage() {
  const { phone, email } = await getSiteInfo();
  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="bg-paper border-b border-smoke/15 py-14">
        <div className="container-custom">
          <p className="text-smoke text-[10px] uppercase tracking-[-0.005em] mb-3">Policy</p>
          <h1 className="text-4xl md:text-5xl font-semibold text-ink mb-3">Returns &amp; Exchanges</h1>
          <p className="text-smoke text-sm">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom py-14">
        <div className="max-w-3xl">
          {/* At a glance */}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {AT_A_GLANCE.map(({ Icon, title, note }) => (
              <li key={title} className="card-quiet flex items-start gap-3.5 p-5 sm:flex-col sm:gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-beam">
                  <Icon size={18} strokeWidth={2.2} className="text-ink" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-bold tracking-[-0.02em] text-ink">{title}</span>
                  <span className="mt-0.5 block text-[13.5px] leading-snug text-smoke">{note}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-12 space-y-10">
            <LegalSection title="1. What can be returned">
              <ul>
                <li>We accept returns within 7 days of delivery for unused, unwashed items in original packaging with tags attached.</li>
                <li>The same window and conditions apply when you would rather exchange an item for another size or colour.</li>
              </ul>
            </LegalSection>

            <LegalSection title="2. What can't be returned">
              <ul>
                <li>Sale items, innerwear, and customised products are non-returnable.</li>
                <li>Items that have been worn, washed or damaged, or that come back without their tags or packaging.</li>
              </ul>
            </LegalSection>

            <LegalSection title="3. How to start a return">
              <ol>
                <li>
                  Contact us within 7 days of delivery
                  {email && <> at <a href={`mailto:${email}`}>{email}</a></>}
                  {phone && <> {email ? "or" : "at"} <a href={telHref(phone)}>{phone}</a></>}, with your order number and the reason.
                </li>
                <li>We confirm whether the item can be returned and how to send it back.</li>
                <li>Pack the item unused, with its tags and in its original packaging.</li>
              </ol>
              <p>
                Signed in? Your order numbers are under <Link href="/account/orders">My orders</Link>.
              </p>
            </LegalSection>

            <LegalSection title="4. Refunds">
              <ul>
                <li>Refunds are processed within 5–7 business days after we receive and inspect the returned item.</li>
              </ul>
            </LegalSection>

            <LegalSection title="5. Return shipping">
              <ul>
                <li>Shipping costs for returns are borne by the customer unless the item is defective or incorrect.</li>
              </ul>
            </LegalSection>

            <p className="text-[14px] leading-relaxed text-ink/70">
              These rules are part of our <Link href="/terms#returns" className="text-signal hover:underline">Terms &amp; Conditions</Link>.
            </p>
          </div>

          {/* Contact */}
          <div className="card-dark relative mt-12 overflow-hidden p-7 md:p-9">
            <div aria-hidden className="absolute -right-16 -top-20 h-[260px] w-[260px] rounded-full bg-beam/20 blur-3xl" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-[22px] font-bold tracking-[-0.025em]">Need to send something back?</h2>
                <p className="mt-1.5 text-[14.5px] text-white/55">Tell us within 7 days of delivery, with your order number.</p>
              </div>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
                {phone && (
                  <a href={telHref(phone)} className="btn-beam">
                    <Phone size={16} strokeWidth={2.2} />
                    {phone}
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="btn-invert-outline break-all">
                    <Mail size={16} strokeWidth={2.2} className="shrink-0" />
                    {email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegalSection({ title, children }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-ink mb-4 pb-2 border-b border-smoke/15">{title}</h2>
      <div className="space-y-3 text-ink/70 text-[14px] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2 [&_strong]:text-ink [&_strong]:font-semibold [&_a]:text-signal">
        {children}
      </div>
    </section>
  );
}
