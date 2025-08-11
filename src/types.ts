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
}

export interface UseDataResponse<T> {
  isLoading: boolean;
  data: T | null;
  error: any;
  isRefetching: boolean;
  refetch: () => void;
}

export interface InfiniteQueryOptions<T> extends UseDataOptions {
  initialPageParam?: any;
  getNextPageParam?: (lastPage: T, allPages: T[]) => any;
  getPreviousPageParam?: (firstPage: T, allPages: T[]) => any;
}

export interface InfiniteDataState<T> {
  status: "idle" | "loading" | "success" | "error" | "fetchingNextPage" | "fetchingPreviousPage";
  pages: T[];
  pageParams: any[];
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  controller?: AbortController;
  timestamp?: number;
}

export interface UseInfiniteQueryResponse<T> {
  data: T[];
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

export type InfiniteFetchFunction<T> = (pageParam: any, signal: AbortSignal) => Promise<T>;
