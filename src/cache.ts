import { DataState, FetchFunction } from "./types";
import { prefetchData } from "./prefetch";

export const dataCache = new Map<string, DataState<any>>();
export let preloadedDataSources: { key: string; fn: FetchFunction<any> }[] = [];

export function subscribe(callback: () => void) {
    window.addEventListener("dataFetched", callback);
    return () => window.removeEventListener("dataFetched", callback);
}

export function fetchOrUsePreloadedData<T>(key: string, fn?: FetchFunction<T>) {
    const preloaded = preloadedDataSources.find(d => d.key === key);
    const fetchFn = fn ?? preloaded?.fn;
    if (fetchFn) {
        prefetchData(key, fetchFn);
    }
}

export function formatDataResponse<T>(
    { status, payload }: DataState<T>,
    key: string,
    fn: FetchFunction<T>
) {
    const currentStatus = dataCache.get(key)?.status || "idle";
    const defaultData = {
        isLoading: false,
        data: null,
        error: null,
        isRefetching: false,
    };

    const statusResponse: Record<string, any> = {
        idle: { ...defaultData, isLoading: true },
        isRefetching: { ...defaultData, isRefetching: true, data: payload },
        loading: { ...defaultData, isLoading: true },
        error: { ...defaultData, error: payload },
        success: { ...defaultData, data: payload },
    };

    return {
        ...statusResponse[status],
        refetch: () => {
            if (currentStatus !== "loading" && currentStatus !== "isRefetching") {
                dataCache.set(key, { status: "idle", payload: null });
                fetchOrUsePreloadedData(key, fn);
            }
        },
    };
}

export function clearDataCache() {
    dataCache.clear();
}
