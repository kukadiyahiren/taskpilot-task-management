import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout.jsx";
import { api } from "../api/client.js";
import { DEFAULT_BOARD_ID, WORKSPACE_ID } from "../constants.js";
import { priorityDot, priorityLabel } from "../lib/priority.js";
import { useNavigate } from "react-router-dom";

function StatCard({ title, value, sub, trend, danger }) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-card ${
        danger ? "border-red-100 bg-red-50/50" : "border-slate-200/90 bg-white"
      }`}
    >
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
      {trend && <p className="mt-2 text-xs font-semibold text-emerald-600">{trend}</p>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [board, setBoard] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, a, an, m, b] = await Promise.all([
          api.get(`/dashboard/stats?workspace_id=${WORKSPACE_ID}&board_id=${DEFAULT_BOARD_ID}`),
          api.get(`/activity/recent?board_id=${DEFAULT_BOARD_ID}&limit=8`),
          api.get(`/analytics/tasks?board_id=${DEFAULT_BOARD_ID}&days=21`),
          api.get(`/workspaces/${WORKSPACE_ID}/meetings`),
          api.get(`/boards/${DEFAULT_BOARD_ID}`),
        ]);
        setStats(s);
        setActivity(a);
        setAnalytics(an);
        setMeetings(m);
        setBoard(b);
      } catch (e) {
        setErr(String(e.message));
      }
    })();
  }, []);

  const overdue = useMemo(() => {
    if (!board?.lists) return [];
    const today = new Date().toISOString().slice(0, 10);
    const tasks = board.lists.flatMap((c) => c.tasks.map((t) => ({ ...t, column: c.name })));
    return tasks
      .filter((t) => t.due_date && t.due_date < today)
      .sort((a, b) => (a.due_date < b.due_date ? -1 : 1))
      .slice(0, 8);
  }, [board]);

  const chartPath = useMemo(() => {
    if (!analytics.length) return "";
    const w = 320;
    const h = 120;
    const maxY = Math.max(...analytics.map((p) => Math.max(p.completed, p.created, p.overdue)), 1);
    const denom = Math.max(analytics.length - 1, 1);
    const pts = analytics.map((p, i) => {
      const x = (i / denom) * w;
      const y = h - (p.completed / maxY) * h;
      return `${x},${y}`;
    });
    return `M ${pts.join(" L ")}`;
  }, [analytics]);

  const handleNewTask = () => navigate("/board");

  return (
    <Layout onNewTask={handleNewTask}>
      <div className="min-h-full bg-gradient-to-b from-slate-50 to-white p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-slate-900">Good morning, Jamie</h1>
              <p className="mt-1 text-slate-500">Your team&apos;s task overview — Q1 2026 Sprint</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
              >
                Export
              </button>
            </div>
          </div>

          {err && <p className="mb-4 text-red-600">{err}</p>}

          {stats && (
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard title="Team tasks" value={stats.team_tasks} sub="Q1 Product Sprint" trend="+3.5% vs last week" />
              <StatCard
                title="Overdue tasks"
                value={stats.overdue_tasks}
                sub={`${stats.overdue_urgent} urgent`}
                danger
                trend="-9.1% vs last week"
              />
              <StatCard
                title="Completion rate"
                value={`${stats.completion_rate_pct}%`}
                sub="this sprint"
                trend="+4.7% vs last week"
              />
              <StatCard title="My tasks" value={stats.my_tasks} sub={`${stats.my_due_this_week} due this week`} />
              <StatCard title="Meetings this week" value={stats.meetings_this_week} sub="1 with AI notes" />
              <StatCard
                title="AI tasks generated"
                value={stats.ai_tasks_generated}
                sub="from 2 meetings"
                trend="+20%"
              />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-slate-900">Task analytics</h2>
                <span className="text-xs font-medium text-slate-400">Last 21 days</span>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded bg-brand-600" /> Completed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 border-t-2 border-dashed border-blue-500" /> Created
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded bg-red-500" /> Overdue
                </span>
              </div>
              <svg viewBox="0 0 320 120" className="mt-4 w-full text-brand-600">
                <path d={chartPath} fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600" />
              </svg>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card">
              <h2 className="mb-4 font-display text-lg font-semibold text-slate-900">Recent activity</h2>
              <ul className="space-y-4">
                {activity.map((row) => (
                  <li key={row.id} className="flex gap-3 text-sm">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                      {row.user.name
                        .split(" ")
                        .map((x) => x[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">{row.user.name}</span>
                      <span className="text-slate-600"> {row.detail}</span>
                      <p className="text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Overdue tasks
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    {overdue.length} need attention
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => navigate("/board")}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  View board
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                      <th className="pb-2 pr-4">Task</th>
                      <th className="pb-2 pr-4">Assignee</th>
                      <th className="pb-2 pr-4">Column</th>
                      <th className="pb-2 pr-4">Due</th>
                      <th className="pb-2">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdue.map((t) => (
                      <tr key={t.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-medium text-slate-800">{t.title}</td>
                        <td className="py-3 pr-4">
                          <div className="flex -space-x-2">
                            {t.assignees?.slice(0, 2).map((u) => (
                              <span
                                key={u.id}
                                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-500 text-[10px] font-bold text-white"
                              >
                                {u.name[0]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-slate-500">{t.column}</td>
                        <td className="py-3 pr-4 font-medium text-red-600">{t.due_date}</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                              t.priority === "urgent"
                                ? "bg-red-100 text-red-800"
                                : t.priority === "high"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[t.priority]}`} />
                            {priorityLabel[t.priority]}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!overdue.length && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No overdue tasks on this board.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-slate-900">Meetings</h2>
                <button
                  type="button"
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
                >
                  + Schedule
                </button>
              </div>
              <ul className="space-y-3">
                {meetings.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{m.title}</p>
                      <p className="text-xs text-slate-500">{new Date(m.start_time).toLocaleString()}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        m.status === "live"
                          ? "bg-emerald-100 text-emerald-800"
                          : m.status === "ended"
                            ? "bg-slate-200 text-slate-600"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {m.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
