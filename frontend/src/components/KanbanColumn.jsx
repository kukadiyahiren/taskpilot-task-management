import { Draggable, Droppable } from "@hello-pangea/dnd";
import { GripVertical, Plus } from "lucide-react";
import { cn } from "../lib/utils.js";
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
}) {
  const border = accentBorder[column.accent] || "border-t-brand-500";
  const headerCount = taskCount ?? column.tasks?.length ?? 0;
  const showColumnHandle = Boolean(columnDragHandleProps) && !isColumnDragDisabled;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-muted/80 shadow-sm">
      <div className={`border-t-4 ${border} shrink-0 rounded-t-2xl px-4 pb-2 pt-3`}>
        <div className="flex items-center justify-between gap-2">
          <div
            {...(columnDragHandleProps ?? {})}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-1.5 rounded-lg py-0.5",
              showColumnHandle && "cursor-grab active:cursor-grabbing",
              !showColumnHandle && "cursor-default"
            )}
          >
            {showColumnHandle && (
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
            )}
            <h2 className="truncate font-display text-sm font-semibold text-foreground">{column.name}</h2>
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
