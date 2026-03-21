import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { useTheme } from "../theme/ThemeContext.jsx";
import { cn } from "../lib/utils.js";

const modes = [
  { id: "light", label: "Light", description: "Always use light interface.", Icon: Sun },
  { id: "dark", label: "Dark", description: "Always use dark interface.", Icon: Moon },
  { id: "system", label: "System", description: "Match your device setting.", Icon: Monitor },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <Layout onNewTask={() => navigate("/board")}>
      <div className="min-h-full bg-background p-6 lg:p-8">
        <div className="mx-auto max-w-lg">
          <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Preferences for this browser. Theme is saved in local storage (same as the control in the top bar).
          </p>

          <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Appearance</h2>
            <ul className="mt-4 space-y-2">
              {modes.map(({ id, label, description, Icon }) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setTheme(id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                      theme === id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                    </div>
                    {theme === id && <Check className="h-5 w-5 shrink-0 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Notifications</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              View workspace activity and mark items as read on the notifications page.
            </p>
            <Link
              to="/notifications"
              className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              Open notifications →
            </Link>
          </section>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link to="/account" className="font-medium text-primary hover:underline">
              Account details
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
