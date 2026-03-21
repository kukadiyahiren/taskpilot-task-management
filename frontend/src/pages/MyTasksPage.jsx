import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import TaskModal from "../components/TaskModal.jsx";
import { api } from "../api/client.js";
import { DEFAULT_BOARD_ID } from "../constants.js";
import { priorityDot, priorityLabel } from "../lib/priority.js";

export default function MyTasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api.get("/users/me/tasks");
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Could not load your tasks");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Layout onNewTask={() => navigate("/board")}>
      <div className="min-h-full bg-[#f8fafc] p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">My tasks</h1>
            </div>
            <button
              type="button"
              onClick={() => navigate("/board")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Open board
            </button>
          </div>

          {error && (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          )}

          {loading && <p className="mt-10 text-sm text-slate-500">Loading your tasks…</p>}

          {!loading && !error && tasks.length === 0 && (
            <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white/80 p-8 text-center">
              <p className="text-slate-600">You have no assigned tasks yet.</p>
              <p className="mt-2 text-sm text-slate-500">
                Open a task on the board and add yourself under Assignees, or ask a teammate to assign you.
              </p>
            </div>
          )}

          <ul className="mt-8 space-y-3">
            {tasks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelected({ taskId: t.id, boardId: t.board_id || DEFAULT_BOARD_ID })}
                  className="flex w-full items-start gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-sm transition hover:border-brand-200 hover:shadow-md"
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${priorityDot[t.priority] || "bg-slate-300"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{t.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">{t.board_name}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      {t.list_name}
                      <span className="mx-1.5 text-slate-300">·</span>
                      {priorityLabel[t.priority] ?? t.priority}
                      {t.due_date && (
                        <>
                          <span className="mx-1.5 text-slate-300">·</span>
                          Due {t.due_date}
                        </>
                      )}
                    </p>
                    {(t.labels?.length > 0 || t.checklist_total > 0) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {t.labels?.map((lb) => (
                          <span
                            key={lb.id}
                            className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
                            style={{ backgroundColor: lb.color }}
                          >
                            {lb.name}
                          </span>
                        ))}
                        {t.checklist_total > 0 && (
                          <span className="text-[11px] text-slate-500">
                            Checklist {t.checklist_done}/{t.checklist_total}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">Open →</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {selected != null && (
        <TaskModal
          taskId={selected.taskId}
          boardId={selected.boardId}
          onClose={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </Layout>
  );
}
