"use client";

import { useState } from "react";
import Link from "next/link";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { TaskForm } from "@/components/tasks/TaskForm";
import { SlideOver } from "@/components/common/SlideOver";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatFullName } from "@/lib/format";
import { Plus, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export function TasksClient() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const filters = {
    ...(statusFilter !== "active" && statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(priorityFilter !== "all" ? { priority: priorityFilter } : {}),
  };

  const { data, isLoading } = useTasks(filters);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // client-side active filter (OPEN + IN_PROGRESS)
  const tasks = (data?.items ?? []).filter((t) => {
    if (statusFilter === "active") return t.status === "OPEN" || t.status === "IN_PROGRESS";
    if (statusFilter === "all") return true;
    return t.status === statusFilter;
  });

  async function handleCreate(values: { title: string; description?: string; priority: string; dueDate?: string }) {
    await createTask.mutateAsync(values);
    toast.success("Task created");
    setOpen(false);
  }

  async function handleToggle(id: string, currentStatus: string) {
    const next = currentStatus === "DONE" ? "OPEN" : "DONE";
    await updateTask.mutateAsync({ id, status: next });
    toast.success(next === "DONE" ? "Task completed ✓" : "Task reopened");
  }

  async function handleDelete(id: string) {
    await deleteTask.mutateAsync(id);
    toast.success("Task deleted");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground text-sm">
            {data?.meta.total ?? 0} total tasks assigned to you
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task list */}
      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading tasks…</p>
      )}

      {!isLoading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No tasks here</p>
          <p className="text-sm text-muted-foreground mt-1">
            {statusFilter === "active"
              ? "You're all caught up! Create a new task to get started."
              : "No tasks match the current filter."}
          </p>
        </div>
      )}

      {tasks.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {tasks.map((task) => {
            const isDone = task.status === "DONE" || task.status === "CANCELLED";
            return (
              <li key={task.id} className="flex items-start gap-3 px-4 py-3">
                <button
                  onClick={() => handleToggle(task.id, task.status)}
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                  disabled={updateTask.isPending}
                  title={isDone ? "Reopen" : "Mark complete"}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", isDone && "line-through text-muted-foreground")}>
                    {task.title}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                    {task.contact && (
                      <Link
                        href={`/contacts/${task.contact.id}`}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        {formatFullName(task.contact.firstName, task.contact.lastName)}
                      </Link>
                    )}
                    {task.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        Due {formatDate(task.dueDate)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {STATUS_LABELS[task.status]}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={PRIORITY_VARIANT[task.priority] ?? "outline"}>
                    {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                  </Badge>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    disabled={deleteTask.isPending}
                    title="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <SlideOver open={open} onOpenChange={setOpen} title="New Task">
        <TaskForm onSubmit={handleCreate} isPending={createTask.isPending} />
      </SlideOver>
    </div>
  );
}
