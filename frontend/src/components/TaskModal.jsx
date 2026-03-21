import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client.js";
import { getAccessToken } from "../lib/authStorage.js";
import { useCurrentUser } from "../hooks/useCurrentUser.js";
import { hasPermission } from "../lib/rbac.js";
import { priorityDot, priorityLabel } from "../lib/priority.js";
import { useBoardStore } from "../store/boardStore.js";
import { Spinner } from "./ui/spinner.jsx";

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
  const meQ = useCurrentUser();
  const canDelete = hasPermission(meQ.data, "tasks.delete");
  const { loadBoard, refreshTaskInBoard } = useBoardStore();
  const [task, setTask] = useState(null);
  const [tab, setTab] = useState("comments");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [titleEdit, setTitleEdit] = useState("");
  const [descEdit, setDescEdit] = useState("");
  const [dueDateEdit, setDueDateEdit] = useState("");
  const [teamUsers, setTeamUsers] = useState([]);
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [exiting, setExiting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [boardLabels, setBoardLabels] = useState([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelBusy, setNewLabelBusy] = useState(false);
  const [labelBusyId, setLabelBusyId] = useState(null);
  const [fileBusy, setFileBusy] = useState(false);
  const [newChecklistItemTitle, setNewChecklistItemTitle] = useState("");
  const [checklistBusy, setChecklistBusy] = useState(false);
  const fileInputRef = useRef(null);
  const exitTimerRef = useRef(null);
  const exitStartedRef = useRef(false);

  const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

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
    setDueDateEdit(t.due_date ?? "");
    setAssigneeIds((t.assignees ?? []).map((a) => a.id));
  }, [taskId]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  useEffect(() => {
    if (!boardId) return;
    const b = useBoardStore.getState().board;
    if (b && Number(b.id) === Number(boardId) && Array.isArray(b.labels)) {
      setBoardLabels(b.labels);
      return;
    }
    let cancelled = false;
    api
      .get(`/boards/${boardId}`)
      .then((data) => {
        if (!cancelled) setBoardLabels(data.labels ?? []);
      })
      .catch(() => {
        if (!cancelled) setBoardLabels([]);
      });
    return () => {
      cancelled = true;
    };
  }, [boardId, taskId]);

  useEffect(() => {
    if (tab !== "activity" || taskId == null) return;
    let cancelled = false;
    setActivityLoading(true);
    api
      .get(`/tasks/${taskId}/activity`)
      .then((rows) => {
        if (!cancelled) setActivity(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setActivity([]);
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, taskId]);

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

  const saveDueDate = async () => {
    if (!task) return;
    const nextVal = dueDateEdit.trim() ? dueDateEdit.trim() : null;
    const prevVal = task.due_date ?? null;
    if (nextVal === prevVal) return;
    setSaving(true);
    try {
      const updated = await api.patch(`/tasks/${taskId}`, { due_date: nextVal });
      setTask(updated);
      setDueDateEdit(updated.due_date ?? "");
      await refreshTaskInBoard(taskId);
    } catch (e) {
      console.error(e);
      setDueDateEdit(task.due_date ?? "");
    } finally {
      setSaving(false);
    }
  };

  const clearDueDate = async () => {
    setDueDateEdit("");
    if (!task?.due_date) return;
    setSaving(true);
    try {
      const updated = await api.patch(`/tasks/${taskId}`, { due_date: null });
      setTask(updated);
      await refreshTaskInBoard(taskId);
    } catch (e) {
      console.error(e);
      setDueDateEdit(task.due_date ?? "");
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
    if (checklistBusy) return;
    setChecklistBusy(true);
    try {
      await api.patch(`/checklist-items/${itemId}`, { done: !done });
      await load();
      await refreshTaskInBoard(taskId);
    } catch (e) {
      console.error(e);
    } finally {
      setChecklistBusy(false);
    }
  };

  const addChecklist = async () => {
    setChecklistBusy(true);
    try {
      const updated = await api.post(`/tasks/${taskId}/checklists`, { title: "Checklist" });
      setTask(updated);
      await refreshTaskInBoard(taskId);
    } catch (e) {
      console.error(e);
    } finally {
      setChecklistBusy(false);
    }
  };

  const submitNewChecklistItem = async (e) => {
    e.preventDefault();
    const title = newChecklistItemTitle.trim();
    if (!title) return;
    setChecklistBusy(true);
    try {
      let cl = task.checklists?.[0];
      if (!cl) {
        const withList = await api.post(`/tasks/${taskId}/checklists`, { title: "Checklist" });
        setTask(withList);
        cl = withList.checklists?.[0];
      }
      if (!cl) return;
      const updated = await api.post(`/tasks/${taskId}/checklists/${cl.id}/items`, { title });
      setTask(updated);
      setNewChecklistItemTitle("");
      await refreshTaskInBoard(taskId);
    } catch (err) {
      console.error(err);
    } finally {
      setChecklistBusy(false);
    }
  };

  const updateChecklistItemTitle = async (itemId, previousTitle, newTitle) => {
    const t = newTitle.trim();
    if (!t || t === previousTitle) return;
    setChecklistBusy(true);
    try {
      await api.patch(`/checklist-items/${itemId}`, { title: t });
      await load();
      await refreshTaskInBoard(taskId);
    } catch (e) {
      console.error(e);
    } finally {
      setChecklistBusy(false);
    }
  };

  const removeTask = async () => {
    if (!confirm("Delete this task?")) return;
    setDeleting(true);
    try {
      await api.delete(`/tasks/${taskId}`);
      await loadBoard(boardId);
      requestClose();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const toggleTaskLabel = async (labelId) => {
    if (!task) return;
    const ids = new Set((task.labels ?? []).map((l) => l.id));
    if (ids.has(labelId)) ids.delete(labelId);
    else ids.add(labelId);
    const label_ids = [...ids];
    setLabelBusyId(labelId);
    setSaving(true);
    try {
      const updated = await api.patch(`/tasks/${taskId}`, { label_ids });
      setTask(updated);
      await refreshTaskInBoard(taskId);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
      setLabelBusyId(null);
    }
  };

  const addBoardLabelToTask = async (e) => {
    e.preventDefault();
    const name = newLabelName.trim();
    if (!name || !boardId) return;
    setNewLabelBusy(true);
    try {
      const created = await api.post(`/boards/${boardId}/labels`, {
        name,
        color: "#7c3aed",
      });
      setNewLabelName("");
      setBoardLabels((prev) => [...prev, created]);
      const ids = [...(task?.labels ?? []).map((l) => l.id), created.id];
      const updated = await api.patch(`/tasks/${taskId}`, { label_ids: ids });
      setTask(updated);
      await refreshTaskInBoard(taskId);
    } catch (err) {
      console.error(err);
    } finally {
      setNewLabelBusy(false);
    }
  };

  const uploadAttachment = async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    setFileBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/tasks/${taskId}/attachments`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      await load();
      await refreshTaskInBoard(taskId);
    } catch (e) {
      console.error(e);
    } finally {
      setFileBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadAttachment = async (att) => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/tasks/${taskId}/attachments/${att.id}/file`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.original_filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteAttachment = async (att) => {
    if (!confirm(`Remove “${att.original_filename}”?`)) return;
    setFileBusy(true);
    try {
      await api.delete(`/tasks/${taskId}/attachments/${att.id}`);
      await load();
      await refreshTaskInBoard(taskId);
    } catch (e) {
      console.error(e);
    } finally {
      setFileBusy(false);
    }
  };

  if (!task) {
    return createPortal(
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm transition-opacity duration-200 ease-out dark:bg-black/55 ${exiting ? "opacity-0" : "opacity-100"
          }`}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-8 py-6 text-foreground shadow-modal dark:shadow-modal-dark">
          <Spinner size="lg" className="text-primary" />
          <span>Loading task…</span>
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
      className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out dark:bg-black/55 md:pt-12 ${exiting ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-modal transition-all duration-200 ease-out dark:shadow-modal-dark md:flex-row ${exiting ? "translate-y-1 scale-[0.98] opacity-0" : "translate-y-0 scale-100 opacity-100"
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

          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor={`task-due-${taskId}`}>
                Due date
              </label>
              <input
                id={`task-due-${taskId}`}
                type="date"
                value={dueDateEdit}
                disabled={saving}
                onChange={(e) => setDueDateEdit(e.target.value)}
                onBlur={() => void saveDueDate()}
                className="rounded-lg border border-border bg-muted px-2 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-400/40 disabled:opacity-50"
              />
              {(dueDateEdit || task.due_date) && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void clearDueDate()}
                  className="text-xs font-medium text-muted-foreground underline decoration-border hover:text-foreground disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {task.labels?.map((lb) => (
                <span
                  key={lb.id}
                  className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: lb.color }}
                >
                  {lb.name}
                </span>
              ))}
            </div>
          </div>

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
                aria-busy={saving}
                onClick={() => saveMeta({ closeAfter: true })}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving && <Spinner size="sm" className="text-white" />}
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitleEdit(task.title);
                  setDescEdit(task.description ?? "");
                  setDueDateEdit(task.due_date ?? "");
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
                  className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
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
                    aria-busy={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                  >
                    {saving && <Spinner size="sm" className="text-background" />}
                    Post
                  </button>
                </form>
              </div>
            )}
            {tab === "activity" && (
              <div className="space-y-3">
                {activityLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner size="sm" />
                    Loading activity…
                  </div>
                )}
                {!activityLoading && activity.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No activity yet for this task. Comments, edits, moves, and uploads will show up here.
                  </p>
                )}
                {!activityLoading &&
                  activity.map((row) => (
                    <div key={row.id} className="flex gap-3 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-200 text-[10px] font-bold text-violet-800">
                        {userInitials(row.user?.name ?? "?")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                          <span className="text-sm font-semibold text-foreground">{row.user?.name}</span>
                          <span className="text-xs capitalize text-brand-600">{row.action}</span>
                          <span className="text-xs text-muted-foreground">{formatAgo(row.created_at)}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{row.detail}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            {tab === "files" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    disabled={fileBusy}
                    onChange={(e) => void uploadAttachment(e.target.files)}
                  />
                  <button
                    type="button"
                    disabled={fileBusy}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    {fileBusy ? <Spinner size="sm" /> : null}
                    Upload file
                  </button>
                  <span className="text-xs text-muted-foreground">Max 25MB per file.</span>
                </div>
                <ul className="space-y-2">
                  {(task.attachments ?? []).length === 0 && (
                    <li className="text-sm text-muted-foreground">No files yet.</li>
                  )}
                  {(task.attachments ?? []).map((att) => (
                    <li
                      key={att.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{att.original_filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {(att.size_bytes / 1024).toFixed(1)} KB · {att.user?.name ?? "User"}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => void downloadAttachment(att)}
                          className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-card"
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteAttachment(att)}
                          disabled={fileBusy}
                          className="rounded-lg border border-red-500/30 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-500/10 dark:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {tab === "ai" && (
              <p className="text-sm text-muted-foreground">
                AI suggestions for this task are not enabled in this build.
              </p>
            )}
          </div>
        </div>

        <aside className="w-full shrink-0 border-t border-border bg-muted/50 p-6 md:w-72 md:border-l md:border-t-0">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checklist</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Add items and tick them off. Edit a line by changing the text and clicking away.
          </p>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium text-foreground">
              {doneC}/{totalC}
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
          </div>
          {!checklist && (
            <div className="mb-4 rounded-lg border border-dashed border-border bg-card/60 px-3 py-3 text-center">
              <p className="mb-2 text-xs text-muted-foreground">No checklist on this task yet.</p>
              <button
                type="button"
                disabled={checklistBusy}
                onClick={() => void addChecklist()}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {checklistBusy ? "Working…" : "Start checklist"}
              </button>
            </div>
          )}
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={it.done}
                  disabled={checklistBusy}
                  onChange={() => toggleItem(it.id, it.done)}
                  className="mt-1 rounded border-border text-brand-600 focus:ring-brand-500"
                />
                <input
                  key={`${it.id}-${it.title}`}
                  type="text"
                  defaultValue={it.title}
                  disabled={checklistBusy}
                  aria-label="Checklist item title"
                  onBlur={(e) => void updateChecklistItemTitle(it.id, it.title, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  className={`min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-400/30 ${it.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                />
              </li>
            ))}
          </ul>
          <form onSubmit={submitNewChecklistItem} className="mt-3 flex flex-col gap-2">
            <input
              value={newChecklistItemTitle}
              onChange={(e) => setNewChecklistItemTitle(e.target.value)}
              placeholder="New checklist item…"
              disabled={checklistBusy}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-400/40"
            />
            <button
              type="submit"
              disabled={checklistBusy || !newChecklistItemTitle.trim()}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              {checklistBusy ? "Saving…" : "Add item"}
            </button>
          </form>

          <h3 className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Labels</h3>
          <p className="mb-2 text-xs text-muted-foreground">Toggle board labels on this card or create a new one.</p>
          <ul className="mb-3 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-card/80 p-2">
            {boardLabels.map((lb) => {
              const on = (task.labels ?? []).some((l) => l.id === lb.id);
              return (
                <li key={lb.id}>
                  <button
                    type="button"
                    disabled={labelBusyId === lb.id || saving}
                    onClick={() => void toggleTaskLabel(lb.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-muted ${on ? "ring-2 ring-brand-400/40" : ""}`}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-white/30"
                      style={{ backgroundColor: lb.color }}
                    />
                    <span className="flex-1 truncate font-medium text-foreground">{lb.name}</span>
                    {on && <span className="text-xs text-brand-600">On</span>}
                  </button>
                </li>
              );
            })}
            {boardLabels.length === 0 && (
              <li className="px-2 py-2 text-xs text-muted-foreground">No labels on this board yet — add one below.</li>
            )}
          </ul>
          <form onSubmit={addBoardLabelToTask} className="flex flex-col gap-2">
            <input
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="New label name"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-400/40"
            />
            <button
              type="submit"
              disabled={newLabelBusy || !newLabelName.trim()}
              className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {newLabelBusy ? "Adding…" : "Create & apply label"}
            </button>
          </form>

          {canDelete && (
            <button
              type="button"
              onClick={removeTask}
              className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2 text-sm font-medium text-red-700 hover:bg-red-500/15 dark:text-red-300"
            >
              Delete task
            </button>
          )}
        </aside>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
