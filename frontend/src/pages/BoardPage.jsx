import { useCallback, useEffect, useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Layout from "../components/Layout.jsx";
import KanbanColumn from "../components/KanbanColumn.jsx";
import TaskModal from "../components/TaskModal.jsx";
import { api } from "../api/client.js";
import { DEFAULT_BOARD_ID } from "../constants.js";
import { useBoardStore } from "../store/boardStore.js";

export default function BoardPage() {
  const boardId = DEFAULT_BOARD_ID;
  const { board, loading, error, loadBoard, selectedTaskId, openTask, closeTask, moveTaskLocal } = useBoardStore();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBoard(boardId);
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
        await api.patch(`/tasks/${taskId}/move`, { list_id: listId, position });
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

  return (
    <Layout onNewTask={handleNewTask}>
      <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-slate-50 to-slate-100/80">
        <div className="border-b border-slate-200/80 bg-white/60 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Sprint</p>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                {loading ? "Loading…" : board?.name ?? "Board"}
              </h1>
              {board?.sprint_end && (
                <p className="mt-1 text-sm text-slate-500">Ends {board.sprint_end}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {saving && <span className="text-xs text-slate-400">Saving…</span>}
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-9 w-9 rounded-full border-2 border-white bg-gradient-to-br from-slate-300 to-slate-400"
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              type="search"
              placeholder="Search cards…"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400/40"
            />
            <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              <option>All priorities</option>
            </select>
            <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              <option>All members</option>
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto p-6">
          {error && <p className="text-red-600">{error}</p>}
          {!loading && board && (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex h-full gap-4 pb-4">
                {board.lists.map((col) => (
                  <KanbanColumn key={col.id} column={col} onOpenTask={openTask} />
                ))}
                <button
                  type="button"
                  className="flex h-12 w-72 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-500 hover:border-brand-300 hover:text-brand-600"
                >
                  + Add another list
                </button>
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
