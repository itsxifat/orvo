"use client";

import { useSettings } from "@/context/SettingsContext";

// A round black pill that widens into a label on hover.
export default function WhatsAppButton() {
  const { settings } = useSettings();
  // The number staff set on the ERP's Website → Settings (digits only), else
  // the build's fallback; no number, no button.
  const number = settings?.siteInfo?.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
  if (!number) return null;

  // On a phone the product page's buy bar (data-buybar on <body>, set by
  // components/product/MobileBuyBar.js while it shows) sits at the bottom; the
  // button moves up above it.

  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="group fixed bottom-6 right-6 z-40 flex items-center h-14 rounded-full bg-ink text-paper-pure shadow-pop hover:bg-ink-soft transition-[background-color,bottom] duration-200 max-lg:[body[data-buybar]_&]:bottom-[96px]"
    >
      <span className="w-14 h-14 flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.374 0 0 5.373 0 12c0 2.126.553 4.121 1.522 5.854L.057 23.882a.5.5 0 00.61.61l6.083-1.468A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.027-1.381l-.361-.214-3.717.974.993-3.628-.234-.373A9.778 9.778 0 012.182 12C2.182 6.57 6.571 2.182 12 2.182c5.43 0 9.818 4.389 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z" />
        </svg>
      </span>
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-[14.5px] font-semibold transition-all duration-300 group-hover:max-w-[180px] group-hover:pr-6">
        Message us
      </span>
    </a>
  );
}
