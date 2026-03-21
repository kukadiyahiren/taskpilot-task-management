import { cn } from "../../lib/utils.js";

export function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        variant === "default" && "bg-slate-100 text-slate-700",
        variant === "brand" && "bg-violet-100 text-[#7C3AED]",
        variant === "new" && "bg-violet-600 text-white",
        variant === "live" && "bg-emerald-100 text-emerald-800",
        className
      )}
      {...props}
    />
  );
}
