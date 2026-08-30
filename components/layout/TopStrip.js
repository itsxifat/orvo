"use client";

import Link from "next/link";
import { Truck, RefreshCw, Sparkles, ArrowUpRight } from "lucide-react";

// The strip above the navbar.
//
// Not a marquee and not a sentence on a coloured band — nothing moves, and
// there is nothing to wait for. Three standing promises sit as pills, each one
// a link to the page that actually answers it, so the strip earns its space
// instead of decorating it. The navbar slides it out of view as soon as you
// scroll, so it is only ever present at the top of the page.
//
// When the admin sets an announcement it takes over the whole strip as a single
// yellow pill — a real message reads differently from the standing promises.

const PROMISES = [
  { Icon: Truck, label: "Free delivery over Tk 1500", href: "/shipping" },
  { Icon: RefreshCw, label: "7-day easy exchange", href: "/returns" },
  { Icon: Sparkles, label: "New drops every Thursday", href: "/shop?newArrival=true" },
];

function Pill({ Icon, label, href, className = "" }) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 rounded-full border border-haze-dark bg-paper-pure/70 pl-1.5 pr-4 py-1.5 text-[13px] font-medium text-ink/75 hover:text-ink hover:border-ink/25 hover:bg-paper-pure transition-all duration-200 ${className}`}
    >
      <span className="w-6 h-6 rounded-full bg-beam flex items-center justify-center shrink-0">
        <Icon size={13} strokeWidth={2.2} className="text-ink" />
      </span>
      {label}
    </Link>
  );
}

export default function TopStrip({ text, link }) {
  // A merchant announcement replaces the promises entirely.
  if (text) {
    const body = (
      <>
        <span className="w-2 h-2 rounded-full bg-ink/70 shrink-0" />
        <span className="truncate">{text}</span>
        {link && (
          <ArrowUpRight
            size={15}
            strokeWidth={2.4}
            className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        )}
      </>
    );

    const cls =
      "group inline-flex items-center gap-2.5 rounded-full bg-beam text-ink px-5 py-1.5 text-[13.5px] font-semibold max-w-full";

    return (
      <div className="h-12 bg-paper flex items-center justify-center px-5">
        {link ? (
          <Link href={link} className={`${cls} hover:bg-beam-dark transition-colors`}>
            {body}
          </Link>
        ) : (
          <span className={cls}>{body}</span>
        )}
      </div>
    );
  }

  return (
    <div className="h-12 bg-paper flex items-center justify-center px-5">
      <div className="flex items-center gap-2">
        {PROMISES.map(({ Icon, label, href }, i) => (
          <Pill
            key={label}
            Icon={Icon}
            label={label}
            href={href}
            // Only the first promise survives on a phone — three pills will not
            // fit, and the delivery threshold is the one worth the space.
            className={i === 0 ? "" : "hidden md:inline-flex"}
          />
        ))}
      </div>
    </div>
  );
}
