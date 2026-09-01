"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Check } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import {
  AuthHeading, Field, PasswordField, GoogleButton, Divider, SubmitButton, AuthFootLink,
} from "@/components/auth/fields";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const verified = searchParams.get("verified");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        toast.error("That email and password do not match");
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
      {verified && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3.5 mb-7">
          <span className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
            <Check size={13} strokeWidth={3} className="text-white" />
          </span>
          <p className="text-[14px] text-emerald-800">Email verified. You can sign in now.</p>
        </div>
      )}

      <AuthHeading title="Sign in to Orvo">
        Good to see you again.
      </AuthHeading>

      <GoogleButton loading={googleLoading} onClick={handleGoogle} />

      <Divider>or with email</Divider>

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
        New to Orvo?{" "}
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
