import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Layout from "../components/Layout.jsx";
import KanbanColumn from "../components/KanbanColumn.jsx";
import TaskModal from "../components/TaskModal.jsx";
import { api } from "../api/client.js";
import { DEFAULT_BOARD_ID } from "../constants.js";
import { downloadBoardExport } from "../lib/downloadBoardExport.js";
import { registerTeammate } from "../lib/registerTeammate.js";
import { useBoardStore } from "../store/boardStore.js";

const LIST_ACCENTS = ["blue", "orange", "purple", "green"];
const POLL_MS = 4000;

function filterTasksByMember(tasks, memberId) {
  if (!memberId) return tasks;
  return tasks.filter((t) => t.assignees?.some((a) => String(a.id) === memberId));
}

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function BoardPage() {
  const boardId = DEFAULT_BOARD_ID;
  const { board, loading, error, loadBoard, selectedTaskId, openTask, closeTask, moveTaskLocal } = useBoardStore();
  const [saving, setSaving] = useState(false);
  const draggingRef = useRef(false);

  const [teamUsers, setTeamUsers] = useState([]);
  const [memberFilter, setMemberFilter] = useState("");

  const [addListOpen, setAddListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [addListBusy, setAddListBusy] = useState(false);
  const [addListError, setAddListError] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  const [exportBusy, setExportBusy] = useState(false);
  const [exportErr, setExportErr] = useState("");

  useEffect(() => {
    loadBoard(boardId);
  }, [boardId, loadBoard]);

  useEffect(() => {
    api
      .get("/users")
      .then(setTeamUsers)
      .catch(() => setTeamUsers([]));
  }, []);

  const refreshUsers = useCallback(() => {
    api
      .get("/users")
      .then(setTeamUsers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible" || draggingRef.current) return;
      loadBoard(boardId);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [boardId, loadBoard]);

  const onDragEnd = useCallback(
    async (result) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      const taskId = Number(draggableId);
      const listId = Number(destination.droppableId);
      const position = destination.index;

      moveTaskLocal(taskId, listId, position);
      setSaving(true);
      try {
        await api.patch(`/tasks/${taskId}/move`, {
          list_id: listId,
          position,
        });
        await loadBoard(boardId);
      } catch {
        await loadBoard(boardId);
      } finally {
        setSaving(false);
      }
    },
    [boardId, loadBoard, moveTaskLocal]
  );

  const handleNewTask = async () => {
    if (!board?.lists?.length) return;
    const listId = board.lists[0].id;
    try {
      const created = await api.post("/tasks", {
        title: "New task",
        list_id: listId,
        priority: "medium",
      });
      await loadBoard(boardId);
      openTask(created.id);
    } catch (e) {
      console.error(e);
    }
  };

  async function submitNewList(e) {
    e.preventDefault();
    setAddListError("");
    const name = newListName.trim() || "New list";
    setAddListBusy(true);
    try {
      const n = board?.lists?.length ?? 0;
      await api.post(`/boards/${boardId}/lists`, {
        name,
        accent: LIST_ACCENTS[n % LIST_ACCENTS.length],
      });
      setNewListName("");
      setAddListOpen(false);
      await loadBoard(boardId);
    } catch (err) {
      setAddListError(err.message || "Could not add list");
    } finally {
      setAddListBusy(false);
    }
  }

  async function handleExport(fmt) {
    setExportErr("");
    setExportBusy(true);
    try {
      await downloadBoardExport(boardId, fmt);
    } catch (err) {
      setExportErr(err?.message || "Export failed");
    } finally {
      setExportBusy(false);
    }
  }

  async function submitInvite(e) {
    e.preventDefault();
    setInviteMsg("");
    setInviteBusy(true);
    try {
      await registerTeammate({
        name: inviteName,
        email: inviteEmail,
        password: invitePassword,
      });
      setInviteMsg("Teammate added. They can sign in with that email.");
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("");
      refreshUsers();
    } catch (err) {
      setInviteMsg(err.message || "Could not add teammate");
    } finally {
      setInviteBusy(false);
    }
  }

  const listsForDisplay = useMemo(() => {
    if (!board?.lists) return [];
    return board.lists.map((col) => ({
      ...col,
      tasks: filterTasksByMember(col.tasks ?? [], memberFilter),
    }));
  }, [board?.lists, memberFilter]);

  return (
    <Layout onNewTask={handleNewTask}>
      <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-slate-50 to-slate-100/80">
        <div className="border-b border-border bg-card/60 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Sprint</p>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {loading ? "Loading…" : board?.name ?? "Board"}
              </h1>
              {board?.sprint_end && (
                <p className="mt-1 text-sm text-muted-foreground">Ends {board.sprint_end}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 sm:items-end">
              <div className="flex flex-wrap items-center gap-2">
              {saving && <span className="text-xs text-muted-foreground/70">Saving…</span>}
              {exportBusy && <span className="text-xs text-muted-foreground/70">Exporting…</span>}
              <button
                type="button"
                disabled={exportBusy}
                onClick={() => void handleExport("csv")}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-muted disabled:opacity-50"
              >
                Export CSV
              </button>
              <button
                type="button"
                disabled={exportBusy}
                onClick={() => void handleExport("xlsx")}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-muted disabled:opacity-50"
              >
                Excel
              </button>
              <button
                type="button"
                onClick={() => setInviteOpen((o) => !o)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
              >
                {inviteOpen ? "Close invite" : "Add teammate"}
              </button>
              <div className="flex -space-x-2" title="Workspace members">
                {teamUsers.slice(0, 6).map((u) => (
                  <span
                    key={u.id}
                    title={u.name}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-violet-400 to-brand-600 text-[10px] font-bold text-white"
                  >
                    {initials(u.name)}
                  </span>
                ))}
              </div>
              </div>
              {exportErr && <p className="text-xs text-red-600">{exportErr}</p>}
            </div>
          </div>

          {inviteOpen && (
            <form
              onSubmit={submitInvite}
              className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4"
            >
              <div>
                <label className="mb-0.5 block text-[10px] font-bold uppercase text-muted-foreground">Name</label>
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  placeholder="Alex Lee"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-bold uppercase text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  placeholder="alex@company.com"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-bold uppercase text-muted-foreground">Password</label>
                <input
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  required
                  minLength={6}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  placeholder="≥ 6 characters"
                />
              </div>
              <button
                type="submit"
                disabled={inviteBusy}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {inviteBusy ? "Adding…" : "Create account"}
              </button>
              {inviteMsg && (
                <p className="w-full text-sm text-foreground" role="status">
                  {inviteMsg}
                </p>
              )}
            </form>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              type="search"
              placeholder="Search cards…"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400/40"
            />
            <select className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              <option>All priorities</option>
            </select>
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground"
            >
              <option value="">All members</option>
              {teamUsers.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name}
                </option>
              ))}
            </select>
            {memberFilter && (
              <p className="w-full text-xs text-amber-800">
                Filtering by assignee — drag-and-drop is paused until you clear the filter.
              </p>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden p-6">
          {error && <p className="text-red-600">{error}</p>}
          {!loading && board && (
            <DragDropContext
              onDragStart={() => {
                draggingRef.current = true;
              }}
              onDragEnd={(r) => {
                draggingRef.current = false;
                onDragEnd(r);
              }}
            >
              <div className="flex h-full min-h-0 items-stretch gap-4 pb-4">
                {board.lists.map((col, idx) => (
                  <KanbanColumn
                    key={col.id}
                    column={listsForDisplay[idx]}
                    taskCount={col.tasks?.length ?? 0}
                    isDragDisabled={Boolean(memberFilter)}
                    onOpenTask={openTask}
                  />
                ))}
                <div className="flex w-72 shrink-0 flex-col gap-2">
                  {!addListOpen ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAddListError("");
                        setAddListOpen(true);
                      }}
                      className="flex h-12 min-h-[3rem] w-full items-center justify-center rounded-2xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-brand-300 hover:text-brand-600"
                    >
                      + Add another list
                    </button>
                  ) : (
                    <form
                      onSubmit={submitNewList}
                      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                    >
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        New column
                      </p>
                      <input
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="List name"
                        className="mb-2 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400/40"
                        autoFocus
                      />
                      {addListError && <p className="mb-2 text-xs text-red-600">{addListError}</p>}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={addListBusy}
                          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                          {addListBusy ? "Adding…" : "Add list"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddListOpen(false);
                            setNewListName("");
                            setAddListError("");
                          }}
                          className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </DragDropContext>
          )}
        </div>
      </div>

      {selectedTaskId != null && (
        <TaskModal taskId={selectedTaskId} boardId={boardId} onClose={closeTask} />
      )}
    </Layout>
  );
}
