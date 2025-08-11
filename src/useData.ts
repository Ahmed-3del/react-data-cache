import { useSyncExternalStore } from "react";
import { DataState, UseDataOptions, UseDataResponse, FetchFunction } from "./types";
import { subscribe, fetchOrUsePreloadedData, formatDataResponse, dataCache } from "./cache";
import { prefetchData } from "./prefetch";

const defaultStaleTime = 1000 * 5;

export function useData<T>(
  key: string,
  fn: FetchFunction<T>,
  options: UseDataOptions = {}
): UseDataResponse<T> {
  if (!dataCache.has(key)) {
    dataCache.set(key, { status: "idle", payload: null } as DataState<T>);
  }

  const data = useSyncExternalStore(
    subscribe,
    () => dataCache.get(key) as DataState<T>
  );

  const isStale =
    Date.now() - (data.timestamp || 0) >
    (options.staleTime ?? defaultStaleTime);

  const noCache = options.noCache ?? false;

  if (noCache) {
    dataCache.delete(key);
  }

  if (data.status === "idle") {
    fetchOrUsePreloadedData(key, fn);
  }

  if (options.refetchOnMount && data.status === "success" && isStale) {
    prefetchData(key, fn, { refetching: true });
  }

  return formatDataResponse<T>(data, key, fn);
}
