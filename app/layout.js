import "@fontsource-variable/saira";
import "./globals.css";
import Providers from "@/components/Providers";
import { getSite } from "@/lib/storefront";
import { DEFAULT_SITE_NAME, SITE_URL, TAGLINE } from "@/lib/seo";

// Every page reads the brand ERP (menu, contact details, prices, stock), so
// nothing is pre-rendered at build time.
export const dynamic = "force-dynamic";

// The site's own name (the ERP's Website → Settings), its default description
// and share picture (app/opengraph-image.jpg), and the ownership tags for Google
// Search Console, Bing Webmaster Tools and Meta's domain verification, read from
// the environment at run time so a code can be added without a rebuild. Each
// page adds its own title, description, canonical address and structured data.
export async function generateMetadata() {
  const settings = await getSite();
  const name = settings?.siteInfo?.siteName || DEFAULT_SITE_NAME;
  const title = `${name} — ${TAGLINE}`;
  const description = `${name} builds considered, everyday clothing for men, women and kids. Shop new drops, core essentials and seasonal edits online, with cash on delivery across Bangladesh.`;
  const other = {};
  if (process.env.BING_SITE_VERIFICATION) other["msvalidate.01"] = process.env.BING_SITE_VERIFICATION;
  if (process.env.FACEBOOK_DOMAIN_VERIFICATION) other["facebook-domain-verification"] = process.env.FACEBOOK_DOMAIN_VERIFICATION;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s | ${name}` },
    description,
    applicationName: name,
    keywords: [name, "clothing", "essentials", "fashion", "online shopping", "men", "women", "kids", "Bangladesh", "Dhaka", "cash on delivery"],
    category: "shopping",
    // No title or description here: each page's own become its og:title and
    // og:description (a page that sets none inherits them from its metadata).
    openGraph: { type: "website", siteName: name, locale: "en_BD" },
    twitter: { card: "summary_large_image" },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    formatDetection: { telephone: false, email: false, address: false },
    ...(process.env.GOOGLE_SITE_VERIFICATION || Object.keys(other).length
      ? { verification: { ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}), ...(Object.keys(other).length ? { other } : {}) } }
      : {}),
  };
}

export const viewport = {
  themeColor: "#F8F7F4",
};

// The shop's group (a Facebook or WhatsApp group link) for the footer's "Join
// our group": COMMUNITY_GROUP_URL in the env file, read at run time. Only an
// https address is used; without one the footer leaves the button out.
function communityGroupUrl() {
  const raw = String(process.env.COMMUNITY_GROUP_URL || "").trim();
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export default async function RootLayout({ children }) {
  // The menu, announcement, contact details, shipping rule and payment methods,
  // from the brand ERP (cached for its 30 seconds in lib/erp.js). If the ERP is
  // unreachable the frame still renders with neutral defaults.
  const settings = await getSite();
  return (
    <html lang="en-BD">
      <body className="font-sans antialiased bg-paper text-ink">
        {/* Scroll reveals start hidden and are shown by an IntersectionObserver.
            With scripting off that observer never runs, so everything below the
            first screen would stay invisible — this puts it back. */}
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
        <Providers settings={{ ...settings, communityGroupUrl: communityGroupUrl() }}>{children}</Providers>
      </body>
    </html>
  );
}
