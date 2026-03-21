import { Draggable, Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard.jsx";

const accentBorder = {
  blue: "border-t-blue-500",
  orange: "border-t-orange-500",
  purple: "border-t-violet-500",
  green: "border-t-emerald-500",
};

export default function KanbanColumn({ column, onOpenTask }) {
  const border = accentBorder[column.accent] || "border-t-brand-500";

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-2xl border border-slate-200/90 bg-slate-100/80 shadow-sm">
      <div className={`border-t-4 ${border} rounded-t-2xl px-4 pb-2 pt-3`}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-slate-800">{column.name}</h2>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 tabular-nums">
            {column.tasks?.length ?? 0}
          </span>
        </div>
      </div>
      <Droppable droppableId={String(column.id)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex min-h-[200px] flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3 ${
              snapshot.isDraggingOver ? "bg-brand-50/50" : ""
            }`}
          >
            {column.tasks?.map((task, index) => (
              <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={dragSnapshot.isDragging ? "dragging-task" : ""}
                  >
                    <TaskCard task={task} columnAccent={column.accent} onOpen={onOpenTask} />
                  </div>
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
