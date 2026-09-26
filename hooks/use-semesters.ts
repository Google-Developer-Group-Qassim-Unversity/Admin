import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/client";
import type { SemesterInput } from "@/lib/api-types";

export const semesterKeys = {
  all: ["semesters"] as const,
  list: () => [...semesterKeys.all, "list"] as const,
};

export function useSemesters() {
  const api = useApi();
  return useQuery({
    queryKey: semesterKeys.list(),
    queryFn: () => api.semesters.list(),
  });
}

export function useCreateSemester() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SemesterInput) => api.semesters.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: semesterKeys.all }),
  });
}

export function useUpdateSemester() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SemesterInput }) => api.semesters.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: semesterKeys.all }),
  });
}

export function useDeleteSemester() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.semesters.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: semesterKeys.all }),
  });
}

/**
 * Semester choices for a filter dropdown, newest first.
 *
 * The value is the Hijri code, because that is what `?semester=` takes.
 * Reads the same cached query as {@link useSemesters}, so a filter and the
 * management page never disagree about which semesters exist.
 */
export function useSemesterOptions() {
  const { data } = useSemesters();

  return React.useMemo(
    () =>
      (data ?? []).map((semester) => ({
        value: String(semester.hijri_code),
        label: `${semester.name} (${semester.hijri_code} · ${semester.gregorian_code})`,
      })),
    [data]
  );
}
