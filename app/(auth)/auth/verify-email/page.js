"use client";

import { useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { MailOpen } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { SubmitButton, AuthFootLink } from "@/components/auth/fields";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef([]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(""));
      inputs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      toast.error("Enter all six digits");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "That code is not right");
        return;
      }
      toast.success("Email verified.");
      router.push("/auth/login?verified=1");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Could not resend the code");
        return;
      }
      toast.success("A new code is on its way.");
    } catch {
      toast.error("Could not resend the code");
    } finally {
      setResending(false);
    }
  };

  const filled = otp.filter(Boolean).length;

  return (
    <AuthShell aside={{ label: "Sign in", href: "/auth/login" }}>
      <span className="w-14 h-14 rounded-full bg-beam flex items-center justify-center">
        <MailOpen size={24} strokeWidth={2} className="text-ink" />
      </span>

      <h1 className="text-[clamp(1.9rem,3vw,2.4rem)] font-bold text-ink leading-[1.05] tracking-[-0.035em] mt-6">
        Verify your email
      </h1>
      <p className="text-[15px] text-smoke leading-relaxed mt-3">
        We sent a six-digit code to{" "}
        <span className="font-medium text-ink">{email || "your inbox"}</span>.
      </p>

      <form onSubmit={handleSubmit} className="mt-8">
        <div className="flex justify-between gap-2 sm:gap-2.5" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              aria-label={`Digit ${i + 1}`}
              className={`w-full aspect-square max-w-[62px] rounded-2xl border-2 bg-paper-pure text-center text-[22px] font-semibold text-ink tabular-nums transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ink/10 ${
                digit ? "border-ink" : "border-haze-dark focus:border-ink"
              }`}
            />
          ))}
        </div>

        {/* Progress through the code */}
        <div className="flex gap-1.5 mt-5">
          {otp.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i < filled ? "bg-beam" : "bg-haze-dark"
              }`}
            />
          ))}
        </div>

        <div className="mt-7">
          <SubmitButton loading={loading} loadingLabel="Verifying…">
            Verify email
          </SubmitButton>
        </div>
      </form>

      <div className="rounded-2xl bg-haze p-5 mt-7">
        <p className="text-[14px] text-smoke leading-relaxed">
          No code yet? It can take a minute — check your spam folder, or{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || !email}
            className="font-semibold text-ink hover:text-signal transition-colors disabled:opacity-50"
          >
            {resending ? "sending…" : "send a new one"}
          </button>
          .
        </p>
      </div>

      <AuthFootLink>
        <Link href="/auth/login" className="font-semibold text-ink hover:text-signal transition-colors">
          Back to sign in
        </Link>
      </AuthFootLink>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
