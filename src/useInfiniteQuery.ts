import { useSyncExternalStore } from "react";
import {
    InfiniteQueryOptions,
    InfiniteDataState,
    UseInfiniteQueryResponse,
    InfiniteFetchFunction
} from "./types";
import {
    infiniteDataCache,
    subscribeInfinite,
    formatInfiniteDataResponse
} from "./infiniteCache";

export function useInfiniteQuery<T>(
    key: string,
    fn: InfiniteFetchFunction<T>,
    options: InfiniteQueryOptions<T> = {}
): UseInfiniteQueryResponse<T> {
    if (!infiniteDataCache.has(key)) {
        infiniteDataCache.set(key, {
            status: "idle",
            pages: [],
            pageParams: [],
            hasNextPage: false,
            hasPreviousPage: false
        } as InfiniteDataState<T>);
    }

    const data = useSyncExternalStore(
        subscribeInfinite,
        () => infiniteDataCache.get(key) as InfiniteDataState<T>
    );

    if (data.status === "idle") {
        const initialPageParam = options.initialPageParam ?? null;
        fetchInitialPage(key, fn, initialPageParam);
    }

    return formatInfiniteDataResponse<T>(
        data,
        key,
        fn,
        options.getNextPageParam,
        options.getPreviousPageParam
    );
}

export async function fetchInitialPage<T>(
    key: string,
    fn: InfiniteFetchFunction<T>,
    initialPageParam: any
) {
    const controller = new AbortController();

    infiniteDataCache.set(key, {
        status: "loading",
        pages: [],
        pageParams: [],
        controller
    });

    try {
        const firstPage = await fn(initialPageParam, controller.signal);

        infiniteDataCache.set(key, {
            status: "success",
            pages: [firstPage],
            pageParams: [initialPageParam],
            timestamp: Date.now()
        });
    } catch (error: any) {
        if (error?.name !== "AbortError") {
            infiniteDataCache.set(key, {
                status: "error",
                pages: [error],
                pageParams: []
            });
        }
    } finally {
        window.dispatchEvent(new Event("infiniteDataFetched"));
    }
}
