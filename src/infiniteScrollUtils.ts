import { useEffect, useRef, useCallback } from "react";
import { InfiniteFetchFunction } from "./types";
import { infiniteDataCache } from "./infiniteCache";
import { fetchInitialPage } from "./useInfiniteQuery";

interface UseInfiniteScrollOptions {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
    threshold?: number;
    rootMargin?: string;
}

export function useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    threshold = 1.0,
    rootMargin = "100px"
}: UseInfiniteScrollOptions) {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadingRef = useRef<HTMLDivElement | null>(null);

    const handleIntersection = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const [entry] = entries;
            if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
        [hasNextPage, isFetchingNextPage, fetchNextPage]
    );

    useEffect(() => {
        if (loadingRef.current) {
            observerRef.current = new IntersectionObserver(handleIntersection, {
                threshold,
                rootMargin
            });
            observerRef.current.observe(loadingRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [handleIntersection, threshold, rootMargin]);

    return loadingRef;
}


export function useScrollToLoad(
    callback: () => void,
    dependencies: any[] = [],
    offset: number = 100
) {
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;

            if (scrollTop + clientHeight >= scrollHeight - offset) {
                callback();
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, dependencies);
}

export function prefetchInfiniteQuery<T>(
    key: string,
    fn: InfiniteFetchFunction<T>,
    initialPageParam: any = null
) {
    if (!infiniteDataCache.has(key)) {
        infiniteDataCache.set(key, {
            status: "idle",
            pages: [],
            pageParams: []
        });

        fetchInitialPage(key, fn, initialPageParam);
    }
}

export function invalidateInfiniteQuery(key: string) {
    if (infiniteDataCache.has(key)) {
        const state = infiniteDataCache.get(key);
        if (state?.controller) {
            state.controller.abort();
        }
        infiniteDataCache.delete(key);
    }
}

export function clearInfiniteCache() {
    infiniteDataCache.forEach((state) => {
        if (state.controller) {
            state.controller.abort();
        }
    });
    infiniteDataCache.clear();
}