import { cn } from "../../lib/utils.js";

const variants = {
  default: "bg-primary text-primary-foreground shadow-md hover:opacity-90",
  outline: "border border-border bg-card text-foreground hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  gradient:
    "bg-gradient-to-r from-[#7C3AED] to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:from-[#6d28d9] hover:to-indigo-700 dark:shadow-violet-900/40",
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
        "inline-flex items-center justify-center font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
