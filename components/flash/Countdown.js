"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const pad = (n) => String(n).padStart(2, "0");

// Live countdown to `target`. Returns null until mounted (avoids an SSR/client
// hydration mismatch) and when there is no target. `onDone` fires once, when
// the countdown reaches zero while the page is open.
export function useCountdown(target, onDone) {
  const t = target ? new Date(target).getTime() : null;
  const [now, setNow] = useState(null);
  const done = useRef(onDone);
  done.current = onDone;
  const fired = useRef(false);

  useEffect(() => {
    if (!t) return;
    fired.current = false;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [t]);

  const diff = t && now != null ? Math.max(0, t - now) : null;
  useEffect(() => {
    if (diff === 0 && !fired.current) {
      fired.current = true;
      done.current?.();
    }
  }, [diff]);

  if (diff == null) return null;
  const s = Math.floor(diff / 1000);
  return {
    done: diff <= 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

// Each figure sits in its own small rounded cell, the way Orvo's flash band
// draws its clock.
const TONES = {
  // On the paper ground.
  dark: { cell: "bg-paper-pure shadow-soft", digit: "text-ink", label: "text-smoke" },
  // On the ink band and on photos.
  light: { cell: "bg-white/10 ring-1 ring-white/10 backdrop-blur-sm", digit: "text-paper-pure", label: "text-white/45" },
  // The yellow beam, for a clock that has to be seen first.
  accent: { cell: "bg-beam", digit: "text-ink", label: "text-ink/60" },
};

const SIZES = {
  sm: { cell: "w-[46px] rounded-xl py-1.5", digit: "text-[16px]", label: "mt-0.5 text-[10px]", gap: "gap-1.5" },
  md: { cell: "w-[54px] rounded-xl py-2 sm:w-[62px] sm:rounded-2xl sm:py-2.5", digit: "text-[19px] sm:text-[22px]", label: "mt-1 text-[10.5px] sm:mt-1.5 sm:text-[11px]", gap: "gap-1.5 sm:gap-2" },
  lg: { cell: "w-[60px] rounded-2xl py-2.5 sm:w-[76px] sm:py-3", digit: "text-[22px] sm:text-[30px]", label: "mt-1 text-[11px] sm:mt-1.5 sm:text-[12px]", gap: "gap-2 sm:gap-2.5" },
};

/**
 * Days, hours, minutes and seconds, each in a rounded cell with a small unit
 * under it. Renders nothing until mounted or once done.
 */
export function CountdownBoxes({ target, tone = "dark", size = "md", onDone, className }) {
  const cd = useCountdown(target, onDone);
  if (!cd || cd.done) return null;
  const t = TONES[tone] || TONES.dark;
  const z = SIZES[size] || SIZES.md;
  const parts = [
    ...(cd.days > 0 ? [[cd.days, "Days"]] : []),
    [cd.hours, "Hrs"],
    [cd.minutes, "Min"],
    [cd.seconds, "Sec"],
  ];

  return (
    <div className={cn("flex min-w-0 max-w-full", z.gap, className)} role="timer" aria-live="off">
      {parts.map(([value, label]) => (
        <div key={label} className={cn("text-center", z.cell, t.cell)}>
          <p className={cn("font-bold leading-none tracking-[-0.03em] tabular-nums", z.digit, t.digit)}>{pad(value)}</p>
          <p className={cn(z.label, t.label)}>{label}</p>
        </div>
      ))}
    </div>
  );
}

/** "2d 04:12:09" / "04:12:09" — for chips and tight spots. */
export function CountdownText({ target, onDone, className }) {
  const cd = useCountdown(target, onDone);
  if (!cd || cd.done) return null;
  return (
    <span className={cn("tabular-nums", className)} suppressHydrationWarning>
      {cd.days > 0 ? `${cd.days}d ` : ""}
      {pad(cd.hours)}:{pad(cd.minutes)}:{pad(cd.seconds)}
    </span>
  );
}
