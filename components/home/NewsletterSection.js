"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import toast from "react-hot-toast";

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
    <section className="container-custom py-14 md:py-20">
      <div className="rounded-4xl md:rounded-5xl bg-beam text-ink overflow-hidden relative">
        <div aria-hidden className="absolute -bottom-28 -left-20 w-[360px] h-[360px] rounded-full bg-white/25 blur-3xl" />
        <div aria-hidden className="absolute -top-24 right-10 w-[280px] h-[280px] rounded-full bg-ink/5 blur-2xl" />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 p-8 sm:p-12 lg:p-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-ink/10 px-3 py-1.5 text-[12px] font-semibold">
              The list
            </span>
            <h2 className="text-[clamp(2rem,4.8vw,3.4rem)] font-bold leading-[1.02] tracking-[-0.04em] mt-5 max-w-[15ch]">
              Know before everyone else
            </h2>

            <ul className="mt-8 space-y-3">
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
              <form onSubmit={handleSubmit} className="rounded-3xl bg-paper-pure p-7 md:p-8 shadow-soft">
                <label htmlFor="newsletter-email" className="block text-[14px] font-semibold text-ink mb-3">
                  Your email address
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="newsletter-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="input-base flex-1"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    aria-label="Subscribe"
                    className="w-14 h-[54px] shrink-0 rounded-2xl bg-ink text-paper-pure flex items-center justify-center hover:bg-ink-soft transition-colors disabled:opacity-50"
                  >
                    <ArrowRight size={19} strokeWidth={2.2} />
                  </button>
                </div>
                <p className="text-[13px] text-smoke mt-4 leading-relaxed">
                  One email a week at most. Unsubscribe from any of them in a click.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
