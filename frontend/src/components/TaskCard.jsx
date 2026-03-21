import { columnStripe, priorityDot } from "../lib/priority";

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TaskCard({ task, columnAccent, onOpen }) {
  const pct =
    task.checklist_total > 0 ? Math.round((task.checklist_done / task.checklist_total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(task.id)}
      className="group relative w-full rounded-xl border border-slate-200/90 bg-white p-3 text-left shadow-card transition hover:border-brand-200 hover:shadow-md"
    >
      <div
        className={`pointer-events-none absolute right-0 top-0 h-16 w-1 rounded-l bg-gradient-to-b ${columnStripe[columnAccent] || "from-brand-500"} to-transparent opacity-90`}
      />
      <div className="mb-2 flex flex-wrap gap-1">
        {task.labels?.map((lb) => (
          <span
            key={lb.id}
            className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: lb.color }}
          >
            {lb.name}
          </span>
        ))}
      </div>
      <div className="mb-2 flex items-start gap-2">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priorityDot[task.priority] || "bg-slate-300"}`} />
        <span className="font-display text-sm font-semibold leading-snug text-slate-900 group-hover:text-brand-700">
          {task.title}
        </span>
      </div>
      {task.checklist_total > 0 && (
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-[11px] text-slate-500">
            <span>
              {task.checklist_done}/{task.checklist_total}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2">
        <div className="flex -space-x-2">
          {task.assignees?.slice(0, 3).map((u) => (
            <span
              key={u.id}
              title={u.name}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-violet-400 to-brand-600 text-[10px] font-bold text-white"
            >
              {initials(u.name)}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {task.due_date && <span>{task.due_date.slice(5).replace("-", " ")}</span>}
          <span className="flex items-center gap-0.5" title="Comments">
            💬 {task.comment_count ?? 0}
          </span>
          <span className="flex items-center gap-0.5" title="Attachments">
            📎 {task.attachment_count ?? 0}
          </span>
        </div>
      </div>
    </button>
  );
}
