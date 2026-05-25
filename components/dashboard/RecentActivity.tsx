"use client";

import Link from "next/link";
import { formatRelativeTime, formatFullName } from "@/lib/format";
import {
  Mail,
  Phone,
  Users,
  FileText,
  CheckSquare,
  Activity,
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: string;
  subject: string;
  occurredAt: Date | string;
  contact?: { id: string; firstName: string; lastName: string | null } | null;
  createdBy?: { id: string; fullName: string | null } | null;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const TYPE_ICON: Record<string, React.ElementType> = {
  EMAIL: Mail,
  CALL: Phone,
  MEETING: Users,
  NOTE: FileText,
  TASK: CheckSquare,
  OTHER: Activity,
};

const TYPE_COLOR: Record<string, string> = {
  EMAIL: "bg-blue-100 text-blue-600",
  CALL: "bg-green-100 text-green-600",
  MEETING: "bg-purple-100 text-purple-600",
  NOTE: "bg-yellow-100 text-yellow-600",
  TASK: "bg-orange-100 text-orange-600",
  OTHER: "bg-gray-100 text-gray-600",
};

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No recent activity.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {activities.map((activity) => {
        const Icon = TYPE_ICON[activity.type] ?? Activity;
        const colorClass =
          TYPE_COLOR[activity.type] ?? "bg-gray-100 text-gray-600";
        const contactName = activity.contact
          ? formatFullName(
              activity.contact.firstName,
              activity.contact.lastName
            )
          : null;

        return (
          <li key={activity.id} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug truncate">
                {activity.subject}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {contactName && (
                  <>
                    <Link
                      href={`/contacts/${activity.contact!.id}`}
                      className="hover:underline"
                    >
                      {contactName}
                    </Link>
                    {" · "}
                  </>
                )}
                {activity.createdBy?.fullName && (
                  <>{activity.createdBy.fullName} · </>
                )}
                {formatRelativeTime(activity.occurredAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
