import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../theme/ThemeContext.jsx";
import { cn } from "../lib/utils.js";

const modes = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
];

export default function ThemeToggle({ className }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = modes.find((m) => m.id === theme) ?? modes[2];
  const CurrentIcon = current.Icon;

  return (
    <div className={cn("relative", className)} ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Theme: select light, dark, or system"
      >
        <CurrentIcon className="h-5 w-5" />
        <ChevronDown className={cn("h-3.5 w-3.5 opacity-60 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul
          className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-lg"
          role="listbox"
        >
          {modes.map(({ id, label, Icon }) => (
            <li key={id}>
              <button
                type="button"
                role="option"
                aria-selected={theme === id}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted"
                onClick={() => {
                  setTheme(id);
                  setOpen(false);
                }}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-70" />
                <span className="flex-1">{label}</span>
                {theme === id && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
