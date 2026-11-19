"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getProviders } from "next-auth/react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Check, CircleAlert } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import {
  AuthHeading, Field, PasswordField, GoogleButton, Divider, SubmitButton, AuthFootLink,
} from "@/components/auth/fields";
import { useSettings } from "@/context/SettingsContext";

// What a failed sign-in says. The provider throws the ERP's refusal as a code
// (lib/auth.js); Google's refusals come back as `?error=` on this page.
const SIGN_IN_ERRORS = {
  INVALID_CREDENTIALS: "That email and password do not match",
  RATE_LIMITED: "Too many sign-in attempts. Please wait a few minutes and try again.",
  UNAVAILABLE: "We couldn't reach the shop. Please try again.",
  GOOGLE_EMAIL_UNVERIFIED: "This email has an account that was never verified. Verify it with the code we email, or reset your password, then use Google.",
  GOOGLE_CONFLICT: "This account is linked to a different Google login.",
  GOOGLE_NOT_VERIFIED: "Google hasn't verified this email address.",
  AccessDenied: "We couldn't sign you in with Google. Please try again.",
};

// Resolve the asked-for address the way the browser will, and keep it only if
// it stays on this origin (`/\t/evil.example`, `//evil`, `/\evil` all leave it).
function sameSitePath(asked) {
  if (!asked || typeof window === "undefined") return "/";
  try {
    const url = new URL(asked, window.location.origin);
    if (url.origin !== window.location.origin) return "/";
    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return "/";
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only a path on this site: a sign-in link must not send a shopper elsewhere.
  const callbackUrl = sameSitePath(searchParams.get("callbackUrl"));
  const verified = searchParams.get("verified");
  const failed = searchParams.get("error");
  const { settings } = useSettings();
  const siteName = settings?.siteInfo?.siteName || "Orvo";

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Google is offered only when this deploy has a Google OAuth client.
  const [google, setGoogle] = useState(false);
  useEffect(() => {
    getProviders().then((p) => setGoogle(!!p?.google)).catch(() => {});
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error === "EMAIL_UNVERIFIED") {
        // The right password, but the email code was never entered: finish that first.
        toast.error("Verify your email first. We have sent you a new code.");
        await fetch("/api/auth/resend-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email }),
        }).catch(() => {});
        router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
      } else if (result?.error) {
        toast.error(SIGN_IN_ERRORS[result.error] || SIGN_IN_ERRORS.INVALID_CREDENTIALS);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    signIn("google", { callbackUrl });
  };

  return (
    <AuthShell aside={{ label: "Create account", href: "/auth/register" }}>
      {failed && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-signal-soft px-4 py-3.5 mb-7">
          <span className="w-6 h-6 rounded-full bg-signal flex items-center justify-center shrink-0">
            <CircleAlert size={14} strokeWidth={2.4} className="text-white" />
          </span>
          <p className="text-[14px] text-signal-dark leading-relaxed">
            {SIGN_IN_ERRORS[failed] || "We couldn't sign you in. Please try again."}
          </p>
        </div>
      )}

      {verified && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3.5 mb-7">
          <span className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
            <Check size={13} strokeWidth={3} className="text-white" />
          </span>
          <p className="text-[14px] text-emerald-800">Email verified. You can sign in now.</p>
        </div>
      )}

      <AuthHeading title={`Sign in to ${siteName}`}>
        Good to see you again.
      </AuthHeading>

      {google && (
        <>
          <GoogleButton loading={googleLoading} onClick={handleGoogle} />
          <Divider>or with email</Divider>
        </>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email", { required: "Enter your email address" })}
        />

        <PasswordField
          label="Password"
          placeholder="Your password"
          autoComplete="current-password"
          error={errors.password?.message}
          action={
            <Link
              href="/auth/forgot-password"
              className="text-[13.5px] font-medium text-smoke hover:text-ink transition-colors"
            >
              Forgot?
            </Link>
          }
          {...register("password", { required: "Enter your password" })}
        />

        <div className="pt-1">
          <SubmitButton loading={loading} loadingLabel="Signing you in…">
            Sign in
          </SubmitButton>
        </div>
      </form>

      <AuthFootLink>
        New to {siteName}?{" "}
        <Link href="/auth/register" className="font-semibold text-ink hover:text-signal transition-colors">
          Create an account
        </Link>
      </AuthFootLink>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <LoginForm />
    </Suspense>
  );
}
