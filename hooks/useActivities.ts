import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Activity {
  id: string;
  type: "EMAIL" | "CALL" | "MEETING" | "NOTE" | "TASK" | "OTHER";
  subject: string;
  body: string | null;
  occurredAt: string;
  createdById: string | null;
  contactId: string | null;
  createdBy?: { id: string; fullName: string | null } | null;
  createdAt: string;
}

export function useContactActivities(contactId: string) {
  return useQuery<Activity[]>({
    queryKey: ["contacts", contactId, "activities"],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${contactId}/activities`);
      if (!res.ok) throw new Error("Failed to fetch activities");
      const json = await res.json();
      // API returns { items, meta } wrapped in { data: ... }
      return json.data?.items ?? json.data ?? [];
    },
  });
}

export function useCreateActivity(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      type: string;
      subject: string;
      body?: string;
      occurredAt?: string;
    }) => {
      const res = await fetch(`/api/contacts/${contactId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to log activity");
      }
      return (await res.json()).data as Activity;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts", contactId, "activities"] });
    },
  });
}
