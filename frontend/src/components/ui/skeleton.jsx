import { cn } from "../../lib/utils.js";

export function Skeleton({ className, ...props }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-200/80", className)} {...props} />;
}
