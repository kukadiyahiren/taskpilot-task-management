import { cn } from "../../lib/utils.js";

const variants = {
  default: "bg-[#7C3AED] text-white shadow-md hover:bg-[#6d28d9]",
  outline: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100",
  gradient:
    "bg-gradient-to-r from-[#7C3AED] to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:from-[#6d28d9] hover:to-indigo-700",
};

export function Button({ className, variant = "default", size = "md", ...props }) {
  const sizes = {
    sm: "h-9 px-3 text-xs rounded-lg",
    md: "h-10 px-4 text-sm rounded-xl",
    lg: "h-11 px-5 text-sm rounded-xl",
    icon: "h-10 w-10 rounded-xl p-0",
  };
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/40 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
