export type FetchFunction<T> = (signal: AbortSignal) => Promise<T>;

export interface DataState<T> {
  status: "idle" | "loading" | "success" | "error" | "isRefetching";
  payload: T | null;
  controller?: AbortController;
  timestamp?: number;
}

export interface UseDataOptions {
  staleTime?: number;
  refetchOnMount?: boolean;
  noCache?: boolean;
}

export interface UseDataResponse<T> {
  isLoading: boolean;
  data: T | null;
  error: any;
  isRefetching: boolean;
  refetch: () => void;
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
}

export interface UniversalInfiniteState<TData> {
  status: "idle" | "loading" | "success" | "error" | "fetchingNextPage" | "fetchingPreviousPage";
  pages: any[];
  pageParams: any[];
  data: TData[];
  error: any;
  timestamp?: number;
  controller?: AbortController;
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
}

export type UniversalFetchFunction<TResponse> = (
  pageParam: any,
  signal: AbortSignal,
  meta: { pageIndex: number; previousPageParam?: any }
) => Promise<TResponse>;

