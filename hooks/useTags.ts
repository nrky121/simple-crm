import { useQuery } from "@tanstack/react-query";

interface Tag {
  id: string;
  name: string;
  color: string;
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await fetch("/api/tags");
      if (!res.ok) throw new Error("Failed to fetch tags");
      const { data }: { data: Tag[] } = await res.json();
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
