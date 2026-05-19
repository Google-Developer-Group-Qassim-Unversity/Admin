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
  const { limit, debounceMs = 50, ...fuseOptions } = options;

  const debouncedQuery = useDebouncedValue(query, debounceMs);

  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys,
      threshold: 0.3,
      distance: 200,
      ignoreLocation: true,
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

  const words = useMemo(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) return [];
    return trimmed.split(/\s+/).map((w) => normalizeArabic(w)).filter(Boolean);
  }, [debouncedQuery]);

  return useMemo(() => {
    if (words.length === 0) return limit ? items.slice(0, limit) : items;

    if (words.length === 1) {
      const results = fuse.search(words[0], limit ? { limit } : undefined);
      return results.map((r) => r.item);
    }

    // Multi-word: search each word independently, then intersect (AND logic)
    const wordResults: Map<T, number>[] = [];

    for (const word of words) {
      const results = fuse.search(word);
      const map = new Map<T, number>();
      for (const r of results) {
        map.set(r.item, r.score ?? 0);
      }
      wordResults.push(map);
    }

    // Intersect: item must match ALL words
    const shortest = wordResults.reduce((a, b) => a.size < b.size ? a : b);
    const intersection: { item: T; score: number }[] = [];

    for (const [item, score] of shortest) {
      let totalScore = score;
      let matchedAll = true;

      for (let i = 0; i < wordResults.length; i++) {
        if (wordResults[i] === shortest) continue;
        const wordScore = wordResults[i].get(item);
        if (wordScore === undefined) {
          matchedAll = false;
          break;
        }
        totalScore += wordScore;
      }

      if (matchedAll) {
        intersection.push({ item, score: totalScore });
      }
    }

    intersection.sort((a, b) => a.score - b.score);

    const result = intersection.map((r) => r.item);
    return limit ? result.slice(0, limit) : result;
  }, [fuse, words, items, limit]);
}