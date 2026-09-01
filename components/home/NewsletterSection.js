"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import toast from "react-hot-toast";
import Reveal from "@/components/motion/Reveal";

const BENEFITS = [
  "First look at every drop, before it goes public",
  "Member-only pricing a few times a year",
  "Restock alerts on the sizes you actually wear",
];

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setSubscribed(true);
      setEmail("");
      toast.success("You are on the list.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container-custom py-12 md:py-20">
      <Reveal className="relative overflow-hidden rounded-4xl bg-beam text-ink md:rounded-5xl">
        <div aria-hidden className="absolute -bottom-28 -left-20 h-[360px] w-[360px] rounded-full bg-white/25 blur-3xl" />
        <div aria-hidden className="absolute -top-24 right-10 h-[280px] w-[280px] rounded-full bg-ink/5 blur-2xl" />

        <div className="relative grid grid-cols-1 gap-8 p-7 sm:p-12 lg:grid-cols-2 lg:gap-16 lg:p-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-ink/10 px-3 py-1.5 text-[12px] font-semibold">
              The list
            </span>
            <h2 className="mt-4 max-w-[15ch] text-[clamp(2rem,7vw,3.4rem)] font-bold leading-[1.02] tracking-[-0.04em] sm:mt-5">
              Know before everyone else
            </h2>

            <ul className="mt-6 space-y-3 sm:mt-8">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-ink flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} strokeWidth={3} className="text-beam" />
                  </span>
                  <span className="text-[15px] text-ink/75 leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center">
            {subscribed ? (
              <div className="rounded-3xl bg-paper-pure p-8 text-center shadow-soft">
                <span className="w-14 h-14 rounded-full bg-beam flex items-center justify-center mx-auto">
                  <Check size={26} strokeWidth={2.5} className="text-ink" />
                </span>
                <p className="text-[22px] font-bold tracking-[-0.03em] mt-5">You are in</p>
                <p className="text-[15px] text-smoke mt-2 leading-relaxed">
                  Watch your inbox — the next drop lands Thursday.
                </p>
              </div>
            ) : (
              /* On a phone the address gets the full width and the action sits
                 under it as a proper labelled button. Squeezing a 56px square
                 icon button next to the field left about 200px for the email
                 itself — enough to type into, not enough to read back. */
              <form onSubmit={handleSubmit} className="rounded-3xl bg-paper-pure p-6 shadow-soft sm:p-7 md:p-8">
                <label htmlFor="newsletter-email" className="mb-3 block text-[14px] font-semibold text-ink">
                  Your email address
                </label>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-2">
                  <input
                    id="newsletter-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="input-base sm:flex-1"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full shrink-0 disabled:opacity-50 sm:h-[54px] sm:w-14 sm:px-0"
                  >
                    <span className="sm:hidden">{loading ? "Joining…" : "Join the list"}</span>
                    <ArrowRight size={19} strokeWidth={2.2} />
                  </button>
                </div>
                <p className="mt-4 text-[13px] leading-relaxed text-smoke">
                  One email a week at most. Unsubscribe from any of them in a click.
                </p>
              </form>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
