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
