import { DataState, FetchFunction, PerformanceMetrics } from "./types";
import { prefetchData } from "./prefetch";
import { 
  createPerformanceMonitor, 
  createAdvancedCacheManager,
  createBackgroundSyncManager,
  PerformanceMonitor,
  AdvancedCacheManager,
  BackgroundSyncManager
} from "./enhancements";

export const dataCache = new Map<string, DataState<any>>();
export let preloadedDataSources: { key: string; fn: FetchFunction<any> }[] = [];

// Enhancement managers
const performanceMonitor = createPerformanceMonitor({ enabled: true });
const advancedCache = createAdvancedCacheManager();
const backgroundSync = createBackgroundSyncManager();

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
    { status, payload, optimisticData, retryCount, syncStatus, metrics }: DataState<T>,
    key: string,
    fn: FetchFunction<T>,
    options: any = {}
) {
    const currentStatus = dataCache.get(key)?.status || "idle";
    const defaultData = {
        isLoading: false,
        data: null,
        error: null,
        isRefetching: false,
        // Enhancement fields
        updateOptimistically: () => {},
        retry: () => {},
        retryCount: retryCount || 0,
        syncStatus: syncStatus || "online",
        isConnected: true,
        metrics: metrics || performanceMonitor.getMetrics(),
    };
    
    const statusResponse: Record<string, any> = {
        idle: { ...defaultData, isLoading: true },
        isRefetching: { ...defaultData, isRefetching: true, data: optimisticData || payload },
        loading: { ...defaultData, isLoading: true },
        error: { ...defaultData, error: payload },
        success: { ...defaultData, data: optimisticData || payload },
    };

    const response = {
        ...statusResponse[status],
        refetch: () => {
            if (currentStatus !== "loading" && currentStatus !== "isRefetching") {
                dataCache.set(key, { status: "idle", payload: null });
                fetchOrUsePreloadedData(key, fn);
            }
        },
        // Enhancement methods
        updateOptimistically: (optimisticData: Partial<T>, mutationFn: () => Promise<void>) => {
            const currentState = dataCache.get(key);
            if (currentState && currentState.status === "success") {
                // Apply optimistic update
                const updatedData = { ...currentState.payload, ...optimisticData };
                dataCache.set(key, {
                    ...currentState,
                    optimisticData: updatedData,
                    status: "isRefetching"
                });
                
                // Execute mutation
                mutationFn().then(() => {
                    // Clear optimistic data on success
                    const state = dataCache.get(key);
                    if (state) {
                        dataCache.set(key, {
                            ...state,
                            optimisticData: undefined,
                            status: "success"
                        });
                    }
                }).catch(() => {
                    // Revert optimistic update on error
                    const state = dataCache.get(key);
                    if (state) {
                        dataCache.set(key, {
                            ...state,
                            optimisticData: undefined,
                            status: "success"
                        });
                    }
                });
                
                window.dispatchEvent(new Event("dataFetched"));
            }
        },
        retry: () => {
            const currentState = dataCache.get(key);
            if (currentState && currentState.status === "error") {
                dataCache.set(key, { 
                    status: "idle", 
                    payload: null,
                    retryCount: (currentState.retryCount || 0) + 1
                });
                fetchOrUsePreloadedData(key, fn);
            }
        }
    };

    return response;
}

export function clearDataCache() {
    dataCache.clear();
    advancedCache.invalidate();
    performanceMonitor.resetMetrics();
}

// Enhancement exports
export { performanceMonitor, advancedCache, backgroundSync };
