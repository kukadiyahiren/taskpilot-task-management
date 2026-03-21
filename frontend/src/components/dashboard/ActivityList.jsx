import { Activity, ExternalLink } from "lucide-react";
import { formatRelativeTime } from "../../lib/time.js";
import { Button } from "../ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.jsx";
import { Skeleton } from "../ui/skeleton.jsx";

function initials(name) {
  return name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const colors = ["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];

export function ActivityList({ items, isLoading, isError, onRetry }) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-16" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="flex h-full min-h-[280px] flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-red-600">Could not load activity.</p>
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-0 overflow-y-auto pt-2">
        <ul className="space-y-4">
          {(items ?? []).map((row, i) => (
            <li key={row.id} className="flex gap-3 text-sm">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${colors[i % colors.length]}`}
              >
                {initials(row.user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-slate-800">
                  <span className="font-semibold">{row.user.name}</span>
                  <span className="text-slate-600"> {row.detail}</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{formatRelativeTime(row.created_at)}</p>
              </div>
              <Activity className="mt-1 h-4 w-4 shrink-0 text-slate-300" aria-hidden />
            </li>
          ))}
        </ul>
        {!items?.length && (
          <p className="py-8 text-center text-sm text-slate-400">No recent activity on this board.</p>
        )}
        <div className="pt-4">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#7C3AED] hover:underline"
          >
            View full activity log
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
