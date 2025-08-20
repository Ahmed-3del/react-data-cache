import { useSyncExternalStore, useEffect, useRef } from "react";
import { DataState, UseDataOptions, UseDataResponse, FetchFunction } from "./types";
import { subscribe, fetchOrUsePreloadedData, formatDataResponse, dataCache, performanceMonitor } from "./cache";
import { prefetchData } from "./prefetch";
import { 
  createRetryManager, 
  createOptimisticUpdateManager,
  createBackgroundSyncManager,
  createRealtimeManager,
  createAdvancedCacheManager,
  RetryManager,
  OptimisticUpdateManager,
  BackgroundSyncManager,
  RealtimeManager,
  AdvancedCacheManager
} from "./enhancements";

const defaultStaleTime = 1000 * 5;

export function useData<T>(
  key: string,
  fn: FetchFunction<T>,
  options: UseDataOptions = {}
): UseDataResponse<T> {
  // Initialize cache entry
  if (!dataCache.has(key)) {
    dataCache.set(key, { status: "idle", payload: null } as DataState<T>);
  }

  // Enhancement managers
  const retryManagerRef = useRef<RetryManager | null>(null);
  const optimisticManagerRef = useRef<OptimisticUpdateManager<T> | null>(null);
  const backgroundSyncRef = useRef<BackgroundSyncManager | null>(null);
  const realtimeRef = useRef<RealtimeManager | null>(null);
  const advancedCacheRef = useRef<AdvancedCacheManager | null>(null);

  // Initialize managers if needed
  if (options.retryAttempts && !retryManagerRef.current) {
    retryManagerRef.current = createRetryManager({
      attempts: options.retryAttempts,
      delay: options.retryDelay || 1000,
      exponentialBackoff: options.exponentialBackoff !== false,
      onError: options.onError
    });
  }

  if (options.optimisticUpdates && !optimisticManagerRef.current) {
    optimisticManagerRef.current = createOptimisticUpdateManager<T>();
  }

  if (options.backgroundSync && !backgroundSyncRef.current) {
    backgroundSyncRef.current = createBackgroundSyncManager({
      enabled: options.backgroundSync,
      offlineSupport: options.offlineSupport || false
    });
  }

  if (options.realtime && !realtimeRef.current) {
    realtimeRef.current = createRealtimeManager({
      enabled: options.realtime,
      subscriptionUrl: options.subscriptionUrl,
      onUpdate: options.onUpdate
    });
  }

  if (options.cacheStrategy && options.cacheStrategy !== "default" && !advancedCacheRef.current) {
    advancedCacheRef.current = createAdvancedCacheManager({
      strategy: options.cacheStrategy,
      cacheTime: options.cacheTime || 5 * 60 * 1000,
      backgroundRefetch: options.backgroundRefetch || false
    });
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

  // Initial fetch
  if (data.status === "idle") {
    fetchOrUsePreloadedData(key, fn);
  }

  // Refetch on mount if stale
  if (options.refetchOnMount && data.status === "success" && isStale) {
    prefetchData(key, fn, { refetching: true });
  }

  // Background sync setup
  useEffect(() => {
    if (options.backgroundSync && backgroundSyncRef.current) {
      backgroundSyncRef.current.startSync();
      
      return () => {
        backgroundSyncRef.current?.stopSync();
      };
    }
  }, [options.backgroundSync]);

  // Real-time subscription setup
  useEffect(() => {
    if (options.realtime && realtimeRef.current) {
      realtimeRef.current.connect();
      
      return () => {
        realtimeRef.current?.disconnect();
      };
    }
  }, [options.realtime, options.subscriptionUrl]);

  // Performance monitoring setup
  useEffect(() => {
    if (options.enableMetrics) {
      const handleMetrics = (metrics: any) => {
        options.onMetrics?.(metrics);
      };
      
      // Set up metrics tracking
      const interval = setInterval(() => {
        const metrics = performanceMonitor.getMetrics();
        handleMetrics(metrics);
      }, 5000); // Report metrics every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [options.enableMetrics, options.onMetrics]);

  // Enhanced response with all features
  const baseResponse = formatDataResponse<T>(data, key, fn, options);
  
  return {
    ...baseResponse,
    // Enhanced retry functionality
    retry: () => {
      if (retryManagerRef.current) {
        retryManagerRef.current.reset();
      }
      baseResponse.refetch();
    },
    retryCount: data.retryCount || 0,
    
    // Enhanced optimistic updates
    updateOptimistically: (optimisticData: Partial<T>, mutationFn: () => Promise<void>) => {
      if (optimisticManagerRef.current && data.status === "success") {
        optimisticManagerRef.current.updateOptimistically(
          data.payload!,
          optimisticData,
          mutationFn,
          () => {
            // Rollback function
            dataCache.set(key, {
              ...data,
              optimisticData: undefined,
              status: "success"
            });
            window.dispatchEvent(new Event("dataFetched"));
          }
        );
      }
    },
    
    // Background sync status
    syncStatus: data.syncStatus || "online",
    
    // Real-time connection status
    isConnected: realtimeRef.current?.isConnected() || true,
    
    // Performance metrics
    metrics: data.metrics || performanceMonitor.getMetrics()
  };
}
