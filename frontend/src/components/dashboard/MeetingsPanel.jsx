import { Calendar, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.jsx";
import { Button } from "../ui/button.jsx";
import { Badge } from "../ui/badge.jsx";
import { Skeleton } from "../ui/skeleton.jsx";

const statusMap = {
  scheduled: { label: "Upcoming", className: "bg-blue-100 text-blue-800" },
  live: { label: "Live", className: "bg-red-100 text-red-700" },
  ended: { label: "Ended", className: "bg-slate-200 text-slate-600" },
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
        <p className="text-sm text-red-600">Could not load meetings.</p>
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
          <Calendar className="h-5 w-5 text-[#7C3AED]" />
          Meetings
        </CardTitle>
        <Button variant="gradient" size="sm" className="font-semibold">
          + Schedule
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">This week</p>
        <ul className="space-y-2">
          {(meetings ?? []).map((m) => {
            const st = statusMap[m.status] ?? statusMap.scheduled;
            const start = new Date(m.start_time);
            return (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 transition hover:border-slate-200 hover:bg-white"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={st.className}>{st.label}</Badge>
                    {m.status === "live" && (
                      <Button size="sm" className="h-7 bg-red-600 text-xs hover:bg-red-700">
                        Join Now
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 font-medium text-slate-900">{m.title}</p>
                  <p className="text-xs text-slate-500">
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
                  className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-[#7C3AED] hover:underline"
                >
                  Details
                  <ChevronRight className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
        {!meetings?.length && (
          <p className="py-6 text-center text-sm text-slate-400">No meetings scheduled.</p>
        )}
      </CardContent>
    </Card>
  );
}
