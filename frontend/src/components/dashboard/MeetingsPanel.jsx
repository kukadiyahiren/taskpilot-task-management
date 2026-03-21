import { Calendar, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.jsx";
import { Button } from "../ui/button.jsx";
import { Skeleton } from "../ui/skeleton.jsx";

const statusMap = {
  scheduled: { label: "Upcoming", className: "bg-blue-500/15 text-blue-800 dark:text-blue-300" },
  live: { label: "Live", className: "bg-red-500/15 text-red-800 dark:text-red-300" },
  ended: { label: "Ended", className: "bg-muted text-muted-foreground" },
};

export function MeetingsPanel({ meetings, isLoading, isError, onRetry }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="flex min-h-[200px] flex-col items-center justify-center p-8">
        <p className="text-sm text-destructive">Could not load meetings.</p>
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-5 w-5 text-primary" />
          Meetings
        </CardTitle>
        <Button variant="gradient" size="sm" className="font-semibold">
          + Schedule
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This week</p>
        <ul className="space-y-2">
          {(meetings ?? []).map((m) => {
            const st = statusMap[m.status] ?? statusMap.scheduled;
            const start = new Date(m.start_time);
            return (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 transition hover:bg-muted/70"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                        st.className
                      )}
                    >
                      {st.label}
                    </span>
                    {m.status === "live" && (
                      <Button size="sm" className="h-7 bg-red-600 text-xs text-white hover:bg-red-700">
                        Join Now
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 font-medium text-foreground">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {start.toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    · {m.participant_count} participants
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
                >
                  Details
                  <ChevronRight className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
        {!meetings?.length && (
          <p className="py-6 text-center text-sm text-muted-foreground">No meetings scheduled.</p>
        )}
      </CardContent>
    </Card>
  );
}
