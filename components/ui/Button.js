import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-ink text-paper-pure hover:bg-ink-soft shadow-soft hover:shadow-lift",
  beam: "bg-beam text-ink hover:bg-beam-dark shadow-beam",
  outline: "border border-haze-dark text-ink hover:border-ink hover:bg-ink hover:text-paper-pure",
  ghost: "text-ink hover:bg-haze",
  danger: "bg-signal text-white hover:bg-signal-dark",
  light: "bg-paper-pure text-ink border border-haze-dark hover:border-ink",
};

const sizes = {
  sm: "px-4 py-2 text-[13px]",
  md: "px-7 py-3.5 text-[14px]",
  lg: "px-9 py-4 text-[15px]",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  disabled,
  loading,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-all duration-200 active:scale-[0.98] focus:outline-none disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}
