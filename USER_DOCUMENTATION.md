# User Documentation - React Data Cache Library

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Usage](#basic-usage)
3. [Data Fetching with `useData`](#data-fetching-with-usedata)
4. [Infinite Scroll](#infinite-scroll)
5. [Prefetching Data](#prefetching-data)
6. [Advanced Features](#advanced-features)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)
10. [Examples](#examples)

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

### Advanced Prefetching Strategies

```typescript
import { prefetchWithStrategy, prefetchInBackground } from 'react-data-cache';

// Prefetch with cache strategy
prefetchWithStrategy(
  'user-123',
  async (signal) => {
    const response = await fetch('/api/users/123', { signal });
    return response.json();
  },
  'stale-while-revalidate'
);

// Background prefetching
const cleanup = prefetchInBackground(
  'live-data',
  async (signal) => {
    const response = await fetch('/api/live-data', { signal });
    return response.json();
  },
  30000 // 30 seconds
);

// Cleanup function
return cleanup;
```

## Advanced Features

### 1. Optimistic Updates

```typescript
function OptimisticPostUpdate({ postId }: { postId: string }) {
  const { data, updateOptimistically } = useData<Post>(
    `post-${postId}`,
    async (signal) => {
      const response = await fetch(`/api/posts/${postId}`, { signal });
      return response.json();
    },
    { optimisticUpdates: true }
  );

  const handleLike = () => {
    updateOptimistically(
      { likes: (data?.likes || 0) + 1 },
      async () => {
        await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
      }
    );
  };

  return (
    <div>
      <h2>{data?.title}</h2>
      <button onClick={handleLike}>
        Like ({data?.likes || 0})
      </button>
    </div>
  );
}
```

### 2. Advanced Error Recovery and Retry Logic

```typescript
function RobustDataFetch({ userId }: { userId: string }) {
  const { data, error, retry, retryCount, metrics } = useData<User>(
    `user-${userId}`,
    async (signal) => {
      const response = await fetch(`/api/users/${userId}`, { signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    {
      retryAttempts: 5,
      retryDelay: 1000,
      exponentialBackoff: true,
      onError: (error, attempt) => {
        console.log(`Attempt ${attempt} failed:`, error.message);
      },
      enableMetrics: true,
      onMetrics: (metrics) => {
        console.log('Performance metrics:', metrics);
      }
    }
  );

  if (error) {
    return (
      <div className="error">
        <p>Failed to load user (attempt {retryCount})</p>
        <p>{error.message}</p>
        <button onClick={retry}>Retry</button>
        <div>
          <small>Fetch time: {metrics.fetchTime}ms</small>
          <small>Cache hit rate: {(metrics.cacheHitRate * 100).toFixed(1)}%</small>
        </div>
      </div>
    );
  }

  return <UserCard user={data} />;
}
```

### 3. Background Sync and Offline Support

```typescript
function OfflineAwarePosts() {
  const { data, syncStatus, metrics } = useData<Post[]>(
    'posts',
    async (signal) => {
      const response = await fetch('/api/posts', { signal });
      return response.json();
    },
    {
      backgroundSync: true,
      offlineSupport: true,
      staleTime: 30 * 1000, // 30 seconds
      enableMetrics: true
    }
  );

  return (
    <div>
      <div className="sync-status">
        Status: {syncStatus}
        {syncStatus === 'offline' && <span> (Working offline)</span>}
      </div>
      
      {data?.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
      
      <div className="metrics">
        <small>Total requests: {metrics.totalRequests}</small>
        <small>Success rate: {((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%</small>
      </div>
    </div>
  );
}
```

### 4. Real-time Subscriptions

```typescript
function LiveChat({ chatId }: { chatId: string }) {
  const { data, isConnected, metrics } = useData<Message[]>(
    `chat-${chatId}`,
    async (signal) => {
      const response = await fetch(`/api/chats/${chatId}/messages`, { signal });
      return response.json();
    },
    {
      realtime: true,
      subscriptionUrl: `ws://api.example.com/chats/${chatId}`,
      onUpdate: (newData) => {
        console.log('New message received:', newData);
      },
      enableMetrics: true
    }
  );

  return (
    <div className="chat">
      <div className="connection-status">
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>
      
      {data?.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
      
      <div className="metrics">
        <small>Last fetch: {new Date(metrics.lastFetchTimestamp).toLocaleTimeString()}</small>
      </div>
    </div>
  );
}
```

### 5. Advanced Caching Strategies

```typescript
function SmartUserProfile({ userId }: { userId: string }) {
  const { data, metrics } = useData<User>(
    `user-${userId}`,
    async (signal) => {
      const response = await fetch(`/api/users/${userId}`, { signal });
      return response.json();
    },
    {
      cacheStrategy: "stale-while-revalidate",
      cacheTime: 10 * 60 * 1000, // 10 minutes
      backgroundRefetch: true,
      enableMetrics: true
    }
  );

  return (
    <div>
      <UserCard user={data} />
      <div className="cache-info">
        <small>Cache hit rate: {(metrics.cacheHitRate * 100).toFixed(1)}%</small>
        <small>Average fetch time: {metrics.fetchTime}ms</small>
      </div>
    </div>
  );
}
```

### 6. Performance Monitoring

```typescript
function MonitoredDataFetch() {
  const { data, metrics } = useData<Post[]>(
    'monitored-posts',
    async (signal) => {
      const response = await fetch('/api/posts', { signal });
      return response.json();
    },
    {
      enableMetrics: true,
      onMetrics: (metrics) => {
        // Send metrics to analytics service
        analytics.track('data_fetch_metrics', {
          fetchTime: metrics.fetchTime,
          cacheHitRate: metrics.cacheHitRate,
          totalRequests: metrics.totalRequests,
          successfulRequests: metrics.successfulRequests,
          failedRequests: metrics.failedRequests
        });
      }
    }
  );

  return (
    <div>
      <h3>Performance Dashboard</h3>
      <div className="metrics-dashboard">
        <div>Fetch Time: {metrics.fetchTime}ms</div>
        <div>Cache Hit Rate: {(metrics.cacheHitRate * 100).toFixed(1)}%</div>
        <div>Total Requests: {metrics.totalRequests}</div>
        <div>Success Rate: {((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%</div>
      </div>
      
      {data?.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
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

### `useUniversalInfiniteQuery<TData, TResponse, TPageParam>(key, fetchFn, options)`

Infinite scroll hook with universal pagination support.

**Parameters:**
- `key: string | (string | number)[]` - Cache key
- `fetchFn: UniversalFetchFunction<TResponse>` - Fetch function
- `options: UniversalInfiniteOptions<TData, TPageParam>` - Configuration

### `prefetchData(key, fn, options?)`

Prefetch data for a specific key.

**Parameters:**
- `key: string` - Cache key
- `fn: FetchFunction<T>` - Fetch function
- `options?: { refetching?: boolean; retryConfig?: any; cacheStrategy?: string }` - Prefetch options

### `prefetchMulti(dataSources, options?)`

Prefetch multiple data sources.

**Parameters:**
- `dataSources: Array<{key: string, fn: FetchFunction}>` - Data sources
- `options?: { urlBasedPrefetching?: boolean; retryConfig?: any; cacheStrategy?: string; batchSize?: number }` - Prefetch options

### `prefetchWithStrategy(key, fn, strategy, options?)`

Prefetch with specific cache strategy.

**Parameters:**
- `key: string` - Cache key
- `fn: FetchFunction<T>` - Fetch function
- `strategy: "cache-first" | "network-first" | "stale-while-revalidate"` - Cache strategy
- `options?: any` - Additional options

### `prefetchInBackground(key, fn, interval?)`

Background prefetching with interval.

**Parameters:**
- `key: string` - Cache key
- `fn: FetchFunction<T>` - Fetch function
- `interval: number` - Interval in milliseconds (default: 30000)

**Returns:**
- `() => void` - Cleanup function

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
