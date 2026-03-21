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
      className="relative flex min-h-[420px] flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-700 to-blue-700 px-8 py-10 text-white lg:min-h-screen lg:w-1/2 lg:px-12 lg:py-14"
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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-white/30">
              <LayoutGrid className="h-6 w-6 text-indigo-600" strokeWidth={1.75} aria-hidden />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">TaskFlow</span>
          </div>
        </header>

        <div className="mt-8 max-w-lg space-y-5 lg:mt-10">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-200" aria-hidden />
            AI-Powered Task Management
          </div>

          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.35rem]">
            Ship faster with your whole team
          </h1>

          <p className="text-base font-medium leading-relaxed text-white/90 sm:text-lg">
            Kanban boards, meeting-to-task AI, and role-based dashboards — all in one workspace your team
            will actually use.
          </p>
        </div>

        {/* Feature grid — static; light hover only */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:mt-10">
          {FEATURES.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-white/25 bg-white/10 p-4 shadow-lg backdrop-blur-md transition-colors duration-150 hover:border-white/40 hover:bg-white/15"
            >
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  <card.icon className="h-5 w-5 text-white" strokeWidth={1.75} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white">{card.title}</p>
                  <p className="mt-0.5 text-sm leading-snug text-white/80">{card.subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div className="mt-auto flex flex-col gap-4 pt-10 sm:flex-row sm:items-center sm:gap-8 lg:pt-12">
          <div className="flex -space-x-2">
            {AVATARS.map((a) => (
              <div
                key={a.initial}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-indigo-800/90 text-xs font-semibold text-white shadow-md ring-2 ring-white/15 ${a.className}`}
              >
                {a.initial}
              </div>
            ))}
          </div>
          <div className="text-sm text-white/90">
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
          className="pointer-events-none absolute bottom-6 left-6 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg lg:bottom-8 lg:left-8"
          aria-hidden
        >
          <Zap className="h-5 w-5 text-blue-600" strokeWidth={2.25} />
        </div>
      </div>
    </section>
  );
}
