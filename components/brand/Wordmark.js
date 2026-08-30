import { cn } from "@/lib/utils";

// The Orvo wordmark is type, not an image: heavy, tightly tracked, with a small
// yellow dot riding after it. Rendering it as text keeps it crisp at any size,
// recolours itself for dark and light shells, and costs no request.
//
//   tone      "ink" (default) | "paper" — the colour of the letters
//   accent    false → drop the dot (favicons, print, disabled states)
//   caption   optional small label set under the mark

const SIZES = {
  xs: "text-[17px]",
  sm: "text-[21px]",
  md: "text-[26px]",
  lg: "text-[38px]",
  xl: "text-[58px]",
  hero: "text-[clamp(4rem,15vw,13rem)]",
  fill: "",
};

const DOT = {
  xs: "w-[4px] h-[4px] ml-[3px] mb-[2px]",
  sm: "w-[5px] h-[5px] ml-[4px] mb-[3px]",
  md: "w-[6px] h-[6px] ml-[5px] mb-[3px]",
  lg: "w-[9px] h-[9px] ml-[7px] mb-[5px]",
  xl: "w-[13px] h-[13px] ml-[10px] mb-[7px]",
  hero: "w-[0.12em] h-[0.12em] ml-[0.06em] mb-[0.06em]",
  fill: "w-[0.12em] h-[0.12em] ml-[0.06em] mb-[0.06em]",
};

const CAPTION_SIZES = {
  xs: "text-[8px] tracking-[-0.005em]",
  sm: "text-[9px] tracking-[-0.005em]",
  md: "text-[10px] tracking-[-0.005em]",
  lg: "text-[11px] tracking-[-0.005em]",
  xl: "text-[13px] tracking-[-0.005em]",
  hero: "text-[15px] tracking-[-0.005em]",
  fill: "text-[15px] tracking-[-0.005em]",
};

export default function Wordmark({
  size = "md",
  tone = "ink",
  accent = true,
  caption,
  className,
}) {
  const base = tone === "paper" ? "text-paper-pure" : "text-ink";

  return (
    <span className={cn("inline-flex flex-col items-start leading-none select-none", className)}>
      <span
        className={cn(
          "mark-text inline-flex items-end font-bold lowercase leading-[0.85] tracking-[-0.055em]",
          SIZES[size] ?? SIZES.md,
          base
        )}
      >
        orvo
        {accent && (
          <span
            className={cn("rounded-full bg-beam shrink-0", DOT[size] ?? DOT.md)}
            aria-hidden
          />
        )}
      </span>
      {caption && (
        <span
          className={cn(
            "uppercase font-semibold mt-[0.5em] pl-[0.1em]",
            CAPTION_SIZES[size] ?? CAPTION_SIZES.md,
            tone === "paper" ? "text-white/45" : "text-smoke"
          )}
        >
          {caption}
        </span>
      )}
    </span>
  );
}
