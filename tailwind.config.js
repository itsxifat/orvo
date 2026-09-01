const plugin = require("tailwindcss/plugin");

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Every `hover:` utility compiles behind `@media (hover: hover)`. Without it
  // a tap on a phone leaves the hover styling painted on the element until you
  // tap somewhere else — the single biggest reason the site felt "desktop
  // first" on a touch screen.
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Orvo palette — yellow, red, black ──────────────────────────────
        // `beam` (yellow) is the signature and always carries BLACK text.
        // `signal` (red) is the energy accent and is safe with WHITE text, so
        // every existing `bg-signal text-white` in the panel stays readable.
        ink: {
          DEFAULT: "#0F0F11", // primary text + dark surfaces
          deep: "#08080A",    // deepest black
          soft: "#18181C",    // raised surface on dark
          line: "#26262C",    // hairline on dark
        },
        smoke: {
          DEFAULT: "#6E6C68", // muted text (warm grey)
          light: "#9E9C97",
          dark: "#454340",
        },
        paper: {
          DEFAULT: "#F8F7F4", // warm page ground / light text on dark
          pure: "#FFFFFF",    // cards and sheets float on the ground
        },
        haze: {
          DEFAULT: "#F1EFEA", // tinted surface
          dark: "#E6E3DC",    // hairline on light
        },
        beam: {
          DEFAULT: "#FFC93C", // the yellow — pair with ink, never white
          dark: "#F2B417",
          light: "#FFDD7E",
          soft: "#FFF6E0",
        },
        signal: {
          DEFAULT: "#DC2626", // the red — safe with white text
          dark: "#B41D1D",
          light: "#F87171",
          soft: "#FDECEC",
        },
      },
      fontFamily: {
        // One family, used across the whole site. Weight and tracking carry the
        // hierarchy instead of a second condensed face.
        sans: ["var(--font-saira)", "system-ui", "Segoe UI", "Arial", "sans-serif"],
        display: ["var(--font-saira)", "system-ui", "Segoe UI", "Arial", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.75rem",
      },
      // The four curves from globals.css, reachable as `ease-swift`,
      // `ease-soft`, `ease-spring`, `ease-settle`.
      transitionTimingFunction: {
        swift: "var(--ease-out)",
        soft: "var(--ease-soft)",
        spring: "var(--ease-spring)",
        settle: "var(--ease-inout)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "260ms",
        slow: "420ms",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,15,17,0.04), 0 10px 28px -14px rgba(15,15,17,0.14)",
        lift: "0 2px 6px rgba(15,15,17,0.05), 0 22px 48px -20px rgba(15,15,17,0.22)",
        pop: "0 24px 60px -24px rgba(15,15,17,0.35)",
        beam: "0 14px 34px -14px rgba(255,201,60,0.7)",
        inset: "inset 0 0 0 1px rgba(15,15,17,0.06)",
      },
      maxWidth: {
        frame: "1680px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "slide-up": "slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        rise: "rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-dot": "pulseDot 1.8s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
        // One pass, never loops — see components/auth/AuthBackdrop.js.
        rake: "rake 2.4s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both",
        // Enter animations. `reveal` is what <Reveal> plays on scroll; `pop`
        // is for something appearing under the pointer or finger.
        reveal: "reveal var(--dur-reveal) var(--ease-out) both",
        pop: "pop 320ms var(--ease-spring) both",
        "sheet-up": "sheetUp 420ms var(--ease-soft) both",
        // Checkout feedback. `shake` is the only "no" the site plays — a
        // rejected coupon, where a red border alone is easy to miss on a phone.
        shake: "shake 440ms var(--ease-out) both",
        // The tick on the order-placed overlay: ring first, then the mark.
        "check-in": "checkIn 520ms var(--ease-spring) both",
        halo: "halo 1.6s var(--ease-soft) infinite",
        // A light travelling under a button that is busy doing something.
        sweep: "sweep 1.15s linear infinite",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "18%": { transform: "translateX(-6px)" },
          "38%": { transform: "translateX(5px)" },
          "58%": { transform: "translateX(-3px)" },
          "78%": { transform: "translateX(2px)" },
        },
        checkIn: {
          "0%": { transform: "scale(0.4)", opacity: "0" },
          "60%": { transform: "scale(1.06)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        halo: {
          "0%": { transform: "scale(1)", opacity: "0.45" },
          "70%, 100%": { transform: "scale(1.55)", opacity: "0" },
        },
        sweep: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideUp: {
          "0%": { transform: "translateY(24px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        rise: {
          "0%": { transform: "translateY(18px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.35", transform: "scale(0.75)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        // The skew is carried in the keyframes, not on the element: a transform
        // set in CSS would be overwritten by the one being animated here.
        rake: {
          "0%": { transform: "translate3d(-140%, 0, 0) skewX(-27deg)", opacity: "0" },
          "18%": { opacity: "1" },
          "100%": { transform: "translate3d(330%, 0, 0) skewX(-27deg)", opacity: "0" },
        },
        // Small travel, long curve. The distance is deliberately short: a
        // heading sliding 40px reads as a slideshow, 14px reads as focus.
        reveal: {
          "0%": { opacity: "0", transform: "translate3d(0, 14px, 0)" },
          "100%": { opacity: "1", transform: "none" },
        },
        pop: {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "none" },
        },
        sheetUp: {
          "0%": { transform: "translate3d(0, 100%, 0)" },
          "100%": { transform: "none" },
        },
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      // `hover:` alone is not enough for reveal-on-hover affordances: a tablet
      // is wide enough for the `md:` styles but can never fire a hover, so a
      // control hidden at `md:` and shown at `md:group-hover:` would be
      // unreachable. Anything that HIDES something until hover uses this.
      addVariant("can-hover", "@media (hover: hover) and (pointer: fine)");
      addVariant("touch", "@media (hover: none)");
    }),
  ],
};
