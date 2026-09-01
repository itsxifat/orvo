"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Wordmark from "@/components/brand/Wordmark";
import AuthBackdrop from "@/components/auth/AuthBackdrop";

// The frame every auth screen sits in.
//
// Deliberately not a card on a backdrop: the page itself is the composition.
// The form sits straight on the ground with no container of its own, the woven
// ground in AuthBackdrop does the design work around it, and the mark and legal
// type are pinned to the top and bottom edges of the viewport.
//
//   aside     top-right link, e.g. { label: "Create account", href: "/auth/register" }
//   wide      widen the content column for longer forms

export default function AuthShell({ aside, children, wide = false }) {
  return (
    <div className="relative min-h-screen flex flex-col bg-paper overflow-hidden">

      <AuthBackdrop tone="light" />

      {/* ── Top edge ────────────────────────────────────────────────────────*/}
      <header className="relative z-10 container-custom py-6 sm:py-7 flex items-center justify-between gap-4">
        <Link href="/" aria-label="Orvo home">
          <Wordmark size="md" />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium text-smoke hover:text-ink hover:bg-haze transition-colors"
          >
            <ArrowLeft size={15} strokeWidth={2.2} />
            Back to shop
          </Link>
          {aside && (
            <Link
              href={aside.href}
              className="rounded-full bg-ink text-paper-pure px-5 py-2.5 text-[14px] font-semibold hover:bg-ink-soft active:scale-[0.98] transition-all duration-200"
            >
              {aside.label}
            </Link>
          )}
        </div>
      </header>

      {/* ── The form, straight on the page ─────────────────────────────────*/}
      <main className="relative z-10 flex-1 flex items-center justify-center px-5 sm:px-8 py-10">
        <div className={`w-full ${wide ? "max-w-[480px]" : "max-w-[400px]"}`}>{children}</div>
      </main>

      {/* ── Bottom edge ─────────────────────────────────────────────────────*/}
      <footer className="relative z-10 container-custom py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[13px] text-smoke">© {new Date().getFullYear()} Orvo</p>
        <nav className="flex items-center gap-5 text-[13px] text-smoke">
          <Link href="/privacy" className="hover:text-ink transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-ink transition-colors">Terms</Link>
          <Link href="/about" className="hover:text-ink transition-colors">About</Link>
        </nav>
      </footer>
    </div>
  );
}
