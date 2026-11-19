import { SITE_URL } from "@/lib/seo";

// robots.txt: everything a shopper can browse is open to search engines; the
// site's API, the bag, the checkout, accounts and order pages are not.
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/cart", "/checkout", "/account", "/auth/", "/order-confirmation/", "/admin"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
