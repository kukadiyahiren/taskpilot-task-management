/**
 * Demo assistant: rule-based answers from live board + dashboard stats (no external LLM).
 * @param {string} userMessage
 * @param {object | null} board
 * @param {object | null} stats
 */
export function buildAssistantReply(userMessage, board, stats) {
  const q = userMessage.toLowerCase().trim();

  if (!board?.lists) {
    return "I couldn’t load your board. Check that the API is running, then open Task board once and come back.";
  }

  const lists = board.lists;
  const total = lists.reduce((n, l) => n + (l.tasks?.length ?? 0), 0);
  const byList = lists.map((l) => `${l.name}: ${l.tasks?.length ?? 0}`).join(" · ");

  if (q.includes("how many") || q.includes("count") || (q.includes("task") && q.includes("?"))) {
    return `${board.name} has ${total} tasks right now. Breakdown: ${byList}.`;
  }

  if (q.includes("column") || q.includes("list") || q.includes("kanban") || q.includes("swimlane")) {
    return `Columns: ${lists.map((l) => l.name).join(", ")}. Drag cards between columns on the board—each drop saves to the server.`;
  }

  if (q.includes("overdue") || q.includes("late")) {
    const o = stats?.overdue_tasks;
    if (typeof o === "number") {
      return `Dashboard stats show ${o} overdue task(s). Open Dashboard for charts, or scan the board for red / urgent priorities.`;
    }
    return "Open the Dashboard for overdue counts and trends.";
  }

  if (q.includes("meeting")) {
    return "Meetings for this workspace live under Team → Meetings. Notes from calls can become tasks on the board.";
  }

  if (q.includes("assign") || q.includes("member") || q.includes("team")) {
    return "Open any task, then use Assignees to add teammates. Team → Members lists everyone. Board → Add teammate creates a new login.";
  }

  if (q.includes("help") || q.includes("what can")) {
    return "Try: How many tasks? · What columns? · Overdue? · Assignees? I use your live board data (demo mode, no ChatGPT).";
  }

  if (q.includes("ai") || q.includes("gpt") || q.includes("model")) {
    return "This assistant is rule-based for the demo. Plug in an LLM API later and replace the reply logic in aiAssistantReplies.js.";
  }

  return `${board.name} has ${total} tasks (${byList}). Ask how many tasks, about columns, overdue work, or say help.`;
}
