"use client";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

const Input = forwardRef(function Input(
  { label, error, className, type = "text", ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[14px] font-medium text-ink mb-2">{label}</label>
      )}
      <input
        ref={ref}
        type={type}
        className={cn(
          "w-full rounded-2xl border bg-paper-pure px-5 py-3.5 text-[15px] text-ink placeholder-smoke-light transition-all duration-200 focus:outline-none focus:ring-2",
          error
            ? "border-signal focus:border-signal focus:ring-signal/15"
            : "border-haze-dark focus:border-ink focus:ring-ink/10",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-[13px] text-signal">{error}</p>}
    </div>
  );
});

export default Input;
