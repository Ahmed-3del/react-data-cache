export type FetchFunction<T> = (signal: AbortSignal) => Promise<T>;

export interface DataState<T> {
  status: "idle" | "loading" | "success" | "error" | "isRefetching";
  payload: T | null;
  controller?: AbortController;
  timestamp?: number;
  // New fields for enhancements
  optimisticData?: T;
  retryCount?: number;
  lastError?: any;
  syncStatus?: "online" | "offline" | "syncing";
  metrics?: PerformanceMetrics;
}

export interface UseDataOptions {
  staleTime?: number;
  refetchOnMount?: boolean;
  noCache?: boolean;
  // High Priority Enhancements
  optimisticUpdates?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  onError?: (error: any, attempt: number) => void;
  backgroundSync?: boolean;
  offlineSupport?: boolean;
  // Medium Priority Enhancements
  realtime?: boolean;
  subscriptionUrl?: string;
  onUpdate?: (newData: any) => void;
  cacheStrategy?: "default" | "stale-while-revalidate" | "cache-first" | "network-first";
  cacheTime?: number;
  backgroundRefetch?: boolean;
  enableMetrics?: boolean;
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

export interface UseDataResponse<T> {
  isLoading: boolean;
  data: T | null;
  error: any;
  isRefetching: boolean;
  refetch: () => void;
  // High Priority Enhancements
  updateOptimistically: (optimisticData: Partial<T>, mutationFn: () => Promise<void>) => void;
  retry: () => void;
  retryCount: number;
  syncStatus: "online" | "offline" | "syncing";
  // Medium Priority Enhancements
  isConnected: boolean;
  metrics: PerformanceMetrics;
}

export type UniversalPageParam = string | number | null | undefined | any;

export interface UniversalInfiniteOptions<TData, TPageParam = any> {
  // Required: Extract items from API response
  select: (response: any) => TData[];

  // Required: Determine next page parameter
  getNextPageParam: (response: any, allResponses: any[], currentPageParam: TPageParam) => TPageParam | undefined;

  // Optional: Initial page parameter
  initialPageParam?: TPageParam;

  // Optional: Extract previous page parameter (for bidirectional)
  getPreviousPageParam?: (response: any, allResponses: any[], currentPageParam: TPageParam) => TPageParam | undefined;

  // Optional: Transform each page response before storing
  transformPage?: (response: any, pageParam: TPageParam) => any;

  // Optional: Check if there are more pages (fallback)
  hasNextPage?: (response: any) => boolean;

  // Optional: Standard options
  staleTime?: number;
  refetchOnMount?: boolean;
  enabled?: boolean;

  // High Priority Enhancements
  optimisticUpdates?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  onError?: (error: any, attempt: number) => void;
  backgroundSync?: boolean;
  offlineSupport?: boolean;

  // Medium Priority Enhancements
  realtime?: boolean;
  subscriptionUrl?: string;
  onUpdate?: (newData: any) => void;
  cacheStrategy?: "default" | "stale-while-revalidate" | "cache-first" | "network-first";
  cacheTime?: number;
  backgroundRefetch?: boolean;
  enableMetrics?: boolean;
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

export interface UniversalInfiniteState<TData> {
  status: "idle" | "loading" | "success" | "error" | "fetchingNextPage" | "fetchingPreviousPage";
  pages: any[];
  pageParams: any[];
  data: TData[];
  error: any;
  timestamp?: number;
  controller?: AbortController;
  // New fields for enhancements
  optimisticData?: TData[];
  retryCount?: number;
  lastError?: any;
  syncStatus?: "online" | "offline" | "syncing";
  metrics?: PerformanceMetrics;
}

export interface UniversalInfiniteResponse<TData> {
  data: TData[];
  pages: any[];
  isLoading: boolean;
  error: any;
  isFetchingNextPage: boolean;
  isFetchingPreviousPage: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  fetchNextPage: () => void;
  fetchPreviousPage: () => void;
  refetch: () => void;
  // High Priority Enhancements
  updateOptimistically: (optimisticData: Partial<TData[]>, mutationFn: () => Promise<void>) => void;
  retry: () => void;
  retryCount: number;
  syncStatus: "online" | "offline" | "syncing";
  // Medium Priority Enhancements
  isConnected: boolean;
  metrics: PerformanceMetrics;
}

export type UniversalFetchFunction<TResponse> = (
  pageParam: any,
  signal: AbortSignal,
  meta: { pageIndex: number; previousPageParam?: any }
) => Promise<TResponse>;

// New interfaces for enhancements
export interface PerformanceMetrics {
  fetchTime: number;
  cacheHitRate: number;
  retryCount: number;
  lastFetchTimestamp: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}

export interface OptimisticUpdate<T> {
  data: Partial<T>;
  mutationFn: () => Promise<void>;
  rollbackFn?: () => void;
}

export interface RetryConfig {
  attempts: number;
  delay: number;
  exponentialBackoff: boolean;
  onError?: (error: any, attempt: number) => void;
}

export interface BackgroundSyncConfig {
  enabled: boolean;
  offlineSupport: boolean;
  syncInterval?: number;
  onSync?: (data: any) => void;
}

export interface RealtimeConfig {
  enabled: boolean;
  subscriptionUrl?: string;
  onUpdate?: (newData: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface CacheConfig {
  strategy: "default" | "stale-while-revalidate" | "cache-first" | "network-first";
  cacheTime: number;
  backgroundRefetch: boolean;
  version?: string;
}

export interface MetricsConfig {
  enabled: boolean;
  onMetrics?: (metrics: PerformanceMetrics) => void;
  trackCacheHits?: boolean;
  trackFetchTimes?: boolean;
}

