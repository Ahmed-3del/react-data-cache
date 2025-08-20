# User Documentation - React Data Cache Library

## Table of Contents
1. [Getting Started](#getting-started)
2. [Basic Usage](#basic-usage)
3. [Data Fetching with `useData`](#data-fetching-with-usedata)
4. [Prefetching Data](#prefetching-data)
5. [Infinite Scroll](#infinite-scroll)
6. [Advanced Features](#advanced-features)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)
10. [Examples](#examples)
11. [Why Not useEffect?](#why-not-useeffect)
12. [Enhancement Suggestions](#enhancement-suggestions)

## Getting Started

### Installation

```bash
npm install react-data-cache
# or
yarn add react-data-cache
```

### Requirements

- React 18.0.0 or higher
- TypeScript (recommended)

### Quick Start

```typescript
import { useData } from 'react-data-cache';

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error, refetch } = useData(
    `user-${userId}`,
    async (signal) => {
      const response = await fetch(`/api/users/${userId}`, { signal });
      return response.json();
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

## Basic Usage

### Core Concepts

The library provides three main features:

1. **Data Fetching**: Simple hook-based data fetching with caching
2. **Prefetching**: Proactive data loading for better UX
3. **Infinite Scroll**: Universal pagination support

### Key Benefits

- **Zero Configuration**: Works out of the box with sensible defaults
- **Automatic Caching**: Data is cached and shared across components
- **Type Safety**: Full TypeScript support with automatic type inference
- **Performance**: Efficient re-renders and request cancellation
- **Flexible**: Works with any API structure

## Data Fetching with `useData`

### Basic Example

```typescript
import { useData } from 'react-data-cache';

function PostsList() {
  const { data, isLoading, error, refetch } = useData(
    'posts',
    async (signal) => {
      const response = await fetch('/api/posts', { signal });
      return response.json();
    }
  );

  if (isLoading) return <div>Loading posts...</div>;
  if (error) return <div>Failed to load posts</div>;

  return (
    <div>
      {data.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
      <button onClick={refetch}>Refresh Posts</button>
    </div>
  );
}
```

### Configuration Options

```typescript
const { data, isLoading, error, refetch } = useData(
  'posts',
  fetchPosts,
  {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    noCache: false
  }
);
```

**Options:**
- `staleTime`: How long data is considered fresh (default: 5 seconds)
- `refetchOnMount`: Whether to refetch when component mounts (default: false)
- `noCache`: Bypass cache entirely (default: false)

### Return Values

```typescript
interface UseDataResponse<T> {
  data: T | null;           // The fetched data
  isLoading: boolean;       // True during initial load
  error: any;              // Error object if fetch failed
  isRefetching: boolean;   // True during refetch
  refetch: () => void;     // Function to manually refetch
}
```

### Error Handling

```typescript
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error, refetch } = useData(
    `user-${userId}`,
    async (signal) => {
      const response = await fetch(`/api/users/${userId}`, { signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="error">
        <p>Failed to load user profile</p>
        <p>{error.message}</p>
        <button onClick={refetch}>Try Again</button>
      </div>
    );
  }

  return <UserCard user={data} />;
}
```

## Prefetching Data

### Basic Prefetching

```typescript
import { prefetchData } from 'react-data-cache';

// Prefetch data for a specific key
prefetchData('posts', async (signal) => {
  const response = await fetch('/api/posts', { signal });
  return response.json();
});
```

### Route-Based Prefetching

```typescript
import { prefetchMulti } from 'react-data-cache';

// Prefetch multiple data sources
prefetchMulti([
  { key: 'posts', fn: fetchPosts },
  { key: 'users', fn: fetchUsers },
  { key: 'comments', fn: fetchComments }
]);
```

### Event-Based Prefetching

```typescript
import { prefetchOnEvent } from 'react-data-cache';

function PostCard({ post }: { post: Post }) {
  const handleMouseEnter = () => {
    // Prefetch comments when user hovers over post
    prefetchOnEvent(`comments-${post.id}`, async (signal) => {
      const response = await fetch(`/api/posts/${post.id}/comments`, { signal });
      return response.json();
    });
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      <h3>{post.title}</h3>
      <p>{post.excerpt}</p>
    </div>
  );
}
```

### URL-Based Prefetching

```typescript
// Only prefetch data for current route
prefetchMulti([
  { key: 'posts', fn: fetchPosts },
  { key: 'users', fn: fetchUsers }
], { urlBasedPrefetching: true });
```

## Infinite Scroll

### Basic Infinite Scroll

```typescript
import { useUniversalInfiniteQuery, PaginationAdapters } from 'react-data-cache';

function PostsList() {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useUniversalInfiniteQuery(
    'posts',
    async (pageParam, signal) => {
      const response = await fetch(`/api/posts?page=${pageParam}`, { signal });
      return response.json();
    },
    {
      ...PaginationAdapters.offsetBased<Post>(),
      staleTime: 5 * 60 * 1000
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
      
      {hasNextPage && (
        <button 
          onClick={fetchNextPage}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### Cursor-Based Pagination

```typescript
function CommentsList({ postId }: { postId: string }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useUniversalInfiniteQuery(
    `comments-${postId}`,
    async (cursor, signal) => {
      const url = cursor 
        ? `/api/posts/${postId}/comments?cursor=${cursor}`
        : `/api/posts/${postId}/comments`;
      const response = await fetch(url, { signal });
      return response.json();
    },
    {
      ...PaginationAdapters.cursorBased<Comment>()
    }
  );

  return (
    <div>
      {data.map(comment => (
        <CommentCard key={comment.id} comment={comment} />
      ))}
      
      {hasNextPage && (
        <button onClick={fetchNextPage}>
          Load More Comments
        </button>
      )}
    </div>
  );
}
```

### Custom Pagination Adapter

```typescript
function CustomPaginationExample() {
  const {
    data,
    fetchNextPage,
    hasNextPage
  } = useUniversalInfiniteQuery(
    'custom-data',
    async (pageParam, signal) => {
      const response = await fetch(`/api/data?offset=${pageParam}`, { signal });
      return response.json();
    },
    {
      ...PaginationAdapters.custom<DataItem>({
        selectData: (response) => response.items,
        getNext: (response, currentOffset = 0) => {
          return response.hasMore ? currentOffset + response.items.length : undefined;
        },
        initialParam: 0
      })
    }
  );

  return (
    <div>
      {data.map(item => (
        <DataItem key={item.id} item={item} />
      ))}
      
      {hasNextPage && (
        <button onClick={fetchNextPage}>Load More</button>
      )}
    </div>
  );
}
```

### Bidirectional Infinite Scroll

```typescript
function ChatMessages({ chatId }: { chatId: string }) {
  const {
    data,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage
  } = useUniversalInfiniteQuery(
    `messages-${chatId}`,
    async (pageParam, signal, meta) => {
      const response = await fetch(
        `/api/chats/${chatId}/messages?cursor=${pageParam}`,
        { signal }
      );
      return response.json();
    },
    {
      ...PaginationAdapters.cursorBased<Message>(),
      getPreviousPageParam: (response) => response.previousCursor
    }
  );

  return (
    <div className="chat-container">
      {hasPreviousPage && (
        <button 
          onClick={fetchPreviousPage}
          disabled={isFetchingPreviousPage}
        >
          {isFetchingPreviousPage ? 'Loading...' : 'Load Older Messages'}
        </button>
      )}
      
      {data.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
      
      {hasNextPage && (
        <button 
          onClick={fetchNextPage}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load Newer Messages'}
        </button>
      )}
    </div>
  );
}
```

## Advanced Features

### Cache Management

```typescript
import { clearDataCache } from 'react-data-cache';

// Clear all cached data
function handleLogout() {
  clearDataCache();
  // Navigate to login page
}

// Clear specific data
function handlePostUpdate() {
  // Clear posts cache to force refresh
  clearDataCache();
  // Or use a more specific approach by refetching
  refetch();
}
```

### Conditional Fetching

```typescript
function ConditionalDataFetch({ userId, enabled }: { userId: string; enabled: boolean }) {
  const { data, isLoading } = useData(
    `user-${userId}`,
    async (signal) => {
      const response = await fetch(`/api/users/${userId}`, { signal });
      return response.json();
    },
    {
      // Only fetch if enabled is true
      enabled: enabled
    }
  );

  if (!enabled) return <div>Data fetching disabled</div>;
  if (isLoading) return <div>Loading...</div>;

  return <UserProfile user={data} />;
}
```

### Optimistic Updates

```typescript
function OptimisticPostUpdate({ post }: { post: Post }) {
  const { data, refetch } = useData(
    `post-${post.id}`,
    fetchPost
  );

  const handleLike = async () => {
    // Optimistically update UI
    const optimisticData = { ...data, likes: data.likes + 1 };
    
    try {
      await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
      // Refetch to get actual server state
      refetch();
    } catch (error) {
      // Revert optimistic update on error
      refetch();
    }
  };

  return (
    <div>
      <h2>{data.title}</h2>
      <button onClick={handleLike}>
        Like ({data.likes})
      </button>
    </div>
  );
}
```

### Background Refetching

```typescript
function AutoRefreshingData() {
  const { data, refetch } = useData(
    'live-data',
    fetchLiveData,
    {
      staleTime: 30 * 1000, // 30 seconds
      refetchOnMount: true
    }
  );

  // Set up background refetching
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 60 * 1000); // Refetch every minute

    return () => clearInterval(interval);
  }, [refetch]);

  return <LiveDataDisplay data={data} />;
}
```

## Best Practices

### 1. Cache Key Strategy

Use descriptive, unique cache keys:

```typescript
// Good cache keys
'user-profile-123'
'posts-page-1'
'comments-post-456'
'search-results-react-tutorial'

// Avoid generic keys
'data'
'response'
'items'
```

### 2. Error Handling

Always handle errors gracefully:

```typescript
function RobustDataFetch() {
  const { data, isLoading, error, refetch } = useData(
    'important-data',
    async (signal) => {
      const response = await fetch('/api/important-data', { signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    return (
      <ErrorBoundary 
        error={error}
        onRetry={refetch}
        fallback={<ErrorFallback />}
      />
    );
  }

  return <DataDisplay data={data} />;
}
```

### 3. Performance Optimization

```typescript
// Use appropriate stale times
const { data } = useData(
  'user-profile',
  fetchUserProfile,
  { staleTime: 5 * 60 * 1000 } // 5 minutes for user data
);

const { data: liveData } = useData(
  'live-updates',
  fetchLiveUpdates,
  { staleTime: 10 * 1000 } // 10 seconds for live data
);

// Prefetch data for better UX
useEffect(() => {
  prefetchData('next-page-data', fetchNextPageData);
}, []);
```

### 4. Type Safety

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
}

function TypedDataFetch() {
  const { data: user } = useData<User>(
    'user-123',
    async (signal) => {
      const response = await fetch('/api/users/123', { signal });
      return response.json();
    }
  );

  const { data: posts } = useData<Post[]>(
    'posts',
    async (signal) => {
      const response = await fetch('/api/posts', { signal });
      return response.json();
    }
  );

  // TypeScript knows the types
  return (
    <div>
      <h1>{user?.name}</h1>
      {posts?.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

### 5. Component Organization

```typescript
// Separate data fetching logic
function useUserData(userId: string) {
  return useData(
    `user-${userId}`,
    async (signal) => {
      const response = await fetch(`/api/users/${userId}`, { signal });
      return response.json();
    }
  );
}

function useUserPosts(userId: string) {
  return useData(
    `user-posts-${userId}`,
    async (signal) => {
      const response = await fetch(`/api/users/${userId}/posts`, { signal });
      return response.json();
    }
  );
}

// Use in components
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading: userLoading } = useUserData(userId);
  const { data: posts, isLoading: postsLoading } = useUserPosts(userId);

  if (userLoading || postsLoading) return <LoadingSpinner />;

  return (
    <div>
      <UserInfo user={user} />
      <PostsList posts={posts} />
    </div>
  );
}
```

## Troubleshooting

### Common Issues

#### 1. Data Not Updating

```typescript
// Problem: Data not refreshing
const { data } = useData('key', fetchFn);

// Solution: Use appropriate stale time or manual refetch
const { data, refetch } = useData('key', fetchFn, {
  staleTime: 0, // Always consider data stale
  refetchOnMount: true
});
```

#### 2. Memory Leaks

```typescript
// Problem: Abandoned requests causing memory leaks
// Solution: Library handles this automatically with AbortController
// But ensure proper cleanup in your fetch functions

const fetchWithTimeout = async (signal: AbortSignal) => {
  const timeoutId = setTimeout(() => {
    // This will be cleaned up automatically
  }, 5000);
  
  try {
    const response = await fetch('/api/data', { signal });
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};
```

#### 3. Type Errors

```typescript
// Problem: TypeScript errors with generic types
// Solution: Provide explicit types

interface ApiResponse<T> {
  data: T;
  status: string;
}

const { data } = useData<ApiResponse<User>>(
  'user',
  async (signal) => {
    const response = await fetch('/api/user', { signal });
    return response.json();
  }
);
```

#### 4. Infinite Re-renders

```typescript
// Problem: Component re-rendering infinitely
// Solution: Ensure stable cache keys and fetch functions

// Good: Stable key
const { data } = useData('posts', fetchPosts);

// Bad: Changing key on every render
const { data } = useData(`posts-${Date.now()}`, fetchPosts);

// Good: Stable fetch function
const fetchPosts = useCallback(async (signal: AbortSignal) => {
  const response = await fetch('/api/posts', { signal });
  return response.json();
}, []);

// Bad: New function on every render
const { data } = useData('posts', async (signal) => {
  const response = await fetch('/api/posts', { signal });
  return response.json();
});
```

## API Reference

### `useData<T>(key, fn, options?)`

Main data fetching hook.

**Parameters:**
- `key: string` - Unique cache key
- `fn: FetchFunction<T>` - Fetch function
- `options?: UseDataOptions` - Configuration options

**Returns:**
- `UseDataResponse<T>` - Data state and controls

### `prefetchData(key, fn, options?)`

Prefetch data for a specific key.

**Parameters:**
- `key: string` - Cache key
- `fn: FetchFunction<T>` - Fetch function
- `options?: { refetching?: boolean }` - Prefetch options

### `prefetchMulti(dataSources, options?)`

Prefetch multiple data sources.

**Parameters:**
- `dataSources: Array<{key: string, fn: FetchFunction}>` - Data sources
- `options?: { urlBasedPrefetching?: boolean }` - Prefetch options

### `useUniversalInfiniteQuery(key, fetchFn, options)`

Infinite scroll hook with universal pagination support.

**Parameters:**
- `key: string | (string | number)[]` - Cache key
- `fetchFn: UniversalFetchFunction<TResponse>` - Fetch function
- `options: UniversalInfiniteOptions<TData, TPageParam>` - Configuration

### `clearDataCache()`

Clear all cached data.

### `PaginationAdapters`

Pre-built pagination adapters:
- `offsetBased<T>()` - Page/limit pagination
- `cursorBased<T>()` - Cursor-based pagination
- `linkBased<T>()` - Link-based pagination
- `skipTotal<T>(limit)` - Skip/total pagination
- `custom<T, R>(config)` - Custom pagination

## Examples

### Complete Application Example

```typescript
import React from 'react';
import { 
  useData, 
  useUniversalInfiniteQuery, 
  PaginationAdapters,
  prefetchData 
} from 'react-data-cache';

// Types
interface User {
  id: string;
  name: string;
  email: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
}

// Custom hooks
function useUser(userId: string) {
  return useData<User>(
    `user-${userId}`,
    async (signal) => {
      const response = await fetch(`/api/users/${userId}`, { signal });
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
    { staleTime: 5 * 60 * 1000 }
  );
}

function usePosts() {
  return useUniversalInfiniteQuery<Post>(
    'posts',
    async (pageParam, signal) => {
      const response = await fetch(`/api/posts?page=${pageParam}`, { signal });
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json();
    },
    {
      ...PaginationAdapters.offsetBased<Post>(),
      staleTime: 2 * 60 * 1000
    }
  );
}

// Components
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error, refetch } = useUser(userId);

  if (isLoading) return <div>Loading user profile...</div>;
  if (error) {
    return (
      <div className="error">
        <p>Failed to load user profile</p>
        <button onClick={refetch}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

function PostsList() {
  const {
    data: posts,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = usePosts();

  // Prefetch next page on hover
  const handleLoadMoreHover = () => {
    if (hasNextPage) {
      prefetchData('posts-next', async (signal) => {
        const response = await fetch('/api/posts?page=2', { signal });
        return response.json();
      });
    }
  };

  if (isLoading) return <div>Loading posts...</div>;
  if (error) return <div>Error loading posts: {error.message}</div>;

  return (
    <div className="posts-list">
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
      
      {hasNextPage && (
        <button 
          className="load-more"
          onClick={fetchNextPage}
          onMouseEnter={handleLoadMoreHover}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More Posts'}
        </button>
      )}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const { data: author } = useUser(post.authorId);

  return (
    <div className="post-card">
      <h3>{post.title}</h3>
      <p>{post.content}</p>
      {author && <p>By: {author.name}</p>}
      <small>{new Date(post.createdAt).toLocaleDateString()}</small>
    </div>
  );
}

// Main App
function App() {
  return (
    <div className="app">
      <header>
        <h1>My Blog</h1>
      </header>
      <main>
        <UserProfile userId="123" />
        <PostsList />
      </main>
    </div>
  );
}

export default App;
```

This user documentation provides comprehensive guidance on how to use the library effectively, with practical examples and best practices for real-world applications.

## Why Not useEffect?

### Problems with useEffect for Data Fetching

Using `useEffect` for data fetching is a common anti-pattern that leads to numerous issues:

#### 1. **Memory Leaks and Race Conditions**

```typescript
// ❌ BAD: useEffect with race conditions
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        setUser(data); // ⚠️ Race condition: might be stale
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [userId]);

  // Problems:
  // - No request cancellation when userId changes
  // - Race conditions if multiple requests are in flight
  // - Memory leaks from abandoned requests
  // - No cleanup on unmount
}
```

#### 2. **No Caching or Deduplication**

```typescript
// ❌ BAD: No caching, duplicate requests
function PostList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => setPosts(data));
  }, []);

  // Problems:
  // - Same data fetched multiple times
  // - No sharing between components
  // - Unnecessary network requests
  // - Poor performance
}

// Multiple components fetch the same data
function App() {
  return (
    <div>
      <PostList /> {/* Fetches posts */}
      <PostCount /> {/* Fetches posts again! */}
      <RecentPosts /> {/* Fetches posts again! */}
    </div>
  );
}
```

#### 3. **Complex State Management**

```typescript
// ❌ BAD: Complex state management
function DataComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refetching, setRefetching] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    try {
      setRefetching(true);
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setRefetching(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Problems:
  // - Boilerplate code for every component
  // - Manual state management
  // - Error-prone state updates
  // - No automatic retry logic
}
```

#### 4. **No Stale-Time Control**

```typescript
// ❌ BAD: No stale-time control
function LiveData() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = () => {
      fetch('/api/live-data')
        .then(res => res.json())
        .then(setData);
    };

    fetchData(); // Initial fetch
    
    const interval = setInterval(fetchData, 5000); // Always refetch every 5s
    
    return () => clearInterval(interval);
  }, []);

  // Problems:
  // - Always refetches regardless of data freshness
  // - No intelligent caching
  // - Wastes bandwidth and server resources
  // - Poor user experience with unnecessary loading states
}
```

#### 5. **No Request Cancellation**

```typescript
// ❌ BAD: No request cancellation
function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    
    setLoading(true);
    fetch(`/api/search?q=${query}`)
      .then(res => res.json())
      .then(data => {
        setResults(data); // ⚠️ Might be stale if query changed
        setLoading(false);
      });
  }, [query]);

  // Problems:
  // - Abandoned requests continue running
  // - Memory leaks
  // - Race conditions
  // - Poor performance
}
```

### How Our Library Solves These Problems

#### 1. **Automatic Request Cancellation**

```typescript
// ✅ GOOD: Automatic request cancellation
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useData(
    `user-${userId}`,
    async (signal) => {
      const response = await fetch(`/api/users/${userId}`, { signal });
      return response.json();
    }
  );

  // Benefits:
  // - Automatic cancellation when userId changes
  // - No race conditions
  // - No memory leaks
  // - Clean, simple code
}
```

#### 2. **Built-in Caching and Deduplication**

```typescript
// ✅ GOOD: Automatic caching and deduplication
function PostList() {
  const { data: posts } = useData('posts', fetchPosts);
  return <div>{/* render posts */}</div>;
}

function PostCount() {
  const { data: posts } = useData('posts', fetchPosts); // Uses cached data!
  return <div>Total: {posts.length}</div>;
}

function RecentPosts() {
  const { data: posts } = useData('posts', fetchPosts); // Uses cached data!
  return <div>{/* render recent posts */}</div>;
}

// Benefits:
// - Single network request for all components
// - Automatic data sharing
// - Better performance
// - Reduced server load
```

#### 3. **Simple State Management**

```typescript
// ✅ GOOD: Simple, declarative state management
function DataComponent() {
  const { data, isLoading, error, refetch } = useData(
    'my-data',
    async (signal) => {
      const response = await fetch('/api/data', { signal });
      return response.json();
    }
  );

  // Benefits:
  // - No manual state management
  // - Built-in loading, error, and refetch states
  // - Less boilerplate code
  // - Fewer bugs
}
```

#### 4. **Intelligent Stale-Time Control**

```typescript
// ✅ GOOD: Intelligent stale-time control
function LiveData() {
  const { data, refetch } = useData(
    'live-data',
    fetchLiveData,
    {
      staleTime: 30 * 1000, // 30 seconds
      refetchOnMount: true
    }
  );

  // Set up background refetching only when needed
  useEffect(() => {
    const interval = setInterval(refetch, 60 * 1000); // Refetch every minute
    return () => clearInterval(interval);
  }, [refetch]);

  // Benefits:
  // - Only refetches when data is stale
  // - Configurable stale times
  // - Better performance
  // - Reduced server load
}
```

#### 5. **Automatic Request Deduplication**

```typescript
// ✅ GOOD: Automatic request deduplication
function SearchResults({ query }: { query: string }) {
  const { data: results, isLoading } = useData(
    `search-${query}`,
    async (signal) => {
      const response = await fetch(`/api/search?q=${query}`, { signal });
      return response.json();
    },
    {
      staleTime: 5 * 60 * 1000 // Cache for 5 minutes
    }
  );

  // Benefits:
  // - Automatic request cancellation
  // - No race conditions
  // - Cached results for repeated searches
  // - Better user experience
}
```

### Performance Comparison

| Feature | useEffect | Our Library |
|---------|-----------|-------------|
| **Request Cancellation** | ❌ Manual | ✅ Automatic |
| **Caching** | ❌ None | ✅ Built-in |
| **Deduplication** | ❌ None | ✅ Automatic |
| **Stale-time Control** | ❌ Manual | ✅ Configurable |
| **State Management** | ❌ Complex | ✅ Simple |
| **Memory Leaks** | ❌ Common | ✅ Prevented |
| **Race Conditions** | ❌ Common | ✅ Eliminated |
| **Code Complexity** | ❌ High | ✅ Low |
| **Performance** | ❌ Poor | ✅ Optimized |
| **Developer Experience** | ❌ Poor | ✅ Excellent |

### Real-World Example: User Dashboard

```typescript
// ❌ BAD: useEffect approach (100+ lines of complex code)
function UserDashboard({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refetching, setRefetching] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      setUser(data);
    } catch (err) {
      setError(err);
    }
  }, [userId]);

  const fetchPosts = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/${userId}/posts`);
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      setError(err);
    }
  }, [userId]);

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/${userId}/comments`);
      const data = await response.json();
      setComments(data);
    } catch (err) {
      setError(err);
    }
  }, [userId]);

  const refetch = useCallback(async () => {
    setRefetching(true);
    try {
      await Promise.all([fetchUser(), fetchPosts(), fetchComments()]);
    } catch (err) {
      setError(err);
    } finally {
      setRefetching(false);
    }
  }, [fetchUser, fetchPosts, fetchComments]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUser(), fetchPosts(), fetchComments()])
      .finally(() => setLoading(false));
  }, [fetchUser, fetchPosts, fetchComments]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <UserInfo user={user} />
      <PostsList posts={posts} />
      <CommentsList comments={comments} />
      <button onClick={refetch} disabled={refetching}>
        {refetching ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );
}

// ✅ GOOD: Our library approach (30 lines of clean code)
function UserDashboard({ userId }: { userId: string }) {
  const { data: user, isLoading: userLoading, error: userError } = useData(
    `user-${userId}`,
    async (signal) => {
      const response = await fetch(`/api/users/${userId}`, { signal });
      return response.json();
    }
  );

  const { data: posts, isLoading: postsLoading, error: postsError } = useData(
    `user-posts-${userId}`,
    async (signal) => {
      const response = await fetch(`/api/users/${userId}/posts`, { signal });
      return response.json();
    }
  );

  const { data: comments, isLoading: commentsLoading, error: commentsError } = useData(
    `user-comments-${userId}`,
    async (signal) => {
      const response = await fetch(`/api/users/${userId}/comments`, { signal });
      return response.json();
    }
  );

  const isLoading = userLoading || postsLoading || commentsLoading;
  const error = userError || postsError || commentsError;

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <UserInfo user={user} />
      <PostsList posts={posts} />
      <CommentsList comments={comments} />
    </div>
  );
}
```

