import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  completedAt: string | null;
  contactId: string | null;
  assigneeId: string | null;
  contact?: { id: string; firstName: string; lastName: string | null } | null;
  assignee?: { id: string; fullName: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

interface TasksResponse {
  items: Task[];
  meta: { total: number };
}

interface TaskFilters {
  status?: string;
  priority?: string;
  contactId?: string;
}

// ─── All tasks (standalone page) ─────────────────────────────────────────────

export function useTasks(filters: TaskFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.contactId) params.set("contactId", filters.contactId);

  return useQuery<TasksResponse>({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return json.data;
    },
  });
}

// ─── Tasks for a specific contact ─────────────────────────────────────────────

export function useContactTasks(contactId: string) {
  return useQuery<Task[]>({
    queryKey: ["contacts", contactId, "tasks"],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${contactId}/tasks`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return json.data;
    },
  });
}

// ─── Create task on a contact ─────────────────────────────────────────────────

export function useCreateContactTask(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      priority?: string;
      dueDate?: string;
    }) => {
      const res = await fetch(`/api/contacts/${contactId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create task");
      }
      return (await res.json()).data as Task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts", contactId, "tasks"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// ─── Create task (standalone, no contact) ─────────────────────────────────────

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      priority?: string;
      dueDate?: string;
      contactId?: string;
    }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create task");
      }
      return (await res.json()).data as Task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// ─── Update task (status, title, etc.) ───────────────────────────────────────

export function useUpdateTask(opts?: { contactId?: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      status?: string;
      title?: string;
      description?: string;
      priority?: string;
      dueDate?: string | null;
    }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update task");
      }
      return (await res.json()).data as Task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (opts?.contactId) {
        qc.invalidateQueries({ queryKey: ["contacts", opts.contactId, "tasks"] });
      }
    },
  });
}

// ─── Delete task ──────────────────────────────────────────────────────────────

export function useDeleteTask(opts?: { contactId?: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (opts?.contactId) {
        qc.invalidateQueries({ queryKey: ["contacts", opts.contactId, "tasks"] });
      }
    },
  });
}
