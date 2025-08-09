# React Data Cache

> ⚡ Lightweight React hook for **caching**, **prefetching**, and **stale-time** control — works in **JavaScript** and **TypeScript**.

[![npm version](https://img.shields.io/npm/v/react-fetch-cache.svg)](https://www.npmjs.com/package/react-fetch-cache)
[![license](https://img.shields.io/npm/l/react-fetch-cache.svg)](LICENSE)

## ✨ Features

- 🗄 **Global cache** for fetched data
- ⏱ **Stale time** control to avoid unnecessary network calls
- 🚀 **Prefetch** data before components mount
- 🔄 **Refetch** on demand or after stale time
- 🛑 **Request cancellation** with `AbortController`
- 🎯 Works with **JavaScript** and **TypeScript**

---

## 📦 Installation

```sh
npm install react-fetch-cache
# or
yarn add react-fetch-cache



🚀 Quick Start
Example: Basic usage
jsx
Copy
Edit
import { useData } from "react-fetch-cache";

export function PostList() {
  const { data, isLoading, error, refetch } = useData("posts", (signal) =>
    fetch("/api/posts", { signal }).then((r) => r.json())
  );

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Something went wrong.</p>;

  return (
    <div>
      {data.map((post) => (
        <p key={post.id}>{post.title}</p>
      ))}
      <button onClick={refetch}>Refetch</button>
    </div>
  );
}
Example: Prefetch before rendering
js
Copy
Edit
import { prefetchData } from "react-fetch-cache";

// Prefetch posts early
prefetchData("posts", (signal) =>
  fetch("/api/posts", { signal }).then((r) => r.json())
);
🛠 API Reference
useData(key, fn, options?)
Fetches and caches data.

Parameter	Type	Description
key	string	Unique cache key
fn	(signal: AbortSignal) => Promise<T>	Async fetch function
options.staleTime	number (ms)	Time before data is considered stale
options.refetchOnMount	boolean	Refetch if data is stale when mounting

Returns:

ts
Copy
Edit
{
  isLoading: boolean;
  isRefetching: boolean;
  data: T | null;
  error: any;
  refetch: () => void;
}
prefetchData(key, fn, options?)
Fetches and caches data without rendering a component.

prefetchMulti(dataSources, options?)
Prefetch multiple datasets in parallel.

prefetchOnEvent(key, fn)
Prefetch data when a specific UI/DOM event happens.

clearDataCache()
Wipes the global cache.

🔄 Data Lifecycle Diagram
mermaid
Copy
Edit
sequenceDiagram
    participant C as Component
    participant H as useData
    participant P as prefetchData
    participant Cache as Global Cache

    C->>H: Call useData(key, fn)
    H->>Cache: Check if data exists
    alt Not in cache
        H->>P: Call prefetchData
        P->>Cache: Set status=loading
        P->>API: Fetch data
        API-->>P: Response
        P->>Cache: Set status=success + timestamp
        P->>H: Trigger "dataFetched" event
    else In cache
        H->>Cache: Return cached data
    end
```
## 📜 License
This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
