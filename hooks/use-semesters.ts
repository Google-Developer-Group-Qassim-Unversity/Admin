import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ApiRequestError,
  createSemester,
  deleteSemester,
  getSemesters,
  setCurrentSemester,
  updateSemester,
} from "@/lib/api";
import type { CreateSemesterPayload, UpdateSemesterPayload } from "@/lib/api-types";

export const semesterKeys = {
  all: ["semesters"] as const,
  list: () => [...semesterKeys.all, "list"] as const,
};

export function useSemesters(getToken: () => Promise<string | null>) {
  return useQuery({
    queryKey: semesterKeys.list(),
    queryFn: async () => {
      const result = await getSemesters(getToken);
      if (!result.success) {
        throw new ApiRequestError(result.error);
      }
      return result.data;
    },
  });
}

export function useCreateSemester(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSemesterPayload) => {
      const result = await createSemester(payload, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: semesterKeys.all });
    },
  });
}

export function useUpdateSemester(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateSemesterPayload }) => {
      const result = await updateSemester(id, payload, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: semesterKeys.all });
    },
  });
}

export function useSetCurrentSemester(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await setCurrentSemester(id, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: semesterKeys.all });
    },
  });
}

export function useDeleteSemester(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteSemester(id, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: semesterKeys.all });
    },
  });
}

/**
 * Semester choices for a filter dropdown, newest first.
 *
 * Reads the same cached query as {@link useSemesters}, so a filter and the
 * management page never disagree about which semesters exist.
 */
export function useSemesterOptions() {
  const { getToken } = useAuth();
  const { data } = useSemesters(getToken);

  return React.useMemo(
    () =>
      (data ?? []).map((semester) => ({
        value: String(semester.id),
        label: semester.name ? `${semester.id} — ${semester.name}` : String(semester.id),
      })),
    [data]
  );
}
