"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import AuthShell from "@/components/auth/AuthShell";
import {
  AuthHeading, Field, PasswordField, GoogleButton, Divider, SubmitButton, AuthFootLink,
} from "@/components/auth/fields";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Could not create your account");
        return;
      }

      if (result.requiresVerification) {
        toast.success("Account created. Check your email for the code.");
        router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
      } else {
        router.push("/auth/login");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <AuthShell aside={{ label: "Sign in", href: "/auth/login" }}>
      <AuthHeading eyebrow="Get started" title="Create your account">
        It takes about a minute.
      </AuthHeading>

      <GoogleButton loading={googleLoading} onClick={handleGoogle} label="Sign up with Google" />

      <Divider>or with email</Divider>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field
          label="Full name"
          placeholder="Your full name"
          autoComplete="name"
          error={errors.name?.message}
          {...register("name", { required: "Enter your name" })}
        />

        <Field
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email", { required: "Enter your email address" })}
        />

        {/* Optional, but it's how we find orders you already placed as a guest
            and attach them to this account. */}
        <Field
          label="Mobile number"
          type="tel"
          placeholder="01XXXXXXXXX"
          autoComplete="tel"
          error={errors.phone?.message}
          hint="Optional — ordered before without an account? Add it to find those orders."
          {...register("phone", {
            validate: (v) =>
              !v ||
              /^01\d{9}$/.test(v.replace(/\D/g, "").replace(/^88/, "")) ||
              "Enter a valid 11-digit number",
          })}
        />

        <PasswordField
          label="Password"
          placeholder="At least 6 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password", {
            required: "Choose a password",
            minLength: { value: 6, message: "Use at least 6 characters" },
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

        <p className="text-[13.5px] text-smoke leading-relaxed">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="text-ink font-medium hover:text-signal transition-colors">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-ink font-medium hover:text-signal transition-colors">
            Privacy Policy
          </Link>
          .
        </p>

        <SubmitButton loading={loading} loadingLabel="Creating your account…">
          Create account
        </SubmitButton>
      </form>

      <AuthFootLink>
        Already have an account?{" "}
        <Link href="/auth/login" className="font-semibold text-ink hover:text-signal transition-colors">
          Sign in
        </Link>
      </AuthFootLink>
    </AuthShell>
  );
}
