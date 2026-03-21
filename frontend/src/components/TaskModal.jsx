import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client.js";
import { priorityDot, priorityLabel } from "../lib/priority.js";
import { useBoardStore } from "../store/boardStore.js";

function formatAgo(iso) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function TaskModal({ taskId, boardId, onClose }) {
  const { loadBoard, refreshTaskInBoard } = useBoardStore();
  const [task, setTask] = useState(null);
  const [tab, setTab] = useState("comments");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [titleEdit, setTitleEdit] = useState("");
  const [descEdit, setDescEdit] = useState("");

  const load = useCallback(async () => {
    const t = await api.get(`/tasks/${taskId}`);
    setTask(t);
    setTitleEdit(t.title);
    setDescEdit(t.description ?? "");
  }, [taskId]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const saveMeta = async () => {
    if (!task) return;
    setSaving(true);
    try {
      const updated = await api.patch(`/tasks/${taskId}`, {
        title: titleEdit,
        description: descEdit,
      });
      setTask(updated);
      await refreshTaskInBoard(taskId);
    } finally {
      setSaving(false);
    }
  };

  const setPriority = async (p) => {
    setSaving(true);
    try {
      const updated = await api.patch(`/tasks/${taskId}`, { priority: p });
      setTask(updated);
      await refreshTaskInBoard(taskId);
    } finally {
      setSaving(false);
    }
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await api.post(`/tasks/${taskId}/comments`, { body: comment.trim() });
      setComment("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = async (itemId, done) => {
    await api.patch(`/checklist-items/${itemId}`, { done: !done });
    await load();
    await refreshTaskInBoard(taskId);
  };

  const removeTask = async () => {
    if (!confirm("Delete this task?")) return;
    await api.delete(`/tasks/${taskId}`);
    await loadBoard(boardId);
    onClose();
  };

  if (!task) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
        <div className="rounded-2xl bg-white px-8 py-6 shadow-modal">Loading…</div>
      </div>,
      document.body
    );
  }

  const checklist = task.checklists?.[0];
  const items = checklist?.items ?? [];
  const doneC = items.filter((i) => i.done).length;
  const totalC = items.length;
  const pct = totalC ? Math.round((doneC / totalC) * 100) : 0;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm md:pt-12">
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-modal md:flex-row"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="min-w-0 flex-1 p-6 md:p-8">
          <div className="mb-4 flex flex-wrap items-start gap-3 pr-10">
            <input
              value={titleEdit}
              onChange={(e) => setTitleEdit(e.target.value)}
              onBlur={saveMeta}
              className="flex-1 min-w-[200px] font-display text-xl font-bold text-slate-900 outline-none ring-brand-400/0 focus:ring-2 rounded-lg px-1 -mx-1"
            />
            <div className="relative">
              <select
                value={task.priority}
                onChange={(e) => setPriority(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-8 text-sm font-medium capitalize"
              >
                {["urgent", "high", "medium", "low"].map((p) => (
                  <option key={p} value={p}>
                    {priorityLabel[p]}
                  </option>
                ))}
              </select>
              <span
                className={`pointer-events-none absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${priorityDot[task.priority]}`}
              />
            </div>
          </div>

          <p className="mb-4 text-sm text-slate-500">
            {task.due_date && <span className="mr-3">Due {task.due_date}</span>}
            {task.labels?.map((lb) => (
              <span
                key={lb.id}
                className="mr-2 inline-block rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                style={{ backgroundColor: lb.color }}
              >
                {lb.name}
              </span>
            ))}
          </p>

          <div className="mb-6">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description
            </label>
            <textarea
              value={descEdit}
              onChange={(e) => setDescEdit(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-400/30"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={saveMeta}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitleEdit(task.title);
                  setDescEdit(task.description ?? "");
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {task.assignees?.map((u) => (
              <div key={u.id} className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                  {u.name
                    .split(" ")
                    .map((x) => x[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <span className="text-sm font-medium text-slate-700">{u.name}</span>
              </div>
            ))}
          </div>

          <div className="border-b border-slate-200">
            <div className="flex gap-1">
              {[
                ["comments", `Comments (${task.comments?.length ?? 0})`],
                ["activity", "Activity"],
                ["files", "Files"],
                ["ai", "AI"],
              ].map(([k, lab]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    tab === k ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 min-h-[200px]">
            {tab === "comments" && (
              <div className="space-y-4">
                {task.comments?.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-200 text-xs font-bold text-violet-800">
                      {c.user.name
                        .split(" ")
                        .map((x) => x[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-slate-800">{c.user.name}</span>
                        <span className="text-xs text-slate-400">{formatAgo(c.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{c.body}</p>
                    </div>
                  </div>
                ))}
                <form onSubmit={postComment} className="flex gap-2 pt-2">
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment…"
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400/40"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Post
                  </button>
                </form>
              </div>
            )}
            {tab !== "comments" && (
              <p className="text-sm text-slate-400">This tab is a placeholder for the full product experience.</p>
            )}
          </div>
        </div>

        <aside className="w-full shrink-0 border-t border-slate-200 bg-slate-50/80 p-6 md:w-72 md:border-l md:border-t-0">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Checklist</h3>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium text-slate-700">
              {doneC}/{totalC}
            </span>
            <span className="text-slate-500">{pct}%</span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
          </div>
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={it.done}
                  onChange={() => toggleItem(it.id, it.done)}
                  className="mt-1 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className={`text-sm ${it.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                  {it.title}
                </span>
              </li>
            ))}
          </ul>

          <h3 className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-slate-500">Labels</h3>
          <div className="flex flex-wrap gap-2">
            {task.labels?.map((lb) => (
              <span
                key={lb.id}
                className="rounded-md px-2 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: lb.color }}
              >
                {lb.name}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={removeTask}
            className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Delete task
          </button>
        </aside>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
