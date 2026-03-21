import { useRef } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Spinner } from "./ui/spinner.jsx";
import TaskCard from "./TaskCard.jsx";

const accentBorder = {
  blue: "border-t-blue-500",
  orange: "border-t-orange-500",
  purple: "border-t-violet-500",
  green: "border-t-emerald-500",
};

export default function KanbanColumn({
  column,
  onOpenTask,
  isDragDisabled = false,
  taskCount,
  onAddTask,
  addTaskBusy = false,
  columnDragHandleProps,
  isColumnDragDisabled = false,
  onRenameList,
  renameDisabled = false,
  onDeleteList,
  canDeleteList = false,
  deleteDisabled = false,
}) {
  const titleRef = useRef(null);
  const border = accentBorder[column.accent] || "border-t-brand-500";
  const headerCount = taskCount ?? column.tasks?.length ?? 0;
  const showColumnHandle = Boolean(columnDragHandleProps) && !isColumnDragDisabled;

  const commitColumnTitle = () => {
    const el = titleRef.current;
    if (!el || !onRenameList || renameDisabled) return;
    const next = el.value.trim();
    if (!next) {
      el.value = column.name;
      return;
    }
    if (next === column.name) return;
    void onRenameList(column.id, next);
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-muted/80 shadow-sm">
      <div className={`border-t-4 ${border} shrink-0 rounded-t-2xl px-4 pb-2 pt-3`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg py-0.5">
            {showColumnHandle ? (
              <div
                {...(columnDragHandleProps ?? {})}
                aria-label="Drag column"
                className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md border border-transparent text-muted-foreground/70 hover:bg-muted/80 active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4" aria-hidden />
              </div>
            ) : null}
            {onRenameList ? (
              <input
                ref={titleRef}
                key={`${column.id}-${column.name}`}
                type="text"
                defaultValue={column.name}
                disabled={renameDisabled}
                aria-label="Column name"
                title="Click to rename"
                onBlur={() => commitColumnTitle()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    e.currentTarget.value = column.name;
                    e.currentTarget.blur();
                  }
                }}
                className="min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-1 py-0.5 font-display text-sm font-semibold text-foreground outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-400/30 disabled:opacity-60"
              />
            ) : (
              <h2 className="truncate font-display text-sm font-semibold text-foreground">{column.name}</h2>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {onAddTask && (
              <button
                type="button"
                onClick={() => onAddTask(column.id)}
                disabled={addTaskBusy}
                aria-label={`Add task to ${column.name}`}
                title="Add task"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition hover:border-brand-400/50 hover:bg-primary/10 hover:text-brand-700 disabled:opacity-50 dark:hover:text-brand-300"
              >
                {addTaskBusy ? <Spinner size="sm" /> : <Plus className="h-4 w-4" aria-hidden />}
              </button>
            )}
            <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
              {headerCount}
            </span>
            {canDeleteList && onDeleteList ? (
              <button
                type="button"
                disabled={deleteDisabled}
                onClick={() => onDeleteList(column.id, column.name)}
                aria-label={`Delete column ${column.name}`}
                title="Delete column"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border border-red-500/25 bg-card text-red-600 shadow-sm transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <Droppable droppableId={String(column.id)} type="TASK" isDropDisabled={isDragDisabled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex min-h-[min(10rem,36vh)] flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-3 pt-1 ${
              snapshot.isDraggingOver
                ? "bg-primary/10 ring-1 ring-inset ring-primary/25 dark:bg-primary/15 dark:ring-primary/30"
                : ""
            }`}
          >
            {column.tasks?.map((task, index) => (
              <Draggable
                key={task.id}
                draggableId={String(task.id)}
                index={index}
                isDragDisabled={isDragDisabled}
              >
                {(dragProvided, dragSnapshot) => (
                  <TaskCard
                    ref={dragProvided.innerRef}
                    task={task}
                    columnAccent={column.accent}
                    onOpen={onOpenTask}
                    isDragging={dragSnapshot.isDragging}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      {onAddTask && (
        <div className="shrink-0 px-3 pb-3 pt-1">
          <button
            type="button"
            onClick={() => onAddTask(column.id)}
            disabled={addTaskBusy}
            aria-busy={addTaskBusy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/60 py-2.5 text-sm font-medium text-muted-foreground transition hover:border-brand-400/50 hover:bg-primary/5 hover:text-brand-700 disabled:opacity-50 dark:hover:text-brand-300"
          >
            {addTaskBusy ? <Spinner size="sm" /> : <Plus className="h-4 w-4" aria-hidden />}
            Add task
          </button>
        </div>
      )}
    </div>
  );
}
