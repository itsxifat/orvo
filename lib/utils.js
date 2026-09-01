export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Escape regex metacharacters and cap length before building a MongoDB $regex
// from user input — prevents ReDoS (catastrophic backtracking) and stray
// pattern injection. Returns "" for non-strings so callers can skip the filter.
export function escapeRegExp(input, maxLength = 50) {
  if (typeof input !== "string") return "";
  return input.slice(0, maxLength).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Convert non-ASCII numerals to ASCII 0–9. Bengali customers routinely write
// phone numbers in Bangla digits, and a phone keyboard set to another locale
// can produce the Arabic-Indic, Persian or full-width forms; couriers
// (Steadfast) and every bit of numeric parsing here only accept ASCII, so
// normalise before use.
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
// when they don't form a valid number, and the caller decides what to do.
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

export function formatPrice(amount) {
  const n = Number(amount);
  return `Tk ${(Number.isFinite(n) ? n : 0).toLocaleString("en-BD")}`;
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

export function serializeDoc(doc) {
  return JSON.parse(JSON.stringify(doc));
}

export function generateOrderNumber(count) {
  const year = new Date().getFullYear();
  return `ORV-${year}-${String(count + 1).padStart(5, "0")}`;
}

export function getImageUrl(url) {
  if (!url) return "/placeholder.jpg";
  return url;
}

export function shouldUnoptimizeImage(src) {
  if (typeof src !== "string") return false;

  try {
    return new URL(src, "http://localhost").pathname.startsWith("/uploads/");
  } catch {
    return false;
  }
}
