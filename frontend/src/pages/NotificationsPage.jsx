import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { markNotificationsSeenNow } from "../lib/notificationsStorage.js";
import { formatRelativeTime } from "../lib/time.js";
import { useWorkspaceNotifications } from "../hooks/useWorkspaceNotifications.js";
import { cn } from "../lib/utils.js";

function initials(name) {
  return name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const colors = ["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];

function actionStyle(action) {
  const a = (action || "").toLowerCase();
  if (a === "moved") return "bg-sky-100 text-sky-800";
  if (a === "created") return "bg-emerald-100 text-emerald-800";
  if (a === "updated") return "bg-amber-100 text-amber-800";
  if (a === "deleted") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { items, isLoading, isError, refetch } = useWorkspaceNotifications();

  useEffect(() => {
    markNotificationsSeenNow();
  }, []);

  return (
    <Layout onNewTask={() => navigate("/board")}>
      <div className="min-h-full bg-[#f8fafc] p-6 lg:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">Notifications</h1>
              <p className="mt-1 text-sm text-slate-600">
                Recent activity across all boards in this workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {isLoading && <p className="mt-10 text-sm text-slate-500">Loading…</p>}

          {isError && (
            <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Could not load notifications.
              <button type="button" className="ml-2 font-semibold underline" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <p className="mt-10 text-sm text-slate-500">No activity yet. Move or edit tasks on the board to see updates here.</p>
          )}

          <ul className="mt-8 space-y-4">
            {items.map((row, i) => (
              <li
                key={row.id}
                className="flex gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                    colors[i % colors.length]
                  )}
                >
                  {initials(row.user.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase", actionStyle(row.action))}>
                      {row.action}
                    </span>
                    <span className="text-xs text-slate-400">{formatRelativeTime(row.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-800">
                    <span className="font-semibold">{row.user.name}</span>
                    <span className="text-slate-600"> {row.detail}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
}
