import { dataCache } from "./cache";
import { FetchFunction } from "./types";

export function prefetchData<T>(
  key: string,
  fn: FetchFunction<T>,
  options: { refetching?: boolean } = {}
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

  fn(signal)
    .then((data) => {
      dataCache.set(key, {
        status: "success",
        payload: data,
        timestamp: Date.now(),
      });
    })
    .catch((error) => {
      if (error?.name !== "AbortError") {
        dataCache.set(key, {
          status: "error",
          payload: error,
        });
      }
    })
    .finally(() => {
      window.dispatchEvent(new Event("dataFetched"));
    });
}

export function prefetchMulti(
  dataSources: { key: string; fn: FetchFunction<any> }[],
  options?: { urlBasedPrefetching?: boolean }
) {
  if (options?.urlBasedPrefetching) {
    dataSources = dataSources.filter(
      (ds) => ds.key === window.location.pathname
    );
  }
  return Promise.all(dataSources.map(({ key, fn }) => prefetchData(key, fn)));
}

export function prefetchOnEvent<T>(key: string, fn: FetchFunction<T>) {
  if (!dataCache.has(key)) {
    prefetchData(key, fn);
  }
}
