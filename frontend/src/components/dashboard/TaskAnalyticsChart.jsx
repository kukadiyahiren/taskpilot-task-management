import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.jsx";
import { Skeleton } from "../ui/skeleton.jsx";
import { Button } from "../ui/button.jsx";
import { cn } from "../../lib/utils.js";

function priorityCounts(board) {
  const counts = { urgent: 0, high: 0, medium: 0, low: 0 };
  if (!board?.lists) return counts;
  for (const col of board.lists) {
    for (const t of col.tasks) {
      const p = t.priority;
      if (counts[p] != null) counts[p] += 1;
    }
  }
  return counts;
}

export function TaskAnalyticsChart({ analytics, board, isLoading, isError, onRetry }) {
  const [tab, setTab] = useState("trend");
  const chartData = useMemo(() => {
    if (!analytics?.length) return [];
    return analytics.map((p) => ({
      ...p,
      label: formatDayLabel(p.day),
    }));
  }, [analytics]);

  const pri = priorityCounts(board);
  const priTotal = Object.values(pri).reduce((a, b) => a + b, 0);

  if (isLoading) {
    return (
      <Card className="min-h-[360px]">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="flex min-h-[360px] flex-col items-center justify-center p-8">
        <p className="text-sm text-red-600">Could not load analytics.</p>
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      </Card>
    );
  }

  const rangeLabel =
    chartData.length > 1
      ? `${chartData[0].label} to ${chartData[chartData.length - 1].label}`
      : "Last 21 days";

  return (
    <Card className="min-h-0">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Task Analytics</CardTitle>
            <p className="text-sm text-slate-500">Last 21 days — {rangeLabel}</p>
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setTab("trend")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                tab === "trend" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Completion Trend
            </button>
            <button
              type="button"
              onClick={() => setTab("priority")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                tab === "priority" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Priority Breakdown
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {tab === "trend" && (
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={32} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Area type="monotone" dataKey="created" stroke="none" fill="url(#fillCreated)" />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#7C3AED"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="created"
                  name="Created"
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="overdue"
                  name="Overdue"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        {tab === "priority" && (
          <div className="space-y-4 py-2">
            {priTotal === 0 ? (
              <p className="text-center text-sm text-slate-400">No tasks on this board.</p>
            ) : (
              ["urgent", "high", "medium", "low"].map((k) => (
                <div key={k} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium capitalize text-slate-600">
                    <span>{k}</span>
                    <span className="tabular-nums text-slate-900">
                      {pri[k]} ({Math.round((pri[k] / priTotal) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        k === "urgent" && "bg-red-500",
                        k === "high" && "bg-orange-500",
                        k === "medium" && "bg-amber-400",
                        k === "low" && "bg-sky-500"
                      )}
                      style={{ width: `${(pri[k] / priTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
            <p className="text-xs text-slate-400">Derived from live board data (GET /boards/{board?.id}).</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDayLabel(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
