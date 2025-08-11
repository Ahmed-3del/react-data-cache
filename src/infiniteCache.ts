
import { UseInfiniteQueryResponse, InfiniteDataState, InfiniteFetchFunction } from "./types";
export const infiniteDataCache = new Map<string, InfiniteDataState<any>>();


export function subscribeInfinite(callback: () => void) {
    window.addEventListener("infiniteDataFetched", callback);
    return () => window.removeEventListener("infiniteDataFetched", callback);
}

export function formatInfiniteDataResponse<T>(
    state: InfiniteDataState<T>,
    key: string,
    fn: InfiniteFetchFunction<T>,
    getNextPageParam?: (lastPage: T, allPages: T[]) => any,
    getPreviousPageParam?: (firstPage: T, allPages: T[]) => any
): UseInfiniteQueryResponse<T> {
    const currentState = infiniteDataCache.get(key);

    const hasNextPage = getNextPageParam && state.pages.length > 0
        ? getNextPageParam(state.pages[state.pages.length - 1], state.pages) !== undefined
        : false;

    const hasPreviousPage = getPreviousPageParam && state.pages.length > 0
        ? getPreviousPageParam(state.pages[0], state.pages) !== undefined
        : false;

    return {
        data: state.pages.flat() as T[],
        isLoading: state.status === "loading",
        error: state.status === "error" ? state.pages[0] : null,
        isFetchingNextPage: state.status === "fetchingNextPage",
        isFetchingPreviousPage: state.status === "fetchingPreviousPage",
        hasNextPage,
        hasPreviousPage,
        fetchNextPage: () => fetchInfinitePage(key, fn, "next", getNextPageParam),
        fetchPreviousPage: () => fetchInfinitePage(key, fn, "previous", getPreviousPageParam),
        refetch: () => refetchInfiniteQuery(key, fn)
    };
}

async function fetchInfinitePage<T>(
    key: string,
    fn: InfiniteFetchFunction<T>,
    direction: "next" | "previous",
    getPageParam?: (page: T, allPages: T[]) => any
) {
    const currentState = infiniteDataCache.get(key);
    if (!currentState || !getPageParam) return;

    if (currentState.status === "fetchingNextPage" || currentState.status === "fetchingPreviousPage") {
        return;
    }

    const pageParam = direction === "next"
        ? getPageParam(currentState.pages[currentState.pages.length - 1], currentState.pages)
        : getPageParam(currentState.pages[0], currentState.pages);

    if (pageParam === undefined) return;

    if (currentState.controller) {
        currentState.controller.abort();
    }

    const newController = new AbortController();
    const status = direction === "next" ? "fetchingNextPage" : "fetchingPreviousPage";

    infiniteDataCache.set(key, {
        ...currentState,
        status,
        controller: newController
    });

    try {
        const newPage = await fn(pageParam, newController.signal);
        const updatedState = infiniteDataCache.get(key);

        if (updatedState) {
            const newPages = direction === "next"
                ? [...updatedState.pages, newPage]
                : [newPage, ...updatedState.pages];

            const newPageParams = direction === "next"
                ? [...updatedState.pageParams, pageParam]
                : [pageParam, ...updatedState.pageParams];

            infiniteDataCache.set(key, {
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
            const updatedState = infiniteDataCache.get(key);
            if (updatedState) {
                infiniteDataCache.set(key, {
                    ...updatedState,
                    status: "error",
                    pages: [error],
                    controller: undefined
                });
            }
        }
    } finally {
        window.dispatchEvent(new Event("infiniteDataFetched"));
    }
}

async function refetchInfiniteQuery<T>(key: string, fn: InfiniteFetchFunction<T>) {
    const currentState = infiniteDataCache.get(key);
    if (!currentState || currentState.pageParams.length === 0) return;

    if (currentState.controller) {
        currentState.controller.abort();
    }

    const newController = new AbortController();

    infiniteDataCache.set(key, {
        ...currentState,
        status: "loading",
        controller: newController
    });

    try {
        const refetchedPages: T[] = [];
        for (const pageParam of currentState.pageParams) {
            const page = await fn(pageParam, newController.signal);
            refetchedPages.push(page);
        }

        infiniteDataCache.set(key, {
            ...currentState,
            status: "success",
            pages: refetchedPages,
            timestamp: Date.now(),
            controller: undefined
        });
    } catch (error: any) {
        if (error?.name !== "AbortError") {
            infiniteDataCache.set(key, {
                ...currentState,
                status: "error",
                pages: [error],
                controller: undefined
            });
        }
    } finally {
        window.dispatchEvent(new Event("infiniteDataFetched"));
    }
}
