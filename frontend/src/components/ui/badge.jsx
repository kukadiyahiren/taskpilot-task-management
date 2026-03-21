import { cn } from "../../lib/utils.js";

export function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums transition-colors",
        variant === "default" && "bg-muted text-muted-foreground",
        variant === "brand" && "bg-primary/15 text-primary",
        variant === "new" && "bg-primary text-primary-foreground",
        variant === "live" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        className
      )}
      {...props}
    />
  );
}
