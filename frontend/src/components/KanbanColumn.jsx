import { Draggable, Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard.jsx";

const accentBorder = {
  blue: "border-t-blue-500",
  orange: "border-t-orange-500",
  purple: "border-t-violet-500",
  green: "border-t-emerald-500",
};

export default function KanbanColumn({ column, onOpenTask, isDragDisabled = false, taskCount }) {
  const border = accentBorder[column.accent] || "border-t-brand-500";
  const headerCount = taskCount ?? column.tasks?.length ?? 0;

  return (
    <div className="flex h-full min-h-0 w-72 shrink-0 flex-col rounded-2xl border border-border bg-muted/80 shadow-sm">
      <div className={`border-t-4 ${border} shrink-0 rounded-t-2xl px-4 pb-2 pt-3`}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-foreground">{column.name}</h2>
          <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
            {headerCount}
          </span>
        </div>
      </div>
      <Droppable droppableId={String(column.id)} isDropDisabled={isDragDisabled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex min-h-[min(12rem,40vh)] flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-3 pb-3 ${
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
    </div>
  );
}
