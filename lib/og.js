/* eslint-disable @next/next/no-img-element -- these cards are drawn by next/og, which takes plain <img> with data URLs */
import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { clip, shortDate, takaText, SITE_URL } from "@/lib/seo";

// The pictures a shared link shows (Facebook, Messenger, WhatsApp, X, Google
// Discover): 1200 × 630 cards drawn from the ERP's own data — a product with its
// photo and price, a flash sale with its deals and end date, or the brand.
//
// Drawn with next/og, then sent as a JPEG (WhatsApp shows small JPEGs most
// reliably). Product photos are fetched from the ERP's media host only and
// turned into JPEG first: the ERP serves WebP, which the renderer cannot draw.
// Whatever goes wrong, a card still comes back — the brand card at worst.

export const OG_SIZE = { width: 1200, height: 630 };

// Orvo's palette (tailwind.config.js): the warm paper ground, ink type, the
// red `signal` for prices and savings, the yellow `beam` for the brand's dot.
const COLOURS = {
  paper: "#F8F7F4",
  haze: "#E6E3DC",
  ink: "#0F0F11",
  muted: "#6E6C68",
  signal: "#DC2626",
  beam: "#FFC93C",
  white: "#FFFFFF",
};

const HOST = SITE_URL.replace(/^https?:\/\//, "");

// The hosts product photos may be fetched from: the ERP's media origins.
const MEDIA_HOSTS = (process.env.ERP_MEDIA_ORIGINS || "")
  .split(",")
  .map((origin) => {
    try {
      return new URL(origin.trim()).host;
    } catch {
      return null;
    }
  })
  .filter(Boolean);

// sharp, loaded when first needed: if it cannot start, the cards are still
// drawn (as PNG, without product photos) rather than failing.
let sharpLoad;
function loadSharp() {
  sharpLoad ||= import("sharp").then((mod) => mod.default).catch((error) => {
    console.error("share pictures: sharp unavailable:", error?.message?.split("\n")[0]);
    return null;
  });
  return sharpLoad;
}

let logo;
function logoDataUrl() {
  logo ||= Promise.all([readFile(path.join(process.cwd(), "public", "orvo-logo.png")), loadSharp()])
    .then(async ([file, sharp]) => (sharp ? sharp(file).resize({ width: 300 }).png().toBuffer() : file))
    .then((png) => `data:image/png;base64,${png.toString("base64")}`)
    .catch(() => {
      logo = null;
      return null;
    });
  return logo;
}

/** A photo from the ERP as a JPEG data URL, cropped to `width` × `height`, or null. */
export async function photoDataUrl(url, width, height) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(parsed.protocol)) return null;
  if (MEDIA_HOSTS.length && !MEDIA_HOSTS.includes(parsed.host)) return null;
  const sharp = await loadSharp();
  if (!sharp) return null;
  try {
    const res = await fetch(parsed, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(width, height, { fit: "cover", position: "attention" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

async function jpegResponse(element) {
  const png = Buffer.from(await new ImageResponse(element, OG_SIZE).arrayBuffer());
  const sharp = await loadSharp();
  const jpeg = sharp ? await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toBuffer() : null;
  return new Response(jpeg || png, {
    headers: {
      "Content-Type": jpeg ? "image/jpeg" : "image/png",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

// public/orvo-logo.png is 453 × 160: the wordmark with its yellow dot.
function Logo({ src, width = 150 }) {
  if (!src) return <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: COLOURS.ink, letterSpacing: -2 }}>orvo</div>;
  return <img src={src} width={width} height={Math.round(width * 0.3532)} alt="" />;
}

function Footer({ text }) {
  return (
    <div style={{ display: "flex", fontSize: 22, color: COLOURS.muted, borderTop: `1px solid ${COLOURS.haze}`, paddingTop: 22 }}>
      {text}
    </div>
  );
}

/** The brand: the logo on the paper ground, with an optional title and line under it. */
export async function brandCard({ title = "", subtitle = "" } = {}) {
  const src = await logoDataUrl();
  return jpegResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: COLOURS.paper }}>
      <Logo src={src} width={title ? 300 : 420} />
      {title && <div style={{ display: "flex", marginTop: 40, fontSize: 56, color: COLOURS.ink, textAlign: "center", padding: "0 80px" }}>{clip(title, 60)}</div>}
      {subtitle && <div style={{ display: "flex", marginTop: 14, fontSize: 28, color: COLOURS.muted, textAlign: "center", padding: "0 80px" }}>{clip(subtitle, 90)}</div>}
      <div style={{ display: "flex", position: "absolute", bottom: 36, fontSize: 22, color: COLOURS.muted, letterSpacing: 2 }}>{HOST}</div>
    </div>
  );
}

/**
 * A product: its photo on the left; the name, the price now with the regular
 * price struck through and the saving, and how to pay on the right.
 */
export async function productCard(product, { cod = true } = {}) {
  const variants = product.variants || [];
  const inStock = variants.filter((v) => v.stock > 0);
  const pool = inStock.length ? inStock : variants;
  const prices = pool.map((v) => v.price).filter((n) => Number.isFinite(n));
  const min = prices.length ? Math.min(...prices) : null;
  const lowest = pool.find((v) => v.price === min);
  const was = lowest?.compareAt > min ? lowest.compareAt : null;
  const off = was ? Math.round(((was - min) / was) * 100) : 0;
  const flash = pool.some((v) => v.flash);

  const [src, photo] = await Promise.all([logoDataUrl(), product.images?.[0] ? photoDataUrl(product.images[0], 540, 630) : null]);
  const kicker = flash ? "Flash price" : product.isNewArrival ? "New arrival" : product.category?.name || "";
  const footer = [cod ? "Cash on delivery" : "", inStock.length ? "" : "Sold out", HOST].filter(Boolean).join("  ·  ");

  return jpegResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: COLOURS.paper }}>
      {photo ? (
        <img src={photo} width={540} height={630} alt="" style={{ objectFit: "cover" }} />
      ) : (
        <div style={{ width: 540, height: 630, display: "flex", background: COLOURS.haze }} />
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "52px 56px 44px" }}>
        <Logo src={src} width={130} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {kicker && (
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: COLOURS.signal }}>{kicker}</div>
          )}
          <div style={{ display: "flex", marginTop: 14, fontSize: 50, lineHeight: 1.12, color: COLOURS.ink }}>{clip(product.name, 64)}</div>
          {min !== null && (
            <div style={{ display: "flex", alignItems: "center", marginTop: 30 }}>
              <div style={{ display: "flex", fontSize: 46, color: was ? COLOURS.signal : COLOURS.ink }}>
                {`${prices.some((p) => p !== min) ? "From " : ""}${takaText(min)}`}
              </div>
              {was && <div style={{ display: "flex", marginLeft: 18, fontSize: 28, color: COLOURS.muted, textDecoration: "line-through" }}>{takaText(was)}</div>}
              {off > 0 && (
                <div style={{ display: "flex", marginLeft: 18, padding: "6px 16px", borderRadius: 999, fontSize: 24, color: COLOURS.white, background: COLOURS.signal }}>{`-${off}%`}</div>
              )}
            </div>
          )}
        </div>
        <Footer text={footer} />
      </div>
    </div>
  );
}

/**
 * A flash sale: its title, the best saving and when it ends (or starts) on the
 * left; its banner, or up to three of its products' photos, on the right.
 */
export async function saleCard(sale, { kicker = "Flash sale" } = {}) {
  const photos = sale.bannerImage
    ? [sale.bannerImage]
    : sale.items.map((i) => i.product.images?.[0]).filter(Boolean).slice(0, 3);
  const width = photos.length ? Math.floor(560 / photos.length) : 0;
  const [src, ...pictures] = await Promise.all([
    logoDataUrl(),
    ...photos.map((url) => photoDataUrl(url, width, 630)),
  ]);
  const shown = pictures.filter(Boolean);
  const when = sale.status === "scheduled"
    ? sale.startsAt ? `Starts ${shortDate(sale.startsAt)}` : "Coming soon"
    : sale.endsAt ? `Ends ${shortDate(sale.endsAt)}` : "While stocks last";
  const deals = `${sale.stats.count} deal${sale.stats.count === 1 ? "" : "s"}`;

  return jpegResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: COLOURS.paper }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "52px 56px 44px" }}>
        <Logo src={src} width={130} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: COLOURS.signal }}>{kicker}</div>
          <div style={{ display: "flex", marginTop: 14, fontSize: 58, lineHeight: 1.08, color: COLOURS.ink }}>{clip(sale.title, 48)}</div>
          {sale.stats.maxDiscount > 0 && (
            <div style={{ display: "flex", marginTop: 22, fontSize: 44, color: COLOURS.signal }}>{`Up to ${sale.stats.maxDiscount}% off`}</div>
          )}
          {sale.subtitle && <div style={{ display: "flex", marginTop: 14, fontSize: 26, color: COLOURS.muted }}>{clip(sale.subtitle, 70)}</div>}
        </div>
        <Footer text={[when, deals, HOST].join("  ·  ")} />
      </div>
      {shown.length > 0 && (
        <div style={{ width: 560, height: 630, display: "flex" }}>
          {shown.map((photo, i) => (
            <img key={i} src={photo} width={Math.floor(560 / shown.length)} height={630} alt="" style={{ objectFit: "cover" }} />
          ))}
        </div>
      )}
    </div>
  );
}
