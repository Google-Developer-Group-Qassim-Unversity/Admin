import { useMemo, useState, useEffect } from "react";
import Fuse, { type IFuseOptions, type FuseOptionKey } from "fuse.js";

export function normalizeArabic(text: string): string {
  return text
    .replace(/[\u0617-\u061A\u064B-\u0652]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/(ئ|ؤ)/g, "ء")
    .toLowerCase();
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

interface UseFuzzySearchOptions<T> extends IFuseOptions<T> {
  limit?: number;
  debounceMs?: number;
}

export function useFuzzySearch<T>(
  items: T[],
  query: string,
  keys: FuseOptionKey<T>[],
  options: UseFuzzySearchOptions<T> = {}
): T[] {
  const { limit, debounceMs = 150, ...fuseOptions } = options;

  const debouncedQuery = useDebouncedValue(query, debounceMs);

  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys,
      threshold: 0.3,
      distance: 200,
      ignoreLocation: true,
      useExtendedSearch: false,
      getFn: (obj: T, path: string | string[]) => {
        const value = Fuse.config.getFn(obj, path);
        if (Array.isArray(value)) {
          return value.map((v) => (typeof v === "string" ? normalizeArabic(v) : v));
        }
        return typeof value === "string" ? normalizeArabic(value) : value;
      },
      ...fuseOptions,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, fuseOptions.threshold, fuseOptions.distance]);

  const normalizedQuery = useMemo(() => normalizeArabic(debouncedQuery), [debouncedQuery]);

  return useMemo(() => {
    if (!normalizedQuery.trim()) return limit ? items.slice(0, limit) : items;
    const results = fuse.search(normalizedQuery, limit ? { limit } : undefined);
    return results.map((r) => r.item);
  }, [fuse, normalizedQuery, items, limit]);
}