/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSyncExternalStore, useEffect, useRef } from "react";
import {
    UniversalInfiniteOptions,
    UniversalInfiniteState,
    UniversalInfiniteResponse,
    UniversalFetchFunction
} from "../types";
import {
    universalInfiniteCache,
    subscribeUniversal,
    emitUniversalUpdate
} from "./universalInfiniteCache";
import { 
  createRetryManager, 
  createOptimisticUpdateManager,
  createBackgroundSyncManager,
  createRealtimeManager,
  createAdvancedCacheManager,
  createPerformanceMonitor,
  RetryManager,
  OptimisticUpdateManager,
  BackgroundSyncManager,
  RealtimeManager,
  AdvancedCacheManager,
  PerformanceMonitor
} from "../enhancements";

export function useUniversalInfiniteQuery<TData, TResponse = any, TPageParam = any>(
    key: string | (string | number)[],
    fetchFn: UniversalFetchFunction<TResponse>,
    options: UniversalInfiniteOptions<TData, TPageParam>
): UniversalInfiniteResponse<TData> {
    const cacheKey = Array.isArray(key) ? key.join(':') : key;

    // Initialize cache entry
    if (!universalInfiniteCache.has(cacheKey)) {
        universalInfiniteCache.set(cacheKey, {
            status: "idle",
            pages: [],
            pageParams: [],
            data: [],
            error: null
        });
    }

    // Enhancement managers
    const retryManagerRef = useRef<RetryManager | null>(null);
    const optimisticManagerRef = useRef<OptimisticUpdateManager<TData[]> | null>(null);
    const backgroundSyncRef = useRef<BackgroundSyncManager | null>(null);
    const realtimeRef = useRef<RealtimeManager | null>(null);
    const advancedCacheRef = useRef<AdvancedCacheManager | null>(null);
    const performanceMonitorRef = useRef<PerformanceMonitor | null>(null);

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
        optimisticManagerRef.current = createOptimisticUpdateManager<TData[]>();
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

    if (options.enableMetrics && !performanceMonitorRef.current) {
        performanceMonitorRef.current = createPerformanceMonitor({
            enabled: options.enableMetrics,
            onMetrics: options.onMetrics
        });
    }

    const state = useSyncExternalStore(
        subscribeUniversal,
        () => universalInfiniteCache.get(cacheKey) as UniversalInfiniteState<TData>
    );

    // Initial fetch
    if (state.status === "idle" && (options.enabled !== false)) {
        fetchPage(
            cacheKey,
            fetchFn,
            options as UniversalInfiniteOptions<TData, TPageParam | undefined>,
            options.initialPageParam,
            "initial"
        );
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
        if (options.enableMetrics && performanceMonitorRef.current) {
            const interval = setInterval(() => {
                const metrics = performanceMonitorRef.current!.getMetrics();
                options.onMetrics?.(metrics);
            }, 5000);
            
            return () => clearInterval(interval);
        }
    }, [options.enableMetrics, options.onMetrics]);

    // Calculate derived state
    const flattenedData = state.pages.flatMap((page, index) => {
        const transformed = options.transformPage ? options.transformPage(page, state.pageParams[index]) : page;
        return options.select(transformed);
    });

    const lastPage = state.pages[state.pages.length - 1];
    const firstPage = state.pages[0];
    const lastPageParam = state.pageParams[state.pageParams.length - 1];
    const firstPageParam = state.pageParams[0];

    const hasNextPage = lastPage
        ? options.getNextPageParam(lastPage, state.pages, lastPageParam) !== undefined
        : false;

    const hasPreviousPage = firstPage && options.getPreviousPageParam
        ? options.getPreviousPageParam(firstPage, state.pages, firstPageParam) !== undefined
        : false;

    return {
        data: state.optimisticData || flattenedData,
        pages: state.pages,
        isLoading: state.status === "loading",
        error: state.status === "error" ? state.error : null,
        isFetchingNextPage: state.status === "fetchingNextPage",
        isFetchingPreviousPage: state.status === "fetchingPreviousPage",
        hasNextPage,
        hasPreviousPage,
        fetchNextPage: () => {
            if (hasNextPage && state.status !== "fetchingNextPage") {
                const nextPageParam = options.getNextPageParam(
                    lastPage,
                    state.pages,
                    lastPageParam as typeof lastPageParam | undefined
                );
                fetchPage(
                    cacheKey,
                    fetchFn,
                    options as UniversalInfiniteOptions<TData, typeof lastPageParam | undefined>,
                    nextPageParam,
                    "next"
                );
            }
        },
        fetchPreviousPage: () => {
            if (hasPreviousPage && state.status !== "fetchingPreviousPage" && options.getPreviousPageParam) {
                const prevPageParam = options.getPreviousPageParam(
                    firstPage,
                    state.pages,
                    firstPageParam as typeof firstPageParam | undefined
                );
                fetchPage(
                    cacheKey,
                    fetchFn,
                    options as UniversalInfiniteOptions<TData, typeof firstPageParam | undefined>,
                    prevPageParam,
                    "previous"
                );
            }
        },
        refetch: () => {
            refetchAll(cacheKey, fetchFn, options);
        },
        // High Priority Enhancements
        updateOptimistically: (optimisticData: Partial<TData[]>, mutationFn: () => Promise<void>) => {
            if (optimisticManagerRef.current && state.status === "success") {
                optimisticManagerRef.current.updateOptimistically(
                    flattenedData,
                    optimisticData,
                    mutationFn,
                    () => {
                        // Rollback function
                        const currentState = universalInfiniteCache.get(cacheKey);
                        if (currentState) {
                            universalInfiniteCache.set(cacheKey, {
                                ...currentState,
                                optimisticData: undefined
                            });
                            emitUniversalUpdate();
                        }
                    }
                );
            }
        },
        retry: () => {
            if (retryManagerRef.current) {
                retryManagerRef.current.reset();
            }
            refetchAll(cacheKey, fetchFn, options);
        },
        retryCount: state.retryCount || 0,
        syncStatus: state.syncStatus || "online",
        // Medium Priority Enhancements
        isConnected: realtimeRef.current?.isConnected() || true,
        metrics: state.metrics || performanceMonitorRef.current?.getMetrics() || {
            fetchTime: 0,
            cacheHitRate: 0,
            retryCount: 0,
            lastFetchTimestamp: 0,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0
        }
    };
}

async function fetchPage<TData, TResponse, TPageParam>(
    cacheKey: string,
    fetchFn: UniversalFetchFunction<TResponse>,
    options: UniversalInfiniteOptions<TData, TPageParam>,
    pageParam: TPageParam,
    direction: "initial" | "next" | "previous"
) {
    const currentState = universalInfiniteCache.get(cacheKey);
    if (!currentState) return;

    // Cancel existing request
    if (currentState.controller) {
        currentState.controller.abort();
    }

    const controller = new AbortController();
    const status = direction === "initial"
        ? "loading"
        : direction === "next"
            ? "fetchingNextPage"
            : "fetchingPreviousPage";

    universalInfiniteCache.set(cacheKey, {
        ...currentState,
        status,
        controller
    });

    emitUniversalUpdate();

    try {
        const meta = {
            pageIndex: direction === "previous" ? 0 : currentState.pages.length,
            previousPageParam: direction === "next"
                ? currentState.pageParams[currentState.pageParams.length - 1]
                : direction === "previous"
                    ? currentState.pageParams[0]
                    : undefined
        };

        const response = await fetchFn(pageParam, controller.signal, meta);
        const updatedState = universalInfiniteCache.get(cacheKey);

        if (updatedState) {
            const newPages = direction === "previous"
                ? [response, ...updatedState.pages]
                : [...updatedState.pages, response];

            const newPageParams = direction === "previous"
                ? [pageParam, ...updatedState.pageParams]
                : [...updatedState.pageParams, pageParam];

            universalInfiniteCache.set(cacheKey, {
                ...updatedState,
                status: "success",
                pages: newPages,
                pageParams: newPageParams,
                timestamp: Date.now(),
                controller: undefined
            });
        }
    } catch (error: any) {
        if (error?.name !== "AbortError") {
            const updatedState = universalInfiniteCache.get(cacheKey);
            if (updatedState) {
                universalInfiniteCache.set(cacheKey, {
                    ...updatedState,
                    status: "error",
                    error,
                    controller: undefined,
                    retryCount: (updatedState.retryCount || 0) + 1,
                    lastError: error
                });
            }
        }
    } finally {
        emitUniversalUpdate();
    }
}

async function refetchAll<TData, TResponse, TPageParam>(
    cacheKey: string,
    fetchFn: UniversalFetchFunction<TResponse>,
    options: UniversalInfiniteOptions<TData, TPageParam>
) {
    const currentState = universalInfiniteCache.get(cacheKey);
    if (!currentState || currentState.pageParams.length === 0) return;

    // Cancel existing request
    if (currentState.controller) {
        currentState.controller.abort();
    }

    const controller = new AbortController();

    universalInfiniteCache.set(cacheKey, {
        ...currentState,
        status: "loading",
        controller
    });

    emitUniversalUpdate();

    try {
        const refetchedPages: any[] = [];

        for (let i = 0; i < currentState.pageParams.length; i++) {
            const pageParam = currentState.pageParams[i];
            const meta = {
                pageIndex: i,
                previousPageParam: i > 0 ? currentState.pageParams[i - 1] : undefined
            };

            const response = await fetchFn(pageParam, controller.signal, meta);
            refetchedPages.push(response);
        }

        universalInfiniteCache.set(cacheKey, {
            ...currentState,
            status: "success",
            pages: refetchedPages,
            timestamp: Date.now(),
            controller: undefined
        });
    } catch (error: any) {
        if (error?.name !== "AbortError") {
            universalInfiniteCache.set(cacheKey, {
                ...currentState,
                status: "error",
                error,
                controller: undefined,
                retryCount: (currentState.retryCount || 0) + 1,
                lastError: error
            });
        }
    } finally {
        emitUniversalUpdate();
    }
}

// Pre-built adapters for common pagination patterns
export const PaginationAdapters = {
    // Offset-based pagination (page/limit)
    offsetBased: <T>() => ({
        select: (response: { data: T[] } | T[]) => {
            return Array.isArray(response) ? response : response.data;
        },
        getNextPageParam: (
            response: { totalPages?: number; currentPage?: number; hasMore?: boolean; page?: number },
            allResponses: any[],
            currentPageParam: number = 1
        ) => {
            // Check various common patterns
            if (response.totalPages && response.currentPage) {
                return response.currentPage < response.totalPages ? response.currentPage + 1 : undefined;
            }
            if (response.hasMore !== undefined) {
                return response.hasMore ? currentPageParam + 1 : undefined;
            }
            if (response.page && response.totalPages) {
                return response.page < response.totalPages ? response.page + 1 : undefined;
            }
            // Default: assume no more if less than expected items
            const currentItems = Array.isArray(response)
                ? response
                : ('data' in response && Array.isArray((response as any).data))
                    ? (response as any).data
                    : [];
            return currentItems.length === 0 ? undefined : currentPageParam + 1;
        },
        initialPageParam: 1
    }),

    // Cursor-based pagination
    cursorBased: <T>() => ({
        select: (response: { data: T[] } | { items: T[] } | T[]) => {
            if (Array.isArray(response)) return response;
            if ('data' in response) return response.data;
            if ('items' in response) return response.items;
            return [];
        },
        getNextPageParam: (response: { nextCursor?: string; next?: string; nextToken?: string }) => {
            return response.nextCursor || response.next || response.nextToken || undefined;
        },
        initialPageParam: null
    }),

    // Link-based pagination (next/prev URLs)
    linkBased: <T>() => ({
        select: (response: { data: T[] } | T[]) => {
            return Array.isArray(response) ? response : response.data;
        },
        getNextPageParam: (response: { nextUrl?: string; next?: string; links?: { next?: string } }) => {
            return response.nextUrl || response.next || response.links?.next || undefined;
        },
        initialPageParam: null
    }),

    // Skip/Total based pagination (skip, limit, total)
    skipTotal: <T>(limit: number = 20) => ({
        select: (response: { data: T[]; skip: number; total: number }) => response.data,
        getNextPageParam: (
            response: { data: T[]; skip: number; total: number },
            allResponses: any[],
            currentSkip: number = 0
        ) => {
            const nextSkip = response.skip + response.data.length;
            return nextSkip < response.total ? nextSkip : undefined;
        },
        initialPageParam: 0
    }),

    // Custom adapter factory
    custom: <T, R = any>(config: {
        selectData: (response: R) => T[];
        getNext: (response: R, currentParam?: any) => any;
        initialParam?: any;
        getPrev?: (response: R, currentParam?: any) => any;
    }) => ({
        select: config.selectData,
        getNextPageParam: config.getNext,
        getPreviousPageParam: config.getPrev,
        initialPageParam: config.initialParam || null
    })
};