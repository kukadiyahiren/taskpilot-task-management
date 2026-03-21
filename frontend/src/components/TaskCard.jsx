import { forwardRef } from "react";
import { columnStripe, priorityDot } from "../lib/priority.js";
import { formatHours } from "../lib/workloadHours.js";
import { cn } from "../lib/utils.js";

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const TaskCard = forwardRef(function TaskCard(
  { task, columnAccent, onOpen, isDragging, className, ...rest },
  ref
) {
  const pct =
    task.checklist_total > 0 ? Math.round((task.checklist_done / task.checklist_total) * 100) : 0;

  const {
    className: rbdClassName,
    style,
    onClick: rbdOnClick,
    onKeyDown: rbdOnKeyDown,
    ...rbdRest
  } = rest;

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      style={style}
      onClick={(e) => {
        rbdOnClick?.(e);
        if (!e.defaultPrevented) onOpen(task.id);
      }}
      onKeyDown={(e) => {
        rbdOnKeyDown?.(e);
        if (!e.defaultPrevented && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(task.id);
        }
      }}
      className={cn(
        "group relative w-full cursor-grab rounded-xl border border-border bg-card p-3 text-left text-card-foreground shadow-card transition-colors duration-200 hover:border-primary/30 hover:shadow-md active:cursor-grabbing dark:shadow-card-dark",
        isDragging && "dragging-task",
        className,
        rbdClassName
      )}
      {...rbdRest}
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
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priorityDot[task.priority] || "bg-muted-foreground/40"}`} />
        <span className="font-display text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
          {task.title}
        </span>
      </div>
      {task.checklist_total > 0 && (
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
            <span>
              {task.checklist_done}/{task.checklist_total}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      {(task.estimate_hours != null && task.estimate_hours > 0) || Number(task.logged_hours) > 0 ? (
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
            <span title="Time logged / Original estimate">Workload</span>
            {task.estimate_hours != null && task.estimate_hours > 0 ? (
              <span className="tabular-nums">
                {formatHours(task.logged_hours)} / {formatHours(task.estimate_hours)}
              </span>
            ) : (
              <span className="tabular-nums">{formatHours(task.logged_hours)} logged</span>
            )}
          </div>
          {task.estimate_hours != null && task.estimate_hours > 0 ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${Number(task.logged_hours || 0) > task.estimate_hours ? "bg-red-500" : "bg-violet-500"}`}
                style={{
                  width: `${Math.min(100, (Number(task.logged_hours || 0) / task.estimate_hours) * 100)}%`,
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center justify-between border-t border-border pt-2">
        <div className="flex -space-x-2">
          {task.assignees?.slice(0, 3).map((u) => (
            <span
              key={u.id}
              title={u.name}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-gradient-to-br from-violet-400 to-brand-600 text-[10px] font-bold text-white"
            >
              {initials(u.name)}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {task.due_date && <span>{task.due_date.slice(5).replace("-", " ")}</span>}
          <span className="flex items-center gap-0.5" title="Comments">
            💬 {task.comment_count ?? 0}
          </span>
          <span className="flex items-center gap-0.5" title="Attachments">
            📎 {task.attachment_count ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
});

export default TaskCard;
