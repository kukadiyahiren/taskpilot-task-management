import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "../../lib/utils.js";

const icons = {
  team: BarChart3,
  overdue: AlertTriangle,
  completion: CheckCircle2,
  my: Briefcase,
  meetings: CalendarDays,
  ai: Sparkles,
};

export function StatsCard({
  title,
  value,
  iconKey = "team",
  trend,
  trendInverted,
  border,
  className,
}) {
  const Icon = icons[iconKey] ?? BarChart3;
  const up = trend != null && trend >= 0;
  const showTrend = trend != null && !Number.isNaN(trend);
  const TrendIcon = trendInverted ? (up ? TrendingDown : TrendingUp) : up ? TrendingUp : TrendingDown;
  const trendColor =
    trendInverted != null
      ? up
        ? "text-red-600"
        : "text-emerald-600"
      : up
        ? "text-emerald-600"
        : "text-red-600";

  return (
    <div
      className={cn(
        "group rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md",
        border === "red" && "border-red-200 ring-1 ring-red-100",
        border === "green" && "border-emerald-200 ring-1 ring-emerald-100",
        (border == null || border === "default") && "border-slate-200/90",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[#7C3AED] transition group-hover:bg-violet-100">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
      {showTrend && (
        <p className={cn("mt-3 flex items-center gap-1 text-xs font-semibold", trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          {trend > 0 ? "↗" : "↘"} {Math.abs(trend).toFixed(1)}%
        </p>
      )}
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-9 w-16 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}
