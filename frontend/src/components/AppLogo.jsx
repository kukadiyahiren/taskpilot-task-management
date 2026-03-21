import logoUrl from "../assets/logo.jpeg";
import { cn } from "../lib/utils.js";

const variants = {
  /** Login marketing panel — light tile on gradient */
  hero: "h-10 w-10 rounded-2xl bg-white shadow-md ring-1 ring-white/30 sm:h-11 sm:w-11",
  /** Sidebar / app chrome */
  shell: "h-9 w-9 rounded-xl bg-card ring-1 ring-border shadow-sm",
  /** Top bar (e.g. mobile header) */
  nav: "h-8 w-8 rounded-lg bg-card ring-1 ring-border shadow-sm",
};

/**
 * Product mark — same asset as favicon source; use beside {APP_NAME} in shell and login.
 */
export function AppLogo({ variant = "shell", className }) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center overflow-hidden", variants[variant], className)}
    >
      <img
        src={logoUrl}
        alt=""
        className="h-full w-full object-contain p-px"
        width={44}
        height={44}
        decoding="async"
      />
    </div>
  );
}
