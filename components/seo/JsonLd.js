import { jsonLdText } from "@/lib/seo";

/**
 * Structured data for search engines: one <script type="application/ld+json">
 * per object. It is data, not code, so the page's script policy does not apply.
 */
export default function JsonLd({ data }) {
  const items = (Array.isArray(data) ? data : [data]).filter(Boolean);
  return items.map((item, i) => (
    <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(item) }} />
  ));
}
