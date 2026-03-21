import { create } from "zustand";
import { api } from "../api/client";

export const useBoardStore = create((set, get) => ({
  board: null,
  loading: false,
  error: null,
  selectedTaskId: null,

  loadBoard: async (boardId) => {
    set({ loading: true, error: null });
    try {
      const board = await api.get(`/boards/${boardId}`);
      set({ board, loading: false });
    } catch (e) {
      set({ error: String(e.message), loading: false });
    }
  },

  setBoard: (board) => set({ board }),

  patchTaskLocal: (taskId, patch) => {
    const { board } = get();
    if (!board) return;
    const lists = board.lists.map((col) => ({
      ...col,
      tasks: col.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    }));
    set({ board: { ...board, lists } });
  },

  /** Reorder board columns (first list stays first). Indices are 0-based in current `board.lists` order. */
  reorderListsLocal: (sourceIndex, destinationIndex) => {
    const { board } = get();
    if (!board?.lists?.length) return;
    let dest = destinationIndex;
    if (dest === 0 && sourceIndex !== 0) dest = 1;
    if (sourceIndex === dest) return;
    const firstId = board.lists[0].id;
    const lists = [...board.lists];
    const [removed] = lists.splice(sourceIndex, 1);
    lists.splice(dest, 0, removed);
    if (lists[0]?.id !== firstId) return;
    set({
      board: {
        ...board,
        lists: lists.map((l, i) => ({ ...l, position: i })),
      },
    });
  },

  moveTaskLocal: (taskId, destListId, destIndex) => {
    const { board } = get();
    if (!board) return;
    let moved = null;
    const lists = board.lists.map((col) => {
      const tasks = col.tasks.filter((t) => {
        if (t.id === taskId) {
          moved = { ...t, list_id: destListId };
          return false;
        }
        return true;
      });
      return { ...col, tasks };
    });
    if (!moved) return;
    const next = lists.map((col) => {
      if (col.id !== destListId) return col;
      const tasks = [...col.tasks];
      tasks.splice(destIndex, 0, moved);
      return { ...col, tasks: tasks.map((t, i) => ({ ...t, position: i })) };
    });
    set({ board: { ...board, lists: next } });
  },

  openTask: (id) => set({ selectedTaskId: id }),
  closeTask: () => set({ selectedTaskId: null }),

  refreshTaskInBoard: async (taskId) => {
    const { board } = get();
    if (!board) return;
    try {
      const full = await api.get(`/tasks/${taskId}`);
      const summary = {
        id: full.id,
        list_id: full.list_id,
        title: full.title,
        priority: full.priority,
        position: full.position,
        due_date: full.due_date,
        estimate_hours: full.estimate_hours,
        logged_hours: full.logged_hours,
        remaining_estimate_hours: full.remaining_estimate_hours,
        attachment_count: full.attachment_count,
        comment_count: full.comment_count,
        checklist_done: full.checklist_done,
        checklist_total: full.checklist_total,
        assignees: full.assignees,
        labels: full.labels,
      };
      const lists = board.lists.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) => (t.id === taskId ? summary : t)),
      }));
      set({ board: { ...board, lists } });
    } catch {
      /* ignore */
    }
  },
}));
