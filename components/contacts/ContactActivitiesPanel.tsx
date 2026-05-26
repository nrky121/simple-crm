"use client";

import { useState } from "react";
import { useContactActivities, useCreateActivity } from "@/hooks/useActivities";
import { ActivityForm } from "@/components/activities/ActivityForm";
import { SlideOver } from "@/components/common/SlideOver";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatRelativeTime } from "@/lib/format";
import { Plus, Mail, Phone, Users, FileText, CheckSquare, Activity } from "lucide-react";
import { toast } from "sonner";

const TYPE_ICON: Record<string, React.ElementType> = {
  EMAIL: Mail,
  CALL: Phone,
  MEETING: Users,
  NOTE: FileText,
  TASK: CheckSquare,
  OTHER: Activity,
};

const TYPE_LABEL: Record<string, string> = {
  EMAIL: "Email",
  CALL: "Call",
  MEETING: "Meeting",
  NOTE: "Note",
  TASK: "Task",
  OTHER: "Other",
};

const TYPE_COLOR: Record<string, string> = {
  EMAIL: "bg-blue-100 text-blue-600",
  CALL: "bg-green-100 text-green-600",
  MEETING: "bg-purple-100 text-purple-600",
  NOTE: "bg-yellow-100 text-yellow-600",
  TASK: "bg-orange-100 text-orange-600",
  OTHER: "bg-gray-100 text-gray-600",
};

interface ContactActivitiesPanelProps {
  contactId: string;
  initialActivities?: Array<{
    id: string;
    type: string;
    subject: string;
    body: string | null;
    occurredAt: Date | string;
    createdBy?: { id: string; fullName: string | null } | null;
  }>;
}

export function ContactActivitiesPanel({
  contactId,
  initialActivities = [],
}: ContactActivitiesPanelProps) {
  const [open, setOpen] = useState(false);
  const { data: activities, isLoading } = useContactActivities(contactId);
  const createActivity = useCreateActivity(contactId);

  const displayActivities = (activities ?? initialActivities) as Array<{
    id: string;
    type: string;
    subject: string;
    body: string | null;
    occurredAt: string | Date;
    createdBy?: { id: string; fullName: string | null } | null;
  }>;

  async function handleCreate(values: {
    type: string;
    subject: string;
    body?: string;
    occurredAt?: string;
  }) {
    await createActivity.mutateAsync(values);
    toast.success("Activity logged");
    setOpen(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">
          {displayActivities.length} activit{displayActivities.length === 1 ? "y" : "ies"}
        </span>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Log Activity
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && displayActivities.length === 0 && (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      )}

      {displayActivities.length > 0 && (
        <ol className="space-y-4">
          {displayActivities.map((activity, idx) => {
            const Icon = TYPE_ICON[activity.type] ?? Activity;
            const colorClass = TYPE_COLOR[activity.type] ?? "bg-gray-100 text-gray-600";
            return (
              <li key={activity.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0 pb-4">
                  <p className="text-sm font-medium">{activity.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {TYPE_LABEL[activity.type] ?? activity.type}
                    {activity.createdBy?.fullName && <> · {activity.createdBy.fullName}</>}
                    {" · "}
                    {formatRelativeTime(activity.occurredAt)}
                  </p>
                  {activity.body && (
                    <>
                      <Separator className="my-2" />
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {activity.body}
                      </p>
                    </>
                  )}
                </div>
                {idx < displayActivities.length - 1 && (
                  <div className="absolute left-3.5 mt-8 h-full w-px bg-border" />
                )}
              </li>
            );
          })}
        </ol>
      )}

      <SlideOver open={open} onOpenChange={setOpen} title="Log Activity">
        <ActivityForm
          onSubmit={handleCreate}
          isPending={createActivity.isPending}
        />
      </SlideOver>
    </div>
  );
}
