import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import Layout from "../components/Layout.jsx";
import KanbanColumn from "../components/KanbanColumn.jsx";
import TaskModal from "../components/TaskModal.jsx";
import { Spinner } from "../components/ui/spinner.jsx";
import { api } from "../api/client.js";
import { DEFAULT_BOARD_ID } from "../constants.js";
import { downloadBoardExport } from "../lib/downloadBoardExport.js";
import { registerTeammate } from "../lib/registerTeammate.js";
import { useBoardWebSocket } from "../hooks/useBoardWebSocket.js";
import { useBoardStore } from "../store/boardStore.js";

const LIST_ACCENTS = ["blue", "orange", "purple", "green"];

function filterTasksByMember(tasks, memberId) {
  if (!memberId) return tasks;
  return tasks.filter((t) => t.assignees?.some((a) => String(a.id) === memberId));
}

function filterTasksBySearch(tasks, query) {
  const q = query.trim().toLowerCase();
  if (!q) return tasks;
  return tasks.filter((t) => {
    if ((t.title ?? "").toLowerCase().includes(q)) return true;
    return (t.labels ?? []).some((lb) => (lb.name ?? "").toLowerCase().includes(q));
  });
}

function filterTasksByPriority(tasks, priority) {
  if (!priority) return tasks;
  return tasks.filter((t) => t.priority === priority);
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
  const { board, loading, error, loadBoard, selectedTaskId, openTask, closeTask, moveTaskLocal, reorderListsLocal } =
    useBoardStore();
  const [saving, setSaving] = useState(false);
  const draggingRef = useRef(false);

  const [teamUsers, setTeamUsers] = useState([]);
  const [memberFilter, setMemberFilter] = useState("");
  const [cardSearch, setCardSearch] = useState("");
  /** "", or urgent | high | medium | low */
  const [priorityFilter, setPriorityFilter] = useState("");

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
  const [newTaskBusy, setNewTaskBusy] = useState(false);
  /** Which list is currently creating a task (column + header New task share this) */
  const [addingListId, setAddingListId] = useState(null);

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

  useBoardWebSocket(boardId, { loadBoard, draggingRef, enabled: true });

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && !draggingRef.current) void loadBoard(boardId);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [boardId, loadBoard]);

  const onDragEnd = useCallback(
    async (result) => {
      const { destination, source, draggableId, type } = result;
      if (!destination) return;

      if (type === "COLUMN") {
        if (destination.droppableId !== "board-columns") return;
        if (source.index === destination.index) return;
        let destIndex = destination.index;
        if (destIndex === 0 && source.index !== 0) destIndex = 1;
        if (source.index === destIndex) return;

        reorderListsLocal(source.index, destIndex);
        setSaving(true);
        try {
          const nextOrder = useBoardStore.getState().board?.lists?.map((l) => l.id) ?? [];
          await api.post(`/boards/${boardId}/lists/reorder`, {
            list_ids_in_order: nextOrder,
          });
          await loadBoard(boardId);
        } catch {
          await loadBoard(boardId);
        } finally {
          setSaving(false);
        }
        return;
      }

      if (type !== "TASK") return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      const taskId = Number(draggableId);
      if (Number.isNaN(taskId)) return;
      const listId = Number(destination.droppableId);
      if (Number.isNaN(listId)) return;
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
    [boardId, loadBoard, moveTaskLocal, reorderListsLocal]
  );

  const handleAddTaskToList = useCallback(
    async (listId) => {
      if (listId == null) return;
      setAddingListId(listId);
      setNewTaskBusy(true);
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
      } finally {
        setAddingListId(null);
        setNewTaskBusy(false);
      }
    },
    [boardId, loadBoard, openTask]
  );

  const handleNewTask = useCallback(() => {
    if (!board?.lists?.length) return;
    void handleAddTaskToList(board.lists[0].id);
  }, [board?.lists, handleAddTaskToList]);

  const handleRenameList = useCallback(
    async (listId, name) => {
      setSaving(true);
      try {
        await api.patch(`/boards/lists/${listId}`, { name });
        await loadBoard(boardId);
      } catch (e) {
        console.error(e);
        await loadBoard(boardId);
      } finally {
        setSaving(false);
      }
    },
    [boardId, loadBoard]
  );

  const handleDeleteList = useCallback(
    async (listId, listName) => {
      const n = listName || "this column";
      if (
        !confirm(
          `Delete “${n}”? Any tasks in this column will move to the first column.`
        )
      ) {
        return;
      }
      setSaving(true);
      try {
        await api.delete(`/boards/lists/${listId}`);
        await loadBoard(boardId);
      } catch (e) {
        console.error(e);
        alert(e?.message || "Could not delete column");
        await loadBoard(boardId);
      } finally {
        setSaving(false);
      }
    },
    [boardId, loadBoard]
  );

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

  const boardFiltersActive = Boolean(memberFilter) || Boolean(cardSearch.trim()) || Boolean(priorityFilter);

  const listsForDisplay = useMemo(() => {
    if (!board?.lists) return [];
    return board.lists.map((col) => {
      let tasks = col.tasks ?? [];
      tasks = filterTasksByMember(tasks, memberFilter);
      tasks = filterTasksBySearch(tasks, cardSearch);
      tasks = filterTasksByPriority(tasks, priorityFilter);
      return { ...col, tasks };
    });
  }, [board?.lists, memberFilter, cardSearch, priorityFilter]);

  return (
    <Layout
      onNewTask={handleNewTask}
      newTaskLoading={newTaskBusy}
      mainClassName="overflow-hidden"
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-background dark:to-background">
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
              {saving && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <Spinner size="sm" />
                  Saving…
                </span>
              )}
              <button
                type="button"
                disabled={exportBusy}
                aria-busy={exportBusy}
                onClick={() => void handleExport("csv")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-muted disabled:opacity-50"
              >
                {exportBusy && <Spinner size="sm" />}
                Export CSV
              </button>
              <button
                type="button"
                disabled={exportBusy}
                aria-busy={exportBusy}
                onClick={() => void handleExport("xlsx")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-muted disabled:opacity-50"
              >
                {exportBusy && <Spinner size="sm" />}
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
                aria-busy={inviteBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {inviteBusy && <Spinner size="sm" className="text-white" />}
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
              value={cardSearch}
              onChange={(e) => setCardSearch(e.target.value)}
              placeholder="Search cards…"
              aria-label="Search cards by title or label"
              className="min-w-[10rem] flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-400/40 sm:max-w-xs sm:flex-none"
            />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter by priority"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground"
            >
              <option value="">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              aria-label="Filter by assignee"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground"
            >
              <option value="">All members</option>
              {teamUsers.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name}
                </option>
              ))}
            </select>
            {boardFiltersActive && (
              <p className="w-full text-xs text-amber-800 dark:text-amber-200/90">
                Filters are on — moving tasks and columns is paused until you clear them.
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
                <Droppable droppableId="board-columns" type="COLUMN" direction="horizontal">
                  {(boardProvided) => (
                    <div
                      ref={boardProvided.innerRef}
                      {...boardProvided.droppableProps}
                      className="flex h-full min-h-0 items-stretch gap-4"
                    >
                      {board.lists.map((col, idx) => (
                        <Draggable
                          key={col.id}
                          draggableId={`list-${col.id}`}
                          index={idx}
                          isDragDisabled={idx === 0 || boardFiltersActive}
                        >
                          {(colProvided) => (
                            <div
                              ref={colProvided.innerRef}
                              {...colProvided.draggableProps}
                              className="flex h-full min-h-0 w-72 shrink-0 flex-col"
                            >
                              <KanbanColumn
                                column={listsForDisplay[idx]}
                                taskCount={listsForDisplay[idx]?.tasks?.length ?? 0}
                                isDragDisabled={boardFiltersActive}
                                isColumnDragDisabled={idx === 0 || boardFiltersActive}
                                columnDragHandleProps={idx === 0 ? undefined : colProvided.dragHandleProps}
                                onOpenTask={openTask}
                                onAddTask={handleAddTaskToList}
                                addTaskBusy={addingListId === col.id}
                                onRenameList={handleRenameList}
                                renameDisabled={saving}
                                onDeleteList={handleDeleteList}
                                canDeleteList={idx > 0 && (board?.lists?.length ?? 0) > 1}
                                deleteDisabled={saving}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {boardProvided.placeholder}
                    </div>
                  )}
                </Droppable>
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
                          aria-busy={addListBusy}
                          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                          {addListBusy && <Spinner size="sm" className="text-white" />}
                          {addListBusy ? "Adding…" : "Add list"}
                        </button>
                        <button
                          type="button"
                          disabled={addListBusy}
                          onClick={() => {
                            setAddListOpen(false);
                            setNewListName("");
                            setAddListError("");
                          }}
                          className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
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
