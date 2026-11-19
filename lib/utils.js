export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Convert non-ASCII numerals to ASCII 0–9. Bengali customers routinely write
// phone numbers in Bangla digits, and a phone keyboard set to another locale
// can produce the Arabic-Indic, Persian or full-width forms; the ERP accepts
// only ASCII digits, so normalise before sending.
//
// Each block below is contiguous and ordered 0–9, so the digit is simply its
// distance from the block's zero.
const DIGIT_BLOCKS = [
  0x09e6, // Bengali            ০–৯
  0x0660, // Arabic-Indic       ٠–٩
  0x06f0, // Extended Arabic-Indic (Persian/Urdu) ۰–۹
  0x0966, // Devanagari         ०–९
  0xff10, // Fullwidth          ０–９
];

export function toEnglishDigits(input) {
  if (input == null) return "";
  return String(input).replace(/[০-৯٠-٩۰-۹०-९０-９]/g, (d) => {
    const code = d.codePointAt(0);
    const base = DIGIT_BLOCKS.find((b) => code >= b && code <= b + 9);
    return base === undefined ? d : String(code - base);
  });
}

// Normalise a Bangladeshi phone number to the local 11-digit 01XXXXXXXXX form.
//
// People write their own number every way there is: in Bangla digits, with the
// country code, with spaces or dashes or brackets, with a leading 0 that a
// "+880" makes redundant, or missing the leading 0 entirely. All of it means
// the same number, so all of it is accepted and tidied here rather than being
// bounced back at the customer. Best-effort — returns the cleaned digits even
// when they don't form a valid number; the ERP has the final word.
export function normalizeBdPhone(raw) {
  let s = toEnglishDigits(raw).replace(/[^\d+]/g, "");  // keep only digits and +
  s = s.replace(/^\+/, "").replace(/^00/, "");          // + / 00 international prefix
  if (s.startsWith("880")) s = s.slice(3);              // country code off
  // "+880 01712-345678" carries the country code AND the local zero. Drop the
  // zero only when what remains is exactly a local number, so a typo or a
  // landline is handed back as it was typed rather than mangled.
  s = s.replace(/^0+(?=1\d{9}$)/, "");
  if (/^1\d{9}$/.test(s)) s = "0" + s;                  // the local form always starts 01
  return s;
}

// Is this a real Bangladeshi mobile number? Every operator sits in 013–019, so
// anything else is a typo or a landline the rider cannot call.
export function isValidBdMobile(raw) {
  return /^01[3-9]\d{8}$/.test(normalizeBdPhone(raw));
}

export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A display price in taka (the ERP's `taka` figure as a number). */
export function formatPrice(amount) {
  const n = Number(amount);
  return `Tk ${(Number.isFinite(n) ? n : 0).toLocaleString("en-BD")}`;
}

/** An ERP money object (`{ poisha, taka }`) as a display price. */
export function formatMoney(money) {
  return formatPrice(money?.taka ?? 0);
}

export function truncate(str, maxLength = 100) {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trim() + "...";
}

export function calculateDiscount(price, salePrice) {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}

export const PLACEHOLDER_IMAGE = "/placeholder.svg";

export function getImageUrl(url) {
  return url || PLACEHOLDER_IMAGE;
}

// Local SVGs (the placeholder) are not run through the image optimiser.
export function shouldUnoptimizeImage(src) {
  if (typeof src !== "string") return false;
  try {
    return new URL(src, "http://localhost").pathname.endsWith(".svg");
  } catch {
    return false;
  }
}
