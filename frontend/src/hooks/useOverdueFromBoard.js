import { useMemo } from "react";

export function useOverdueFromBoard(board) {
  return useMemo(() => {
    if (!board?.lists) return [];
    const today = new Date().toISOString().slice(0, 10);
    const tasks = board.lists.flatMap((c) =>
      c.tasks.map((t) => ({ ...t, column: c.name, boardName: board.name }))
    );
    return tasks
      .filter((t) => t.due_date && t.due_date < today)
      .sort((a, b) => (a.due_date < b.due_date ? -1 : 1));
  }, [board]);
}
