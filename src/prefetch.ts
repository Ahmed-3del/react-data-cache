import { dataCache, performanceMonitor } from "./cache";
import { FetchFunction, UseDataOptions } from "./types";
import { createRetryManager, RetryManager } from "./enhancements";

export function prefetchData<T>(
  key: string,
  fn: FetchFunction<T>,
  options: { refetching?: boolean; retryConfig?: any; cacheStrategy?: string } = {}
) {
  const existingController = dataCache.get(key)?.controller;
  if (existingController && dataCache.get(key)?.status === "loading") {
    existingController.abort();
  }

  const newController = new AbortController();
  const signal = newController.signal;

  dataCache.set(key, {
    status: options.refetching ? "isRefetching" : "loading",
    payload: null,
    controller: newController,
    timestamp: Date.now(),
  });

  // Performance monitoring
  const startTime = performanceMonitor.startFetch();

  // Retry logic
  const retryManager = createRetryManager({
    attempts: options.retryConfig?.attempts || 3,
    delay: options.retryConfig?.delay || 1000,
    exponentialBackoff: options.retryConfig?.exponentialBackoff !== false,
    onError: options.retryConfig?.onError
  });

  const executeFetch = async () => {
    try {
      const data = await fn(signal);
      
      // Record successful fetch
      performanceMonitor.endFetch(startTime, true);
      
      dataCache.set(key, {
        status: "success",
        payload: data,
        timestamp: Date.now(),
        retryCount: retryManager.getCurrentAttempt(),
      });
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        // Record failed fetch
        performanceMonitor.endFetch(startTime, false);
        performanceMonitor.recordRetry();
        
        dataCache.set(key, {
          status: "error",
          payload: error,
          retryCount: retryManager.getCurrentAttempt(),
          lastError: error,
        });
      }
    } finally {
      window.dispatchEvent(new Event("dataFetched"));
    }
  };

  // Execute with retry logic if enabled
  if (options.retryConfig) {
    retryManager.execute(executeFetch).catch((error) => {
      // Final error handling after all retries
      dataCache.set(key, {
        status: "error",
        payload: error,
        retryCount: retryManager.getCurrentAttempt(),
        lastError: error,
      });
      window.dispatchEvent(new Event("dataFetched"));
    });
  } else {
    executeFetch();
  }
}

export function prefetchMulti(
  dataSources: { key: string; fn: FetchFunction<any> }[],
  options?: { 
    urlBasedPrefetching?: boolean;
    retryConfig?: any;
    cacheStrategy?: string;
    batchSize?: number;
  }
) {
  if (options?.urlBasedPrefetching) {
    dataSources = dataSources.filter(
      (ds) => ds.key === window.location.pathname
    );
  }

  // Batch processing for better performance
  const batchSize = options?.batchSize || 5;
  const batches = [];
  
  for (let i = 0; i < dataSources.length; i += batchSize) {
    batches.push(dataSources.slice(i, i + batchSize));
  }

  const prefetchBatch = (batch: typeof dataSources) => {
    return Promise.all(
      batch.map(({ key, fn }) => 
        prefetchData(key, fn, {
          retryConfig: options?.retryConfig,
          cacheStrategy: options?.cacheStrategy
        })
      )
    );
  };

  return Promise.all(batches.map(prefetchBatch));
}

export function prefetchOnEvent<T>(key: string, fn: FetchFunction<T>, options?: any) {
  if (!dataCache.has(key)) {
    prefetchData(key, fn, options);
  }
}

// Enhanced prefetching with advanced features
export function prefetchWithStrategy<T>(
  key: string,
  fn: FetchFunction<T>,
  strategy: "cache-first" | "network-first" | "stale-while-revalidate" = "cache-first",
  options?: any
) {
  const cached = dataCache.get(key);
  
  switch (strategy) {
    case "cache-first":
      if (cached && cached.status === "success") {
        return Promise.resolve(cached.payload);
      }
      break;
      
    case "network-first":
      // Always try network first, fallback to cache
      break;
      
    case "stale-while-revalidate":
      if (cached && cached.status === "success") {
        // Return cached data immediately
        const result = Promise.resolve(cached.payload);
        // Then update in background
        prefetchData(key, fn, { refetching: true, ...options });
        return result;
      }
      break;
  }
  
  return prefetchData(key, fn, options);
}

// Background sync prefetching
export function prefetchInBackground<T>(
  key: string,
  fn: FetchFunction<T>,
  interval: number = 30000
) {
  // Initial fetch
  prefetchData(key, fn);
  
  // Set up background sync
  const syncInterval = setInterval(() => {
    prefetchData(key, fn, { refetching: true });
  }, interval);
  
  // Return cleanup function
  return () => clearInterval(syncInterval);
}
