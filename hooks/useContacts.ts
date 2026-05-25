import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  companyId: string | null;
  status: string;
  tags: Array<{ id: string; name: string; color: string }>;
  createdAt: string;
  updatedAt: string;
}

interface ContactsResponse {
  items: Contact[];
  meta: {
    total: number;
    nextCursor: string | null;
  };
}

interface CreateContactInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  companyId?: string;
  status?: string;
  tagIds?: string[];
}

interface UpdateContactInput extends Partial<CreateContactInput> {
  id: string;
}

export function useContacts(
  filters: Record<string, string | undefined> = {},
  options: { initialData?: ContactsResponse } = {}
) {
  return useQuery({
    queryKey: ["contacts", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== "") {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      const res = await fetch(`/api/contacts${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message ?? "Failed to fetch contacts");
      }
      const envelope: { data: ContactsResponse } = await res.json();
      return envelope.data;
    },
    initialData: options.initialData,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateContactInput) => {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message ?? "Failed to create contact");
      }
      const { data }: { data: Contact } = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateContactInput) => {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message ?? "Failed to update contact");
      }
      const { data }: { data: Contact } = await res.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", data.id] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message ?? "Failed to delete contact");
      }
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.removeQueries({ queryKey: ["contact", id] });
    },
  });
}
