import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
  tags: Array<{ id: string; name: string; color: string }>;
  _count?: { contacts: number };
  createdAt: string;
  updatedAt: string;
}

interface CompaniesResponse {
  items: Company[];
  meta: {
    total: number;
    nextCursor: string | null;
  };
}

interface CreateCompanyInput {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  website?: string;
  tagIds?: string[];
}

interface UpdateCompanyInput extends Partial<CreateCompanyInput> {
  id: string;
}

export function useCompanies(
  filters: Record<string, string | undefined> = {},
  options: { initialData?: CompaniesResponse } = {}
) {
  return useQuery({
    queryKey: ["companies", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== "") {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      const res = await fetch(`/api/companies${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message ?? "Failed to fetch companies");
      }
      const envelope: { data: CompaniesResponse } = await res.json();
      return envelope.data;
    },
    initialData: options.initialData,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCompanyInput) => {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message ?? "Failed to create company");
      }
      const { data }: { data: Company } = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateCompanyInput) => {
      const res = await fetch(`/api/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message ?? "Failed to update company");
      }
      const { data }: { data: Company } = await res.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company", data.id] });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/companies/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message ?? "Failed to delete company");
      }
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.removeQueries({ queryKey: ["company", id] });
    },
  });
}
