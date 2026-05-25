"use client";

import Link from "next/link";
import { formatDate, formatFullName } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

interface TaskItem {
  id: string;
  title: string;
  dueDate: Date | string | null;
  priority: string;
  status: string;
  assignee?: { id: string; fullName: string | null } | null;
  contact?: { id: string; firstName: string; lastName: string | null } | null;
}

interface UpcomingTasksProps {
  tasks: TaskItem[];
}

const PRIORITY_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};


export function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No upcoming tasks.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => {
        const contactName = task.contact
          ? formatFullName(task.contact.firstName, task.contact.lastName)
          : null;

        return (
          <li
            key={task.id}
            className="flex items-start justify-between gap-3 rounded-md border px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug truncate">
                {task.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {contactName && (
                  <>
                    <Link
                      href={`/contacts/${task.contact!.id}`}
                      className="hover:underline"
                    >
                      {contactName}
                    </Link>
                    {task.assignee?.fullName ? " · " : ""}
                  </>
                )}
                {task.assignee?.fullName && (
                  <>{task.assignee.fullName}</>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={PRIORITY_VARIANT[task.priority] ?? "outline"}>
                {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
              </Badge>
              {task.dueDate && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(task.dueDate)}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
