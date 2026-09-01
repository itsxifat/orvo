import { cn } from "@/lib/utils";

// The ground both sign-in screens stand on.
//
// Orvo sells cloth, so the page is cloth. The old dot field was a tech pattern
// borrowed from somewhere else; this is the fabric itself — fine hairlines at
// 63°, the angle denim twill runs at, with a beam-yellow contrast thread every
// tenth line the way a selvedge roll carries one. Two things keep it premium
// rather than busy: the weave is masked out behind the form so type always sits
// on clean ground, and nothing loops. A single raking light crosses the cloth
// once on load — the way light catches fabric when you turn it — and then the
// page is still.
//
//   tone   "light" for the storefront sign-in, "dark" for the panel door

export default function AuthBackdrop({ tone = "light", className }) {
  const dark = tone === "dark";

  // The weave. Two passes at the same angle: the ground threads, then the
  // occasional gold one. Kept under 6% — at full strength a 9px pitch reads as
  // a screen-door, not a textile.
  const thread = dark ? "rgba(255,255,255,0.05)" : "rgba(15,15,17,0.055)";
  const gold = dark ? "rgba(255,201,60,0.13)" : "rgba(242,180,23,0.17)";
  const twill = [
    `repeating-linear-gradient(63deg, ${gold} 0 1px, transparent 1px 120px)`,
    `repeating-linear-gradient(63deg, ${thread} 0 1px, transparent 1px 9px)`,
  ].join(", ");

  // Clear the middle, where the form sits, and let the texture build toward the
  // edges of the viewport.
  const fade =
    "radial-gradient(ellipse 48% 42% at 50% 50%, transparent 26%, #000 82%)";

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {/* One light source, bleeding in off-canvas so only its soft shoulder
          lands. A second wash in the opposite corner reads as a gradient
          backdrop; one reads as a room the cloth is lying in. */}
      <div
        className={cn(
          "absolute -top-52 -left-44 w-[660px] h-[660px] rounded-full blur-[140px]",
          dark ? "bg-beam/[0.09]" : "bg-beam/[0.22]"
        )}
      />

      {/* The cloth */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: twill,
          WebkitMaskImage: fade,
          maskImage: fade,
        }}
      />

      {/* One pass of raking light, then done */}
      <div
        className="absolute inset-y-[-25%] left-0 w-[34%] animate-rake motion-reduce:hidden"
        style={{
          background: `linear-gradient(90deg, transparent, ${
            dark ? "rgba(255,201,60,0.07)" : "rgba(255,255,255,0.6)"
          }, transparent)`,
        }}
      />
    </div>
  );
}
