import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils.js";

const sizes = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" };

/** Inline loading indicator for buttons and compact UI. */
export function Spinner({ className, size = "md" }) {
  return <Loader2 className={cn("animate-spin", sizes[size], className)} aria-hidden />;
}
