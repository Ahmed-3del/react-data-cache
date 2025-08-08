📦 React Data Fetching Library
A lightweight, dependency-free React data-fetching utility built on top of useSyncExternalStore for shared caching, prefetching, refetching, and stale-time control.

This library allows you to:

Cache API responses globally

Share data between components without prop drilling or extra context

Automatically refetch stale data

Prefetch multiple resources at once

Cancel ongoing requests when refetching

Integrate with server-side preloading strategies

🚀 Installation
Just drop the file in your project (e.g., src/lib/data-fetcher.js) and import functions from it.

js

import { useData, prefetchData, prefetchMulti, prefetchOnEvent, clearDataCache } from "@/lib/data-fetcher";
🧠 How It Works
This library uses:

Map (dataCache) → Stores fetched data, status, and AbortControllers globally.

useSyncExternalStore → Ensures React 18 concurrent mode compatibility and shared data between components.

Custom Events (window.dispatchEvent) → Re-renders components when new data arrives.

Stale Time Logic → Automatically determines when cached data is too old and needs a refetch.

🔄 Data Lifecycle Diagram
mermaid

graph TD
A[Idle] -->|First request| B[Loading]
B -->|Success| C[Success]
B -->|Error| D[Error]
C -->|After stale time| E[Refetching]
E -->|Success| C
E -->|Error| D
Explanation:

Idle → No fetch has started yet (first mount or cache cleared).

Loading → Fetch is in progress.

Success → Data fetched successfully and stored in cache.

Error → Fetch failed (network/server issue).

Refetching → Background refresh when data is stale or refetch() is called.

:

🔄 Data Flow Between Functions
mermaid
Copy
Edit
flowchart TD
subgraph Component
A[useData(key, fn, options)]
A -->|Check cache| B{dataCache.has(key)?}
B -->|No| C[Set status: idle]
B -->|Yes| D[Return cached data]
C --> E[fetchOrUsePreloadedData]
end

    subgraph Prefetch Logic
        E --> F[prefetchData]
        F -->|Abort ongoing request if exists| G[AbortController.abort()]
        F --> H[Set status: loading or isRefetching]
        H -->|Call fn(signal)| I[Fetch request]
        I -->|Success| J[Update cache: status success + payload + timestamp]
        I -->|Error| K[Update cache: status error + payload]
        J --> L[Dispatch "dataFetched" event]
        K --> L
    end

    subgraph Event System
        L --> M[subscribe(callback) in useData]
        M --> N[Trigger re-render via useSyncExternalStore]
    end

    subgraph Extra Features
        O[prefetchMulti] --> F
        P[prefetchOnEvent] --> E
        Q[clearDataCache] --> R[Clear global cache]
    end

Flow Explanation
useData checks the cache for the key:

If not found → Sets status to idle and calls fetchOrUsePreloadedData.

If found → Returns the cached data.

fetchOrUsePreloadedData calls prefetchData with either the given fn or a preloaded function from preloadedDataSources.

prefetchData:

Aborts any ongoing request for the same key.

Stores the status (loading or isRefetching) in the cache.

Calls your provided fn(signal) fetch function.

On success → Saves data to the cache with a timestamp.

On error → Saves error info.

Triggers a "dataFetched" event so subscribers know to re-render.

subscribe in useData listens to "dataFetched" and updates the component using useSyncExternalStore.

Extra utilities:

prefetchMulti → Prefetch multiple keys at once.

prefetchOnEvent → Trigger fetch when some UI/DOM event happens.

clearDataCache → Wipes all cached entries.

With this diagram + the lifecycle chart, a dev reading your docs will understand:

How data moves from the fetch function into the component

When a fetch is aborted

When and why components re-render

How prefetching fits into the flow

📌 Core Concepts

1. Cache
   All fetched data is stored in a global Map keyed by a unique string (key).

Data can be accessed by multiple components without re-fetching.

Clearing the cache is possible via clearDataCache().

2. Statuses
   Status Meaning
   idle No fetch has started yet.
   loading Fetch in progress.
   success Data fetched successfully.
   error Fetch failed.
   isRefetching Fetch in progress after previous success.

3. AbortController
   Cancels ongoing requests when a new fetch for the same key starts.

4. Stale Time
   Controls how long cached data stays "fresh".

Default is 5 seconds.

Can be customized per request via options.staleTime.

📚 API Documentation
useData(key, fn, options)
Fetch and subscribe to cached data inside React components.

js

const { data, isLoading, error, refetch } = useData(
"user-profile",
(signal) => fetch("/api/user", { signal }).then(res => res.json()),
{ staleTime: 10000, refetchOnMount: true }
);
Parameters:
key (string) – Unique identifier for the request.

fn (function) – Fetch function that accepts an AbortSignal and returns a Promise.

options (object):

staleTime (number, optional) – How long data stays fresh (default: 5000 ms).

refetchOnMount (boolean, optional) – Refetch if data is stale when component mounts.

Returns:
An object:

ts

{
isLoading: boolean,
data: any,
error: any,
isRefetching: boolean,
refetch: () => void
}
prefetchData(key, fn, options)
Fetch data in the background without rendering it yet.

js

await prefetchData("posts", (signal) => fetch("/api/posts", { signal }).then(res => res.json()));
Parameters:
key (string) – Unique identifier.

fn (function) – Fetch function.

options (object, optional):

refetching (boolean) – Marks this as a background refetch.

prefetchMulti(dataSources, options)
Prefetch multiple data sources in parallel.

js
await prefetchMulti([
{ key: "posts", fn: (signal) => fetch("/api/posts", { signal }).then(res => res.json()) },
{ key: "users", fn: (signal) => fetch("/api/users", { signal }).then(res => res.json()) }
], { urlBasedPrefetching: true });
Parameters:
dataSources (array) – List of { key, fn } objects.

options (object):

urlBasedPrefetching (boolean) – Only fetch sources matching window.location.pathname.

prefetchOnEvent(key, fn)
Start fetching when a specific condition or event triggers.

js

window.addEventListener("scroll", () => prefetchOnEvent("comments", fetchComments));
clearDataCache()
Clear all cached data.

js

clearDataCache();
💡 Example Usage
jsx

import React, { useEffect } from "react";
import { useData, prefetchData, clearDataCache } from "@/lib/data-fetcher";

export default function UserProfile() {
const { data, isLoading, error, refetch } = useData(
"user-profile",
(signal) => fetch("/api/user", { signal }).then(res => res.json()),
{ staleTime: 10000, refetchOnMount: true }
);

useEffect(() => {
prefetchData("posts", (signal) => fetch("/api/posts", { signal }).then(res => res.json()));
}, []);

if (isLoading) return <p>Loading...</p>;
if (error) return <p>Error loading profile</p>;

return (
<div>
<h1>{data.name}</h1>
<button onClick={refetch}>Refresh</button>
<button onClick={clearDataCache}>Clear Cache</button>
</div>
);
}
⚠️ Notes & Gotchas
Key Uniqueness
Always use a unique key per request. Otherwise, different API calls may overwrite each other.

Abort Support
Your fn must accept the signal argument and pass it to fetch or any API client that supports it.

Global Cache
Data is shared across the entire app — any component using the same key gets the same data.

Stale Time
If staleTime is too short, you’ll get more frequent network requests. If it’s too long, you may serve outdated data.
