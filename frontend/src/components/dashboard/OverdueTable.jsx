import { AlertTriangle, ExternalLink } from "lucide-react";
import { priorityDot, priorityLabel } from "../../lib/priority.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.jsx";
import { Skeleton } from "../ui/skeleton.jsx";
import { Button } from "../ui/button.jsx";
import { cn } from "../../lib/utils.js";

function overdueDays(dueDate) {
  const due = new Date(dueDate + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - due) / (24 * 60 * 60 * 1000));
  return diff;
}

export function OverdueTable({ board, overdue, isLoading, isError, onViewBoard, onRetry }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="flex min-h-[200px] flex-col items-center justify-center p-8">
        <p className="text-sm text-red-600">Could not load board for overdue tasks.</p>
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
        <div className="flex items-start gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Overdue Tasks</CardTitle>
            <p className="text-sm text-slate-500">
              {overdue.length} task{overdue.length === 1 ? "" : "s"} need immediate attention
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-[#7C3AED]" onClick={onViewBoard}>
          View board
          <ExternalLink className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto pt-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="pb-3 pr-4">Task</th>
              <th className="pb-3 pr-4">Assignee</th>
              <th className="pb-3 pr-4">Board</th>
              <th className="pb-3 pr-4">Due</th>
              <th className="pb-3 pr-4">Priority</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {overdue.map((t) => {
              const days = overdueDays(t.due_date);
              return (
                <tr
                  key={t.id}
                  className="border-b border-red-50 bg-red-50/40 transition hover:bg-red-50/80"
                >
                  <td className="py-3 pr-4 font-medium text-slate-900">{t.title}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      {t.assignees?.[0] ? (
                        <>
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-800">
                            {t.assignees[0].name[0]}
                          </span>
                          <span className="text-slate-600">{t.assignees[0].name}</span>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{t.boardName ?? "—"}</td>
                  <td className="py-3 pr-4 font-medium text-red-600">{t.due_date}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                        t.priority === "urgent" && "bg-red-100 text-red-800",
                        t.priority === "high" && "bg-orange-100 text-orange-800",
                        t.priority === "medium" && "bg-amber-100 text-amber-900",
                        t.priority === "low" && "bg-sky-100 text-sky-800"
                      )}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[t.priority]}`} />
                      {priorityLabel[t.priority]}
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-red-600">{days}d overdue</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!overdue.length && (
          <p className="py-10 text-center text-sm text-slate-400">No overdue tasks on this board.</p>
        )}
      </CardContent>
    </Card>
  );
}
