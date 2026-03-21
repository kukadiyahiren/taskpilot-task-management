import { useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { ActivityList } from "../components/dashboard/ActivityList.jsx";
import { MeetingsPanel } from "../components/dashboard/MeetingsPanel.jsx";
import { OverdueTable } from "../components/dashboard/OverdueTable.jsx";
import { StatsCard, StatsCardSkeleton } from "../components/dashboard/StatsCard.jsx";
import { TaskAnalyticsChart } from "../components/dashboard/TaskAnalyticsChart.jsx";
import { Button } from "../components/ui/button.jsx";
import { Badge } from "../components/ui/badge.jsx";
import {
  useBoard,
  useDashboardStats,
  useRecentActivity,
  useTaskAnalytics,
  useWorkspaceMeetings,
  qk,
} from "../hooks/useDashboardData.js";
import { useCurrentUser } from "../hooks/useCurrentUser.js";
import { useWorkspaceNotifications } from "../hooks/useWorkspaceNotifications.js";
import { useOverdueFromBoard } from "../hooks/useOverdueFromBoard.js";
import { DEFAULT_BOARD_ID, WORKSPACE_ID } from "../constants.js";
import {
  buildFallbackAnalytics,
  FALLBACK_ACTIVITIES,
  FALLBACK_BOARD,
  FALLBACK_MEETINGS,
  FALLBACK_STATS,
} from "../lib/dashboardFallbacks.js";
import { resolveQueryData } from "../lib/resolveQueryData.js";
import { seriesTrend } from "../lib/trends.js";
import { downloadBoardExport } from "../lib/downloadBoardExport.js";
import { firstNameFromName, initialsFromName } from "../lib/userDisplay.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const meQ = useCurrentUser();
  const me = meQ.data;
  const { unreadCount: notifUnread } = useWorkspaceNotifications();
  const notifBadge =
    notifUnread > 99 ? "99+" : notifUnread > 0 ? String(notifUnread) : null;
  const greetName = firstNameFromName(me?.name);
  const chipLetter = me
    ? initialsFromName(me.name).slice(0, 1)
    : meQ.isPending
      ? "…"
      : "?";
  const ws = WORKSPACE_ID;
  const boardId = DEFAULT_BOARD_ID;

  const statsQ = useDashboardStats(ws, boardId);
  const analyticsQ = useTaskAnalytics(boardId, 21);
  const activityQ = useRecentActivity(boardId, 12);
  const boardQ = useBoard(boardId);
  const meetingsQ = useWorkspaceMeetings(ws);

  const statsRes = resolveQueryData(statsQ, FALLBACK_STATS);
  const analyticsRes = resolveQueryData(analyticsQ, buildFallbackAnalytics(21));
  const activityRes = resolveQueryData(activityQ, FALLBACK_ACTIVITIES);
  const boardRes = resolveQueryData(boardQ, FALLBACK_BOARD);
  const meetingsRes = resolveQueryData(meetingsQ, FALLBACK_MEETINGS);

  const stats = statsRes.data;
  const analytics = analyticsRes.data ?? [];
  const activities = activityRes.data ?? [];
  const board = boardRes.data;
  const meetings = meetingsRes.data ?? [];

  const overdue = useOverdueFromBoard(board ?? null);

  const anyFallback =
    statsRes.isFallback ||
    analyticsRes.isFallback ||
    activityRes.isFallback ||
    boardRes.isFallback ||
    meetingsRes.isFallback;

  const trends = useMemo(() => {
    const pts = analytics;
    return {
      team: seriesTrend(pts, "created"),
      overdue: seriesTrend(pts, "overdue"),
      completion: seriesTrend(pts, "completed"),
      my: seriesTrend(pts, "created") != null ? seriesTrend(pts, "created") * 0.8 : null,
      ai: seriesTrend(pts, "created"),
    };
  }, [analytics]);

  const handleNewTask = () => navigate("/board");

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: qk.stats(ws, boardId) });
    qc.invalidateQueries({ queryKey: qk.analytics(boardId, 21) });
    qc.invalidateQueries({ queryKey: qk.activity(boardId, 12) });
    qc.invalidateQueries({ queryKey: qk.board(boardId) });
    qc.invalidateQueries({ queryKey: qk.meetings(ws) });
  };

  const sprintName = board?.name ?? "Q1 2026 Sprint";
  const statsReady = stats != null;

  const [exportBusy, setExportBusy] = useState(false);
  const [exportErr, setExportErr] = useState("");

  async function handleBoardExport(fmt) {
    setExportErr("");
    setExportBusy(true);
    try {
      await downloadBoardExport(boardId, fmt);
    } catch (e) {
      setExportErr(e?.message || "Export failed");
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <Layout onNewTask={handleNewTask}>
      <div className="min-h-full bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px] space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Good morning, {meQ.isPending ? "…" : greetName}
              </h1>
              <p className="mt-1 text-slate-500">
                Your team&apos;s task overview — {sprintName} · Last updated just now
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/notifications"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Bell className="h-4 w-4 text-slate-600" />
                Notifications
                {notifBadge != null && (
                  <Badge variant="default" className="ml-1 bg-red-500 text-white">
                    {notifBadge}
                  </Badge>
                )}
              </Link>
              <details className="relative">
                <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <Download className="h-4 w-4 text-slate-600" />
                  {exportBusy ? "Exporting…" : "Export"}
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </summary>
                <div className="absolute right-0 z-30 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    disabled={exportBusy}
                    className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    onClick={(e) => {
                      const d = e.currentTarget.closest("details");
                      if (d) d.open = false;
                      void handleBoardExport("csv");
                    }}
                  >
                    Download CSV
                  </button>
                  <button
                    type="button"
                    disabled={exportBusy}
                    className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    onClick={(e) => {
                      const d = e.currentTarget.closest("details");
                      if (d) d.open = false;
                      void handleBoardExport("xlsx");
                    }}
                  >
                    Download Excel (.xlsx)
                  </button>
                </div>
              </details>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-[#7C3AED]">
                  {chipLetter}
                </span>
                Viewing as: {me?.role ?? "Member"}
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              </div>
              {exportErr && (
                <p className="max-w-sm text-right text-xs text-red-600">{exportErr}</p>
              )}
            </div>
          </div>

          {anyFallback && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p>
                <span className="font-semibold">Demo mode.</span> Some data couldn&apos;t be loaded from the API —
                showing static placeholders until the backend is reachable.
              </p>
              <Button variant="outline" size="sm" className="shrink-0 border-amber-300 bg-white" onClick={refetchAll}>
                Retry connection
              </Button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {!statsReady ? (
              Array.from({ length: 6 }).map((_, i) => <StatsCardSkeleton key={i} />)
            ) : (
              <>
                <StatsCard title="Team Tasks" value={stats.team_tasks} iconKey="team" trend={trends.team} />
                <StatsCard
                  title="Overdue Tasks"
                  value={stats.overdue_tasks}
                  iconKey="overdue"
                  border="red"
                  trend={trends.overdue}
                  trendInverted
                />
                <StatsCard
                  title="Completion Rate"
                  value={`${stats.completion_rate_pct}%`}
                  iconKey="completion"
                  border="green"
                  trend={trends.completion}
                />
                <StatsCard title="My Tasks" value={stats.my_tasks} iconKey="my" trend={trends.my} />
                <StatsCard title="Meetings This Week" value={stats.meetings_this_week} iconKey="meetings" />
                <StatsCard title="AI Tasks Generated" value={stats.ai_tasks_generated} iconKey="ai" trend={trends.ai} />
              </>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="min-h-0 lg:col-span-8">
              <TaskAnalyticsChart
                analytics={analytics}
                board={board}
                isLoading={!analyticsQ.isFetched || !boardQ.isFetched}
                isError={false}
                onRetry={() => {
                  analyticsQ.refetch();
                  boardQ.refetch();
                }}
              />
            </div>
            <div className="min-h-0 lg:col-span-4">
              <div className="h-full min-h-[320px] lg:min-h-[420px]">
                <ActivityList
                  items={activities}
                  isLoading={!activityQ.isFetched}
                  isError={false}
                  onRetry={() => activityQ.refetch()}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <OverdueTable
                board={board}
                overdue={overdue}
                isLoading={!boardQ.isFetched}
                isError={false}
                onViewBoard={() => navigate("/board")}
                onRetry={() => boardQ.refetch()}
              />
            </div>
            <div className="lg:col-span-4">
              <MeetingsPanel
                meetings={meetings}
                isLoading={!meetingsQ.isFetched}
                isError={false}
                onRetry={() => meetingsQ.refetch()}
              />
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-400">
            Live data from FastAPI when available:{" "}
            <code className="rounded bg-slate-100 px-1">/dashboard/stats</code>,{" "}
            <code className="rounded bg-slate-100 px-1">/analytics/tasks</code>,{" "}
            <code className="rounded bg-slate-100 px-1">/activity/recent</code>,{" "}
            <code className="rounded bg-slate-100 px-1">/boards/{boardId}</code>,{" "}
            <code className="rounded bg-slate-100 px-1">/workspaces/{ws}/meetings</code>
            <button type="button" onClick={refetchAll} className="ml-2 text-[#7C3AED] hover:underline">
              Refresh all
            </button>
          </p>
        </div>
      </div>
    </Layout>
  );
}
