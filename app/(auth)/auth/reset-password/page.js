"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { ShieldAlert } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { AuthHeading, PasswordField, SubmitButton, AuthFootLink } from "@/components/auth/fields";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  // The ERP's links carry a 43-character token (app/api/auth/reset-password
  // refuses anything else), so a mangled link is told so before it is used.
  const tokenLooksRight = /^[A-Za-z0-9_-]{43}$/.test(token);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(result.error || "Could not reset your password");
        return;
      }
      toast.success("Password updated. Sign in with it now.");
      router.push("/auth/login");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!tokenLooksRight) {
    return (
      <AuthShell aside={{ label: "Sign in", href: "/auth/login" }}>
        <span className="w-14 h-14 rounded-full bg-signal-soft flex items-center justify-center">
          <ShieldAlert size={24} strokeWidth={2} className="text-signal" />
        </span>
        <h1 className="text-[clamp(1.9rem,3vw,2.4rem)] font-bold text-ink leading-[1.05] tracking-[-0.035em] mt-6">
          This reset link is not valid
        </h1>
        <p className="text-[15px] text-smoke leading-relaxed mt-3">
          Reset links work once and expire after an hour. Request a fresh one and we will email it
          straight away.
        </p>
        <Link href="/auth/forgot-password" className="btn-primary w-full mt-7">
          Request a new link
        </Link>
        <AuthFootLink>
          <Link href="/auth/login" className="font-semibold text-ink hover:text-signal transition-colors">
            Back to sign in
          </Link>
        </AuthFootLink>
      </AuthShell>
    );
  }

  return (
    <AuthShell aside={{ label: "Sign in", href: "/auth/login" }}>
      <AuthHeading title="Set a new password">
        Make it at least eight characters.
      </AuthHeading>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <PasswordField
          label="New password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password", {
            required: "Choose a password",
            minLength: { value: 8, message: "Use at least 8 characters" },
          })}
        />

        <PasswordField
          label="Confirm password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword", {
            required: "Repeat your password",
            validate: (v) => v === watch("password") || "Those passwords do not match",
          })}
        />

        <SubmitButton loading={loading} loadingLabel="Updating…">
          Set new password
        </SubmitButton>
      </form>

      <AuthFootLink>
        <Link href="/auth/login" className="font-semibold text-ink hover:text-signal transition-colors">
          Back to sign in
        </Link>
      </AuthFootLink>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
