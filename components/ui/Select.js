"use client";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

const Select = forwardRef(function Select(
  { label, error, className, children, ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[14px] font-medium text-ink mb-2">{label}</label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "w-full rounded-2xl border bg-paper-pure pl-5 pr-11 py-3.5 text-[15px] text-ink transition-all duration-200 appearance-none cursor-pointer focus:outline-none focus:ring-2",
            error
              ? "border-signal focus:border-signal focus:ring-signal/15"
              : "border-haze-dark focus:border-ink focus:ring-ink/10",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="none"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke"
        >
          <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {error && <p className="mt-1.5 text-[13px] text-signal">{error}</p>}
    </div>
  );
});

export default Select;
