import Link from "next/link";
import { SITE_URL, pageMetadata } from "@/lib/seo";
import { getSite, getSiteInfo } from "@/lib/storefront";
import { telHref } from "@/lib/siteInfo";
import { formatPrice } from "@/lib/utils";

// The title takes the shop's name from the layout's template (the ERP's
// Website → Settings); the canonical address and share text come with it
// (lib/seo.js).
export const metadata = pageMetadata({
  title: "Terms & Conditions",
  description: "Orvo's terms and conditions governing the use of our website and services.",
  path: "/terms",
});

// Contact details, the delivery rule and the payment methods come from the
// brand ERP (Website → Settings) on each request.
export const dynamic = "force-dynamic";

const LAST_UPDATED = "1 May 2025";

// The site's own address, as it is served (NEXT_PUBLIC_SITE_URL).
const HOST = SITE_URL.replace(/^https?:\/\//, "");

export default async function TermsPage() {
  const [{ phone, email, address }, site] = await Promise.all([getSiteInfo(), getSite()]);
  const { shipping, paymentGateways } = site;
  const freeOver = shipping?.freeShippingEnabled && shipping.freeShippingThreshold ? shipping.freeShippingThreshold : null;
  const methods = [
    paymentGateways?.sslcommerz?.enabled ? "SSLCommerz (bKash, Cards)" : null,
    paymentGateways?.cod?.enabled !== false ? "Cash on Delivery (COD)" : null,
  ].filter(Boolean);
  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="bg-paper border-b border-smoke/15 py-14">
        <div className="container-custom">
          <p className="text-smoke text-[10px] uppercase tracking-[-0.005em] mb-3">Legal</p>
          <h1 className="text-4xl md:text-5xl font-semibold text-ink mb-3">Terms & Conditions</h1>
          <p className="text-smoke text-sm">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom py-14">
        <div className="max-w-3xl">
          <div className="space-y-10">

            <section>
              <p className="text-ink/60 text-[14px] leading-relaxed">
                Welcome to Orvo. By accessing or using our website ({HOST}) or placing an order, you agree to be bound by these Terms and Conditions. Please read them carefully before making a purchase.
              </p>
            </section>

            <LegalSection title="1. Acceptance of Terms">
              <p>By using our website, you confirm that you are at least 18 years old (or have parental consent) and that you accept these Terms and Conditions in full. If you do not agree, please do not use our services.</p>
            </LegalSection>

            <LegalSection title="2. Products and Pricing">
              <ul>
                <li>All prices are displayed in Bangladeshi Taka (Tk / BDT) and include applicable taxes unless stated otherwise.</li>
                <li>We reserve the right to change prices at any time without prior notice. Once an order is confirmed, the price is locked in.</li>
                <li>Product images are for illustrative purposes. Actual colours may vary slightly due to display settings.</li>
                <li>We do not guarantee that all products are in stock. If an item becomes unavailable after your order, we will notify you and issue a full refund.</li>
              </ul>
            </LegalSection>

            <LegalSection title="3. Orders and Payment">
              <ul>
                <li>Placing an order constitutes an offer to purchase. We reserve the right to accept or decline any order.</li>
                <li>An order confirmation email confirms acceptance. The sale is complete when the order is dispatched.</li>
                <li>We accept payment via {methods.join(" and ") || "Cash on Delivery (COD)"}, subject to availability.</li>
                <li>For COD orders, payment is collected upon delivery. Please ensure the correct amount is available.</li>
                <li>We reserve the right to cancel orders if payment cannot be verified or if we suspect fraud.</li>
              </ul>
            </LegalSection>

            <LegalSection id="shipping" title="4. Shipping and Delivery">
              <ul>
                <li>We deliver across all 64 districts of Bangladesh.</li>
                <li>Standard delivery takes 3–7 business days depending on your location.</li>
                <li>Delivery times are estimates and are not guaranteed. We are not liable for delays caused by courier services or circumstances beyond our control.</li>
                {freeOver ? (
                  <li>Free shipping is available on orders over {formatPrice(freeOver)}. A standard shipping fee applies to smaller orders; see our <Link href="/shipping">Shipping &amp; Delivery</Link> page.</li>
                ) : (
                  <li>A shipping fee applies to every order, shown at checkout; see our <Link href="/shipping">Shipping &amp; Delivery</Link> page for the fees.</li>
                )}
                <li>Risk of loss and title for items pass to you upon delivery.</li>
              </ul>
            </LegalSection>

            <LegalSection id="returns" title="5. Returns and Exchanges">
              <ul>
                <li>We accept returns within 7 days of delivery for unused, unwashed items in original packaging with tags attached.</li>
                <li>Sale items, innerwear, and customised products are non-returnable.</li>
                <li>To initiate a return, contact us{email && <> at <a href={`mailto:${email}`}>{email}</a></>} with your order number and reason.</li>
                <li>Refunds are processed within 5–7 business days after we receive and inspect the returned item.</li>
                <li>Shipping costs for returns are borne by the customer unless the item is defective or incorrect.</li>
              </ul>
              <p>
                See our <Link href="/returns">Returns &amp; Exchanges</Link> page for how to send an item back.
              </p>
            </LegalSection>

            <LegalSection title="6. User Accounts">
              <ul>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You must immediately notify us of any unauthorised use of your account.</li>
                <li>We reserve the right to terminate accounts that violate these Terms.</li>
              </ul>
            </LegalSection>

            <LegalSection title="7. Intellectual Property">
              <p>
                All content on this website — including logos, images, text, and designs — is the property of Orvo and is protected under applicable copyright and trademark laws. You may not reproduce, distribute, or use our content without prior written permission.
              </p>
            </LegalSection>

            <LegalSection title="8. Limitation of Liability">
              <p>
                To the fullest extent permitted by law, Orvo shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our website or products. Our total liability shall not exceed the amount you paid for the relevant order.
              </p>
              <p>
                We do not guarantee that our website will be uninterrupted, error-free, or free of viruses.
              </p>
            </LegalSection>

            <LegalSection title="9. Privacy">
              <p>
                Your use of our website is also governed by our <Link href="/privacy" className="hover:underline">Privacy Policy</Link>, which is incorporated into these Terms by reference.
              </p>
            </LegalSection>

            <LegalSection title="10. Changes to Terms">
              <p>
                We reserve the right to modify these Terms at any time. Changes take effect immediately upon posting on this page. Continued use of our website following any changes constitutes your acceptance of the new Terms.
              </p>
            </LegalSection>

            <LegalSection title="11. Governing Law">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the People&apos;s Republic of Bangladesh. Any disputes shall be subject to the exclusive jurisdiction of the courts of Dhaka, Bangladesh.
              </p>
            </LegalSection>

            <LegalSection title="12. Contact Us">
              <p>If you have questions about these Terms, please contact us:</p>
              <ul>
                {email && (<li>Email: <a href={`mailto:${email}`}>{email}</a></li>)}
                {phone && (<li>Phone: <a href={telHref(phone)}>{phone}</a></li>)}
                <li>Address: {address}</li>
              </ul>
            </LegalSection>

          </div>
        </div>
      </div>
    </div>
  );
}

function LegalSection({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-[calc(var(--header-h)+24px)]">
      <h2 className="text-xl font-semibold text-ink mb-4 pb-2 border-b border-smoke/15">{title}</h2>
      <div className="space-y-3 text-ink/70 text-[14px] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_strong]:text-ink [&_strong]:font-semibold [&_a]:text-signal">
        {children}
      </div>
    </section>
  );
}
