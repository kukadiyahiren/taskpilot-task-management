import { BarChart3, Building2, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { useCurrentUser } from "../hooks/useCurrentUser.js";
import { useDashboardStats } from "../hooks/useDashboardData.js";
import { DEFAULT_BOARD_ID, WORKSPACE_ID } from "../constants.js";

/** Director-only: strategic framing (data still from scoped APIs). */
export default function StrategicDashboardPage() {
  const navigate = useNavigate();
  const meQ = useCurrentUser();
  const statsQ = useDashboardStats(WORKSPACE_ID, DEFAULT_BOARD_ID);
  const stats = statsQ.data;

  return (
    <Layout onNewTask={() => navigate("/board")}>
      <div className="min-h-full bg-background p-6 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Director</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Strategic KPIs</h1>
            <p className="mt-2 text-muted-foreground">
              Organization-wide snapshot for {meQ.data?.name ?? "leadership"}. Underlying metrics respect RBAC on the
              API.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <Target className="h-8 w-8 text-primary" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">Delivery load</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{stats?.team_tasks ?? "—"}</p>
              <p className="mt-2 text-xs text-muted-foreground">Tasks in scope for your visibility</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <BarChart3 className="h-8 w-8 text-amber-500" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">Completion rate</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{stats?.completion_rate_pct ?? "—"}%</p>
              <p className="mt-2 text-xs text-muted-foreground">Done column throughput</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <Building2 className="h-8 w-8 text-emerald-600" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">Risk / overdue</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{stats?.overdue_tasks ?? "—"}</p>
              <p className="mt-2 text-xs text-muted-foreground">Items past due in visible scope</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm font-semibold text-primary hover:underline"
          >
            ← Full operational dashboard
          </button>
        </div>
      </div>
    </Layout>
  );
}
