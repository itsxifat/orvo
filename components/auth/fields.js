"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared form furniture for the auth screens, so the five pages stay identical
// in feel and only differ in what they ask for.

export const GoogleIcon = () => (
  <svg width="19" height="19" viewBox="0 0 18 18" fill="none" aria-hidden>
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.039l3.007-2.332z" />
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
  </svg>
);

export function AuthHeading({ eyebrow, title, children }) {
  return (
    <div className="mb-8">
      {eyebrow && <span className="eyebrow-beam">{eyebrow}</span>}
      <h1 className="text-[clamp(1.9rem,3vw,2.4rem)] font-bold text-ink leading-[1.05] tracking-[-0.035em] mt-4">
        {title}
      </h1>
      {children && (
        <p className="text-[15px] text-smoke leading-relaxed mt-3">{children}</p>
      )}
    </div>
  );
}

const fieldBase =
  "w-full rounded-2xl border bg-paper-pure px-5 py-3.5 text-[15px] text-ink placeholder-smoke-light transition-all duration-200 focus:outline-none focus:ring-2";

export const Field = forwardRef(function Field(
  { label, hint, error, action, className, ...props },
  ref
) {
  return (
    <div>
      {(label || action) && (
        <div className="flex items-baseline justify-between mb-2">
          {label && <label className="text-[14px] font-medium text-ink">{label}</label>}
          {action}
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          fieldBase,
          error
            ? "border-signal focus:border-signal focus:ring-signal/15"
            : "border-haze-dark focus:border-ink focus:ring-ink/10",
          className
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-[13px] text-signal">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-smoke">{hint}</p>
      ) : null}
    </div>
  );
});

export const PasswordField = forwardRef(function PasswordField(
  { label, hint, error, action, ...props },
  ref
) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        {label && <label className="text-[14px] font-medium text-ink">{label}</label>}
        {action}
      </div>
      <div className="relative">
        <input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn(
            fieldBase,
            "pr-14",
            error
              ? "border-signal focus:border-signal focus:ring-signal/15"
              : "border-haze-dark focus:border-ink focus:ring-ink/10"
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-smoke hover:bg-haze hover:text-ink transition-colors"
        >
          {show ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
        </button>
      </div>
      {error ? (
        <p className="mt-1.5 text-[13px] text-signal">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-smoke">{hint}</p>
      ) : null}
    </div>
  );
});

export function GoogleButton({ loading, onClick, label = "Continue with Google" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full rounded-full border border-haze-dark bg-paper-pure py-3.5 px-6 flex items-center justify-center gap-3 text-[15px] font-semibold text-ink hover:border-ink hover:shadow-soft active:scale-[0.99] transition-all duration-200 disabled:opacity-60"
    >
      <GoogleIcon />
      {loading ? "Redirecting…" : label}
    </button>
  );
}

export function Divider({ children = "or" }) {
  return (
    <div className="flex items-center gap-4 my-6">
      <span className="flex-1 h-px bg-haze-dark" />
      <span className="text-[13px] text-smoke">{children}</span>
      <span className="flex-1 h-px bg-haze-dark" />
    </div>
  );
}

export function SubmitButton({ loading, children, loadingLabel = "Just a moment…" }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-full bg-ink text-paper-pure py-4 text-[15px] font-semibold tracking-[-0.01em] shadow-soft hover:bg-ink-soft hover:shadow-lift active:scale-[0.99] disabled:bg-haze disabled:text-smoke disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2.5"
    >
      {loading && (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {loading ? loadingLabel : children}
    </button>
  );
}

export function AuthFootLink({ children }) {
  return <p className="text-center text-[14.5px] text-smoke mt-8">{children}</p>;
}
