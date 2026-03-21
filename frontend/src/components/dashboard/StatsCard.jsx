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
        ? "text-red-600 dark:text-red-400"
        : "text-emerald-600 dark:text-emerald-400"
      : up
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div
      className={cn(
        "group rounded-2xl border bg-card p-5 text-card-foreground shadow-sm transition-colors duration-200 hover:shadow-md",
        border === "red" && "border-red-300/60 ring-1 ring-red-500/10 dark:border-red-800 dark:ring-red-900/30",
        border === "green" && "border-emerald-300/60 ring-1 ring-emerald-500/10 dark:border-emerald-800 dark:ring-emerald-900/30",
        (border == null || border === "default") && "border-border",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums tracking-tight">{value}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/15">
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
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex justify-between">
        <div className="space-y-2">
          <SkeletonBar className="h-4 w-24" />
          <SkeletonBar className="h-9 w-16" />
        </div>
        <SkeletonBar className="h-11 w-11 rounded-xl" />
      </div>
    </div>
  );
}

function SkeletonBar({ className }) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} />;
}
