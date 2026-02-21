import { useMemo } from "react";
import { deepEqual } from "./deep-equal";

/**
 * Hook to track whether form values have changed from initial values.
 *
 * @param initialValues - The original values when the form loaded
 * @param currentValues - The current form values
 * @returns isDirty - true if values differ from initial
 *
 * @example
 * const isDirty = useFormDirty(
 *   { name: 'foo', count: 5 },
 *   { name: formName, count: formCount }
 * );
 */
export function useFormDirty<T>(
  initialValues: T | null,
  currentValues: T
): boolean {
  return useMemo(() => {
    // If no initial values (e.g., create mode), always consider dirty
    if (initialValues === null) return true;
    return !deepEqual(initialValues, currentValues);
  }, [initialValues, currentValues]);
}
