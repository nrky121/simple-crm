import { useQuery } from "@tanstack/react-query";

interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await fetch("/api/users/me");
      if (!res.ok) throw new Error("Failed to fetch user");
      const { data }: { data: CurrentUser } = await res.json();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
