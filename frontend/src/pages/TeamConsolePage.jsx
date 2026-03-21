import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { useDashboardStats } from "../hooks/useDashboardData.js";
import { DEFAULT_BOARD_ID, WORKSPACE_ID } from "../constants.js";

/** Manager and above: team-centric console. */
export default function TeamConsolePage() {
  const navigate = useNavigate();
  const statsQ = useDashboardStats(WORKSPACE_ID, DEFAULT_BOARD_ID);
  const stats = statsQ.data;

  return (
    <Layout onNewTask={() => navigate("/board")}>
      <div className="min-h-full bg-background p-6 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Team console</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manager-level view: workload and assignments for people in your scope (API-filtered by RBAC).
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase text-muted-foreground">Team tasks (visible)</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{stats?.team_tasks ?? "—"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase text-muted-foreground">Your assignments</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{stats?.my_tasks ?? "—"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/members")}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Open members
            </button>
            <button
              type="button"
              onClick={() => navigate("/board")}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Task board
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
