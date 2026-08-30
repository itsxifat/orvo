import { cn } from "@/lib/utils";

// A soft ring with a yellow head.
export default function Spinner({ size = "md", className }) {
  const sizes = { sm: "w-4 h-4 border-2", md: "w-7 h-7 border-[3px]", lg: "w-11 h-11 border-4" };
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block rounded-full border-haze-dark border-t-beam animate-spin",
        sizes[size] || sizes.md,
        className
      )}
    />
  );
}
