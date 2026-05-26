"use client";

import { useState } from "react";
import { useContactTasks, useCreateContactTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { TaskForm } from "@/components/tasks/TaskForm";
import { SlideOver } from "@/components/common/SlideOver";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { Plus, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

interface ContactTasksPanelProps {
  contactId: string;
  initialTasks?: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: Date | string | null;
  }>;
}

export function ContactTasksPanel({ contactId, initialTasks = [] }: ContactTasksPanelProps) {
  const [open, setOpen] = useState(false);
  const { data: tasks, isLoading } = useContactTasks(contactId);
  const createTask = useCreateContactTask(contactId);
  const updateTask = useUpdateTask({ contactId });
  const deleteTask = useDeleteTask({ contactId });

  const displayTasks = tasks ?? initialTasks;

  async function handleCreate(values: { title: string; description?: string; priority: string; dueDate?: string }) {
    await createTask.mutateAsync(values);
    toast.success("Task created");
    setOpen(false);
  }

  async function handleToggle(id: string, currentStatus: string) {
    const next = currentStatus === "DONE" ? "OPEN" : "DONE";
    await updateTask.mutateAsync({ id, status: next });
    toast.success(next === "DONE" ? "Task completed" : "Task reopened");
  }

  async function handleDelete(id: string) {
    await deleteTask.mutateAsync(id);
    toast.success("Task deleted");
  }

  const open_ = displayTasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED");
  const done = displayTasks.filter((t) => t.status === "DONE" || t.status === "CANCELLED");

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">
          {open_.length} open{done.length > 0 ? `, ${done.length} done` : ""}
        </span>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Task
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && displayTasks.length === 0 && (
        <p className="text-sm text-muted-foreground">No tasks yet.</p>
      )}

      <ul className="space-y-1.5">
        {[...open_, ...done].map((task) => {
          const isDone = task.status === "DONE" || task.status === "CANCELLED";
          return (
            <li
              key={task.id}
              className="flex items-start gap-2 rounded-md border px-3 py-2"
            >
              <button
                onClick={() => handleToggle(task.id, task.status as string)}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                disabled={updateTask.isPending}
                title={isDone ? "Reopen" : "Mark complete"}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium leading-snug", isDone && "line-through text-muted-foreground")}>
                  {task.title}
                </p>
                {task.dueDate && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Due {formatDate(task.dueDate)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={PRIORITY_VARIANT[task.priority as string] ?? "outline"}>
                  {(task.priority as string).charAt(0) + (task.priority as string).slice(1).toLowerCase()}
                </Badge>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  disabled={deleteTask.isPending}
                  title="Delete task"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <SlideOver open={open} onOpenChange={setOpen} title="Add Task">
        <TaskForm
          onSubmit={handleCreate}
          isPending={createTask.isPending}
        />
      </SlideOver>
    </div>
  );
}
