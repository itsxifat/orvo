# Search engines and link sharing

Every page describes itself to Google, Bing, Facebook, Messenger, WhatsApp and X from the
ERP's own data, as the page is served. Nothing has to be typed twice: a new product, a
price change, a new category or a flash sale is in the page's title, description,
structured data, share picture and the sitemap the moment the ERP has it.

## What every page says

| Page | Title and description | Share picture | Structured data (schema.org) |
| --- | --- | --- | --- |
| Home | The shop's name (Website → Settings) and tagline | The logo card (`app/opengraph-image.jpg`) | `OnlineStore` (name, logo, contact, social profiles), `WebSite` with the shop's search |
| Product `/shop/<slug>` | The product's **SEO title / SEO description** from the ERP; when empty, worked out: its opening line, the price now and before ("From Tk 670 (was Tk 1,190, 44% off)"), the sizes and colours in stock, cash on delivery | Drawn for the product: its photo, name, price, regular price struck through and the saving | `ProductGroup` with a `Product` per size and colour: SKU, price, `StrikethroughPrice` (the regular price), stock, `priceValidUntil` for a flash price; `BreadcrumbList` |
| Shop, a category, Offers (`?onSale=true`), New Arrivals, Featured | Per listing (the category's ERP description when it has one), with the page number | The logo card | `CollectionPage` with the products on the page, `BreadcrumbList` |
| Flash sale hub `/flash-sale` | What is on now and the best saving | Drawn: the live sale with the most deals | `CollectionPage` of the sales |
| A flash sale `/flash-sale/<slug>` | Its title, best saving, number of deals, when it ends or starts | Drawn: title, saving, end date, its banner or deals | `CollectionPage` of its products, `BreadcrumbList` |
| About, Returns, Privacy, Terms | Fixed | The logo card | — |

- **Sizes and colours.** Each one has its own address in the structured data
  (`/shop/<slug>?size=M&colour=White`), which opens the product with it chosen; the canonical
  address stays `/shop/<slug>`.
- **Return policy.** Every offer and the store carry the returns page's policy as
  `MerchantReturnPolicy`: an exchange (no cash refund) within 72 hours, free when the item is
  faulty or wrong, delivery paid by the customer otherwise. If the policy on `/returns` changes,
  change `returnPolicyJsonLd()` in `lib/seo.js` with it.
- **Every page of a listing is a link** (`?page=2`, …), so crawlers reach every product through
  the shop as well as the sitemap.
- **Reviews.** Search Console's "Missing field 'review'" and "'aggregateRating'" warnings stay
  until products have real customer reviews; the ERP has none yet. Never fill them with made-up
  or borrowed ratings (Google's policy; it can cost the whole site its rich results).
- **Canonical addresses.** Each page names itself; the shop's sort, size, price and tag
  filters and campaign codes (`?cu=`) point to the unfiltered listing.
- **Kept out of search results** (`noindex`): search results, the bag, the checkout,
  sign-in and sign-up, accounts and order pages. `robots.txt` also keeps crawlers off
  `/api/`, the bag, the checkout, accounts and orders.
- **`/sitemap.xml`** lists the home page, the shop, the offers, every category, every live
  and coming flash sale and every product on the website, with product photos at full size
  (Google's image extension; Google Images prefers large pictures). Product photos' alt text
  is the product's name and, on a coloured gallery, its colour. It is read from the ERP when asked for (cached 15 minutes); if the ERP
  cannot be read it answers `503` so search engines come back later rather than see a
  sitemap without products.
- **Share pictures** are 1200 × 630 JPEGs (small enough for WhatsApp previews). If a photo
  cannot be fetched, the card is drawn without it; if the product cannot be read, the logo
  card is served. A shared link never shows a broken picture.

## What staff control in the ERP

- **Website → Settings:** the shop's name (in every title), contact details and social links
  (in the store's structured data), cash on delivery (in the descriptions).
- **Products:** SEO title and SEO description (optional; otherwise worked out as above), photos
  (the first is the share picture), category.
- **Catalog setup:** a category's description becomes its listing's description.
- **Flash sales:** title, subtitle and banner appear in the sale's title, description and card.

## Connect Google Search Console (once)

1. In [Search Console](https://search.google.com/search-console), add a **Domain** property
   for `orvo.bd` and verify it with the **TXT record** it gives, added in Cloudflare's DNS.
   This covers `https://`, `http://` and every subdomain, and needs nothing on this server.
   (A **URL prefix** property works too: choose the *HTML tag* method and put the code from
   its `content="…"` in `GOOGLE_SITE_VERIFICATION` in the website's env file, then restart
   the container.)
2. **Sitemaps** → submit `https://orvo.bd/sitemap.xml`.
3. **URL Inspection** → a product's address → *Test live URL* → *View tested page*: the
   structured data appears under *Product snippets* and *Merchant listings*.
4. Optional: **Settings → Shipping and returns** in Search Console (or Merchant Center) for the
   delivery fees and the 72-hour exchange policy, which Google shows beside the prices.

Bing Webmaster Tools can import the site from Search Console, or verify with the
`msvalidate.01` code in `BING_SITE_VERIFICATION`. Meta's Business Manager domain verification
code goes in `FACEBOOK_DOMAIN_VERIFICATION`.

## Check a page

- Google's [Rich Results Test](https://search.google.com/test/rich-results) with a product's
  address: *Product snippets* and *Merchant listings*, no errors.
- Meta's [Sharing Debugger](https://developers.facebook.com/tools/debug/) with an address:
  the title, description and picture; **Scrape again** after changing a product, since
  Facebook and WhatsApp keep a shared link's preview for a while.
- `https://orvo.bd/robots.txt` and `https://orvo.bd/sitemap.xml` answer 200.
