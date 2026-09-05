"use client";

import { useAuth } from "@clerk/nextjs";

import { useAsRef } from "@/hooks/use-as-ref";
import { useLazyRef } from "@/hooks/use-lazy-ref";
import { createRequester } from "@/lib/api/request";
import { createApi, type Api } from "@/lib/api/resources";

/**
 * The API, already holding the signed-in admin's token.
 *
 * Callers used to take `getToken: () => Promise<string | null>` and thread it
 * down - through hooks, then through component props - because `lib/api.ts`
 * wanted it as an argument. Clerk's `useAuth` is available anywhere in the
 * tree, so nothing needs to carry it.
 *
 * The returned object is referentially stable for the component's lifetime,
 * which matters: it goes into `useEffect` dependency arrays and react-query
 * `queryFn`s, and a fresh object each render would re-fire both. The token
 * itself is read through a ref, so calls always use the current one.
 */
export function useApi(): Api {
  const { getToken } = useAuth();
  const latestGetToken = useAsRef(getToken);

  return useLazyRef(() => createApi(createRequester(() => latestGetToken.current()))).current;
}
