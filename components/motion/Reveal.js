"use client";

import { useEffect, useRef, useState } from "react";

/* Scroll reveal.

   Every section fades up once, as it comes into view, and then stops caring —
   the observer disconnects on the first intersection, so nothing re-animates
   when you scroll back up. Re-animating on the way back is the tell of a
   template; content you have already read should stay put.

   Anything already on screen at first paint is shown immediately rather than
   animated, so the page never opens on a wave of movement.

   `delay` staggers siblings. Keep it small — 60ms between cards is enough to
   read as a sequence; 200ms reads as waiting. */
export default function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className = "",
  amount = 0.12,
  ...rest
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return undefined;
    }

    // Already in the first screenful: no entrance, just be there.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      setShown(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { threshold: amount, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [amount]);

  return (
    <Tag
      ref={ref}
      data-shown={shown ? "true" : "false"}
      className={`reveal ${className}`}
      style={delay ? { "--reveal-delay": `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
