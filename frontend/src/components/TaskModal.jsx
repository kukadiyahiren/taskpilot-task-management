import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client.js";
import { priorityDot, priorityLabel } from "../lib/priority.js";
import { useBoardStore } from "../store/boardStore.js";

const EXIT_MS = 220;

function formatAgo(iso) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function userInitials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TaskModal({ taskId, boardId, onClose }) {
  const { loadBoard, refreshTaskInBoard } = useBoardStore();
  const [task, setTask] = useState(null);
  const [tab, setTab] = useState("comments");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [titleEdit, setTitleEdit] = useState("");
  const [descEdit, setDescEdit] = useState("");
  const [teamUsers, setTeamUsers] = useState([]);
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [exiting, setExiting] = useState(false);
  const exitTimerRef = useRef(null);
  const exitStartedRef = useRef(false);

  const requestClose = useCallback(() => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;
    setExiting(true);
    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null;
      onClose();
    }, EXIT_MS);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    };
  }, []);

  const load = useCallback(async () => {
    const t = await api.get(`/tasks/${taskId}`);
    setTask(t);
    setTitleEdit(t.title);
    setDescEdit(t.description ?? "");
    setAssigneeIds((t.assignees ?? []).map((a) => a.id));
  }, [taskId]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/users")
      .then((users) => {
        if (!cancelled) setTeamUsers(users);
      })
      .catch(() => {
        if (!cancelled) setTeamUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const saveMeta = async (opts = {}) => {
    const closeAfter = opts.closeAfter === true;
    if (!task) return;
    setSaving(true);
    try {
      const updated = await api.patch(`/tasks/${taskId}`, {
        title: titleEdit,
        description: descEdit,
        assignee_ids: assigneeIds,
      });
      setTask(updated);
      await refreshTaskInBoard(taskId);
      if (closeAfter) requestClose();
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

  const toggleAssignee = async (userId) => {
    if (!task) return;
    const next = assigneeIds.includes(userId)
      ? assigneeIds.filter((id) => id !== userId)
      : [...assigneeIds, userId];
    setAssigneeIds(next);
    setSaving(true);
    try {
      const updated = await api.patch(`/tasks/${taskId}`, { assignee_ids: next });
      setTask(updated);
      setAssigneeIds((updated.assignees ?? []).map((a) => a.id));
      await refreshTaskInBoard(taskId);
    } catch {
      setAssigneeIds((task.assignees ?? []).map((a) => a.id));
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
    requestClose();
  };

  if (!task) {
    return createPortal(
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm transition-opacity duration-200 ease-out dark:bg-black/55 ${
          exiting ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="rounded-2xl border border-border bg-card px-8 py-6 text-foreground shadow-modal dark:shadow-modal-dark">
          Loading…
        </div>
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
    <div
      role="presentation"
      className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out dark:bg-black/55 md:pt-12 ${
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-modal transition-all duration-200 ease-out dark:shadow-modal-dark md:flex-row ${
          exiting ? "translate-y-1 scale-[0.98] opacity-0" : "translate-y-0 scale-100 opacity-100"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={requestClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
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
              className="-mx-1 min-w-[200px] flex-1 rounded-lg px-1 font-display text-xl font-bold text-foreground outline-none ring-brand-400/0 focus:ring-2"
            />
            <div className="relative">
              <select
                value={task.priority}
                onChange={(e) => setPriority(e.target.value)}
                className="appearance-none rounded-lg border border-border bg-muted py-1.5 pl-8 pr-8 text-sm font-medium capitalize text-foreground"
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

          <p className="mb-4 text-sm text-muted-foreground">
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
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </label>
            <textarea
              value={descEdit}
              onChange={(e) => setDescEdit(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-muted p-3 text-sm text-foreground outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-400/30"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => saveMeta({ closeAfter: true })}
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
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Assignees
            </label>
            <p className="mb-2 text-xs text-muted-foreground">Checked teammates are saved to this task for everyone on the board.</p>
            <ul className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-border bg-muted/80 p-2">
              {teamUsers.map((u) => (
                <li key={u.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-card">
                    <input
                      type="checkbox"
                      checked={assigneeIds.includes(u.id)}
                      disabled={saving}
                      onChange={() => toggleAssignee(u.id)}
                      className="rounded border-border text-brand-600 focus:ring-brand-500"
                    />
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                      {userInitials(u.name)}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{u.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{u.email}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-b border-border">
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
                    tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
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
                        <span className="text-sm font-semibold text-foreground">{c.user.name}</span>
                        <span className="text-xs text-muted-foreground">{formatAgo(c.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
                    </div>
                  </div>
                ))}
                <form onSubmit={postComment} className="flex gap-2 pt-2">
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment…"
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-400/40"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
                  >
                    Post
                  </button>
                </form>
              </div>
            )}
            {tab !== "comments" && (
              <p className="text-sm text-muted-foreground">This tab is a placeholder for the full product experience.</p>
            )}
          </div>
        </div>

        <aside className="w-full shrink-0 border-t border-border bg-muted/50 p-6 md:w-72 md:border-l md:border-t-0">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checklist</h3>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium text-foreground">
              {doneC}/{totalC}
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
          </div>
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={it.done}
                  onChange={() => toggleItem(it.id, it.done)}
                  className="mt-1 rounded border-border text-brand-600 focus:ring-brand-500"
                />
                <span className={`text-sm ${it.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {it.title}
                </span>
              </li>
            ))}
          </ul>

          <h3 className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Labels</h3>
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
            className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2 text-sm font-medium text-red-700 hover:bg-red-500/15 dark:text-red-300"
          >
            Delete task
          </button>
        </aside>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
