import { BarChart3, LayoutGrid, Sparkles, Users, Zap } from "lucide-react";

/** Static marketing panel — no React state, no entrance animations (reliable visibility + fast paint). */
const FEATURES = [
  {
    icon: Zap,
    title: "AI-Powered",
    subtitle: "Convert meeting notes to tasks automatically",
  },
  {
    icon: Users,
    title: "Team Boards",
    subtitle: "Trello-style Kanban with real-time sync",
  },
  {
    icon: BarChart3,
    title: "Role Dashboards",
    subtitle: "Insights tailored to your responsibility level",
  },
  {
    icon: Sparkles,
    title: "Smart Suggestions",
    subtitle: "Auto-detect priority and assign tasks",
  },
];

const AVATARS = [
  { initial: "J", className: "bg-violet-600" },
  { initial: "S", className: "bg-blue-600" },
  { initial: "M", className: "bg-teal-500" },
  { initial: "A", className: "bg-orange-500" },
  { initial: "R", className: "bg-red-500" },
];

export default function LoginHero() {
  return (
    <section
      className="relative flex min-h-0 flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-700 to-blue-700 px-6 py-6 text-white sm:px-8 sm:py-8 lg:h-full lg:w-1/2 lg:px-10 lg:py-8"
      aria-label="Product overview"
    >
      {/* Static depth blobs — no animation for faster paint */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-indigo-400/35 blur-3xl" />
        <div className="absolute -right-16 bottom-32 h-80 w-80 rounded-full bg-blue-400/30 blur-3xl" />
        <div className="absolute left-1/3 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-violet-300/25 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* Logo */}
        <header className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-white/30 sm:h-11 sm:w-11">
              <LayoutGrid className="h-5 w-5 text-indigo-600 sm:h-6 sm:w-6" strokeWidth={1.75} aria-hidden />
            </div>
            <span className="text-lg font-bold tracking-tight text-white sm:text-xl">TaskFlow</span>
          </div>
        </header>

        <div className="mt-4 max-w-lg space-y-3 sm:mt-6 sm:space-y-4 lg:mt-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-200" aria-hidden />
            AI-Powered Task Management
          </div>

          <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-[1.85rem]">
            Ship faster with your whole team
          </h1>

          <p className="text-sm font-medium leading-relaxed text-white/90 sm:text-base">
            Kanban boards, meeting-to-task AI, and role-based dashboards — all in one workspace your team will
            actually use.
          </p>
        </div>

        {/* Feature grid — hidden on very small stacked layout to avoid overflow; visible from md+ */}
        <div className="mt-4 hidden min-h-0 grid-cols-2 gap-2 sm:grid md:mt-5 md:gap-3 lg:mt-6">
          {FEATURES.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-white/25 bg-white/10 p-3 shadow-lg backdrop-blur-md transition-colors duration-150 hover:border-white/40 hover:bg-white/15 sm:rounded-2xl sm:p-4"
            >
              <div className="flex gap-2 sm:gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25 sm:h-10 sm:w-10 sm:rounded-xl">
                  <card.icon className="h-4 w-4 text-white sm:h-5 sm:w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white sm:text-base">{card.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-white/80 sm:text-sm">{card.subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:gap-6 sm:pt-8 lg:pt-6">
          <div className="flex -space-x-2">
            {AVATARS.map((a) => (
              <div
                key={a.initial}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-indigo-800/90 text-xs font-semibold text-white shadow-md ring-2 ring-white/15 sm:h-10 sm:w-10 ${a.className}`}
              >
                {a.initial}
              </div>
            ))}
          </div>
          <div className="text-xs text-white/90 sm:text-sm">
            <p>
              Trusted by <span className="font-semibold text-white">2,400+ teams</span>
            </p>
            <p className="text-white/75">
              Across <span className="font-medium text-white/90">180 companies</span> worldwide
            </p>
          </div>
        </div>

        {/* Decorative corner icon — reference layout */}
        <div
          className="pointer-events-none absolute bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg sm:bottom-6 sm:left-6 sm:h-11 sm:w-11 lg:bottom-6 lg:left-8"
          aria-hidden
        >
          <Zap className="h-4 w-4 text-blue-600 sm:h-5 sm:w-5" strokeWidth={2.25} />
        </div>
      </div>
    </section>
  );
}
