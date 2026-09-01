"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Eye, EyeOff, Lock, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { isStaff } from "@/lib/permissions";
import Wordmark from "@/components/brand/Wordmark";
import { GoogleIcon } from "@/components/auth/fields";
import AuthBackdrop from "@/components/auth/AuthBackdrop";

// The panel door. Deliberately unlike the storefront sign-in: one dark card,
// no marketing, nothing to browse — just the lock and the form.

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(
    searchParams.get("error") === "access_denied" ? "Access denied — admin accounts only." : ""
  );

  // If already signed in as admin, go straight to dashboard
  useEffect(() => {
    if (status === "authenticated") {
      if (isStaff(session.user.role)) {
        router.replace("/admin");
      } else {
        setError("This account does not have admin access.");
      }
    }
  }, [session, status, router]);

  const handleCredentials = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) setError("Invalid email or password.");
      // role check handled by the useEffect above
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setError("");
    setGoogleLoading(true);
    signIn("google", { callbackUrl: "/admin/login" });
  };

  const handleSignOutAndRetry = async () => {
    await signOut({ redirect: false });
    setError("");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-ink-deep flex items-center justify-center">
        <span className="w-7 h-7 rounded-full border-[3px] border-white/15 border-t-beam animate-spin" />
      </div>
    );
  }

  const field =
    "w-full rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-3.5 text-[15px] text-paper-pure placeholder-white/25 transition-all duration-200 focus:outline-none focus:border-beam focus:ring-2 focus:ring-beam/15";

  return (
    <div className="min-h-screen bg-ink-deep flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Same woven ground as the storefront sign-in, in the dark register */}
      <AuthBackdrop tone="dark" />

      <div className="relative w-full max-w-[440px]">
        <div className="flex items-center justify-between mb-7">
          <Wordmark size="md" tone="paper" caption="Admin" />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13.5px] text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft size={15} strokeWidth={2.2} />
            Storefront
          </Link>
        </div>

        <div className="rounded-4xl bg-ink ring-1 ring-white/10 shadow-pop p-7 sm:p-9">
          <div className="flex items-center gap-3.5">
            <span className="w-11 h-11 rounded-full bg-beam flex items-center justify-center shrink-0">
              <Lock size={18} strokeWidth={2.2} className="text-ink" />
            </span>
            <div>
              <p className="text-[19px] font-bold text-paper-pure tracking-[-0.03em] leading-tight">
                Staff sign in
              </p>
              <p className="text-[13.5px] text-white/40">Restricted to panel accounts</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl bg-signal/10 ring-1 ring-signal/25 px-4 py-3.5 mt-6">
              <AlertTriangle size={16} className="text-signal-light shrink-0 mt-0.5" strokeWidth={2} />
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] text-signal-light leading-relaxed">{error}</p>
                {status === "authenticated" && !isStaff(session?.user?.role) && (
                  <button
                    onClick={handleSignOutAndRetry}
                    className="text-[13px] text-white/50 hover:text-white mt-1.5 underline underline-offset-2 transition-colors"
                  >
                    Sign out and use a different account
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleGoogle}
            disabled={googleLoading || status === "authenticated"}
            className="w-full rounded-full bg-white/[0.06] ring-1 ring-white/12 hover:bg-white/[0.12] py-3.5 px-6 mt-6 flex items-center justify-center gap-3 text-[15px] font-semibold text-paper-pure transition-all duration-200 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>

          <div className="flex items-center gap-4 my-6">
            <span className="flex-1 h-px bg-white/10" />
            <span className="text-[13px] text-white/30">or with email</span>
            <span className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleCredentials} className="space-y-5">
            <div>
              <label htmlFor="admin-email" className="block text-[14px] font-medium text-white/70 mb-2">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="you@orvo.com"
                className={field}
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-[14px] font-medium text-white/70 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Your password"
                  className={`${field} pr-14`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || status === "authenticated"}
              className="w-full rounded-full bg-beam text-ink py-4 text-[15px] font-semibold tracking-[-0.01em] shadow-beam hover:bg-beam-dark active:scale-[0.99] disabled:bg-white/10 disabled:text-white/30 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2.5"
            >
              {loading && (
                <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              )}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-white/25 mt-6">
          © {new Date().getFullYear()} Orvo · Authorised staff only
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-deep" />}>
      <AdminLoginForm />
    </Suspense>
  );
}
