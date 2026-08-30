import { cn } from "@/lib/utils";

const variants = {
  sale: "bg-signal text-white",
  new: "bg-beam text-ink",
  out: "bg-ink/85 text-paper-pure backdrop-blur-sm",
  featured: "bg-ink text-paper-pure",
  pending: "bg-beam-soft text-amber-800",
  processing: "bg-blue-50 text-blue-700",
  shipped: "bg-indigo-50 text-indigo-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-signal-soft text-signal-dark",
  paid: "bg-emerald-50 text-emerald-700",
  failed: "bg-signal-soft text-signal-dark",
};

export default function Badge({ children, variant = "sale", className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11.5px] font-semibold tracking-[-0.005em]",
        variants[variant] || variants.sale,
        className
      )}
    >
      {children}
    </span>
  );
}
