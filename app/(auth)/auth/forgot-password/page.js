"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { MailCheck, ArrowLeft } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { AuthHeading, Field, SubmitButton, AuthFootLink } from "@/components/auth/fields";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      setSentTo(data.email);
      setSent(true);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell aside={{ label: "Sign in", href: "/auth/login" }}>
      {sent ? (
        <div>
          <span className="w-14 h-14 rounded-full bg-beam flex items-center justify-center">
            <MailCheck size={24} strokeWidth={2} className="text-ink" />
          </span>
          <h1 className="text-[clamp(1.9rem,3vw,2.4rem)] font-bold text-ink leading-[1.05] tracking-[-0.035em] mt-6">
            Check your email
          </h1>
          <p className="text-[15px] text-smoke leading-relaxed mt-3">
            If an account exists for{" "}
            <span className="font-medium text-ink">{sentTo}</span>, a reset link is on its way.
            It expires in an hour.
          </p>

          <div className="rounded-2xl bg-haze p-5 mt-7">
            <p className="text-[14px] text-smoke leading-relaxed">
              Nothing arrived? Check your spam folder, or{" "}
              <button
                onClick={() => setSent(false)}
                className="font-semibold text-ink hover:text-signal transition-colors"
              >
                try another address
              </button>
              .
            </p>
          </div>

          <Link href="/auth/login" className="btn-outline w-full mt-7">
            <ArrowLeft size={16} strokeWidth={2.2} />
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <AuthHeading eyebrow="Password reset" title="Forgot your password?">
            Enter the email you signed up with and we will send you a reset link.
          </AuthHeading>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Field
              label="Email address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email", { required: "Enter your email address" })}
            />

            <SubmitButton loading={loading} loadingLabel="Sending the link…">
              Send reset link
            </SubmitButton>
          </form>

          <AuthFootLink>
            Remembered it?{" "}
            <Link href="/auth/login" className="font-semibold text-ink hover:text-signal transition-colors">
              Sign in
            </Link>
          </AuthFootLink>
        </>
      )}
    </AuthShell>
  );
}
