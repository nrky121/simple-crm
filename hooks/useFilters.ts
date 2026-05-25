import { useState, useCallback } from "react";

export function useFilters<T extends Record<string, string | undefined>>(initial: T) {
  const [filters, setFilters] = useState<T>(initial);

  const setFilter = useCallback(
    (key: keyof T, value: string | undefined) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { filters, setFilter, resetFilters };
}
