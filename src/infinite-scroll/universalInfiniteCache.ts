import { UniversalInfiniteState } from "../types";

export const universalInfiniteCache = new Map<string, UniversalInfiniteState<any>>();

export function subscribeUniversal(callback: () => void) {
    window.addEventListener("universalInfiniteDataFetched", callback);
    return () => window.removeEventListener("universalInfiniteDataFetched", callback);
}

export function emitUniversalUpdate() {
    window.dispatchEvent(new Event("universalInfiniteDataFetched"));
}

