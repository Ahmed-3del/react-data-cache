# React Data Cache Library

A lightweight, performant React library for data fetching with built-in caching, prefetching, infinite scroll, and advanced features. Designed for modern React applications with TypeScript support.

## 🚀 Features

- **⚡ Zero Configuration** - Works out of the box with sensible defaults
- **💾 Automatic Caching** - Data is cached and shared across components
- **🔄 Smart Refetching** - Intelligent stale-time based refetching
- **📱 Infinite Scroll** - Universal pagination support for any API
- **🎯 Prefetching** - Proactive data loading for better UX
- **🔒 Type Safety** - Full TypeScript support with automatic type inference
- **⚡ Performance** - Efficient re-renders and request cancellation
- **🌐 Universal** - Works with any API structure and pagination pattern

### 🆕 **NEW: Advanced Features**

#### **High Priority Enhancements**

- **🎯 Optimistic Updates** - Instant UI updates with automatic rollback
- **🔄 Advanced Retry Logic** - Exponential backoff with custom error handling
- **📱 Background Sync** - Offline support with automatic synchronization

#### **Medium Priority Enhancements**

- **🔌 Real-time Subscriptions** - WebSocket integration for live updates
- **💾 Advanced Caching** - Multiple cache strategies (stale-while-revalidate, cache-first, etc.)
- **📊 Performance Monitoring** - Built-in metrics and analytics

## 📊 **Comparison with SWR**

| Feature | React Data Cache | SWR |
|---------|------------------|-----|
| **Bundle Size** | ~15KB (gzipped) | ~12KB (gzipped) |
| **Advanced Features** | ✅ Built-in | ⚠️ Manual implementation |
| **Real-time Support** | ✅ WebSocket | ❌ Polling only |
| **Offline Support** | ✅ Built-in | ❌ Manual setup |
| **Performance Monitoring** | ✅ Built-in | ❌ Manual tracking |
| **React Suspense** | ❌ Not yet | ✅ Native support |
| **DevTools** | ❌ Not yet | ✅ Built-in |

**[📖 Detailed Comparison with SWR](./COMPARISON_WITH_SWR.md)** - Comprehensive feature-by-feature analysis

**Why Choose React Data Cache?**

- 🚀 **More Advanced Features** out of the box
- 🔌 **Real-time Support** with WebSocket integration
- 📱 **Offline Support** with background sync
- 📊 **Performance Monitoring** built-in
- 🎯 **Universal Pagination** for any API pattern

## 📦 Installation

```bash
npm install react-data-cache
# or
yarn add react-data-cache
```

## 🎯 Quick Start

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

## 🆕 **Enhanced Usage Examples**

### 1. **Optimistic Updates with Rollback**

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

### 2. **Advanced Error Recovery and Retry Logic**

```typescript
function RobustDataFetch({ userId }: { userId: string }) {
  const { data, error, retry, retryCount, metrics } = useData<User>(
    `user-${userId}`,
    async (signal) => {
      const response = await fetch(`/api/users/${userId}`, { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    {
      retryAttempts: 5,
      retryDelay: 1000,
      exponentialBackoff: true,
      onError: (error, attempt) => {
        console.log(`Attempt ${attempt} failed:`, error.message);
      },
      enableMetrics: true
    }
  );

  if (error) {
    return (
      <div>
        <p>Failed to load user (attempt {retryCount})</p>
        <button onClick={retry}>Retry</button>
        <small>Fetch time: {metrics.fetchTime}ms</small>
      </div>
    );
  }

  return <UserCard user={data} />;
}
```

### 3. **Background Sync and Offline Support**

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
      staleTime: 30 * 1000
    }
  );

  return (
    <div>
      <div>Status: {syncStatus}</div>
      {data?.map(post => <PostCard key={post.id} post={post} />)}
    </div>
  );
}
```

### 4. **Real-time Subscriptions**

```typescript
function LiveChat({ chatId }: { chatId: string }) {
  const { data, isConnected } = useData<Message[]>(
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
      }
    }
  );

  return (
    <div>
      <div>{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      {data?.map(message => <MessageBubble key={message.id} message={message} />)}
    </div>
  );
}
```

### 5. **Advanced Caching Strategies**

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
      <small>Cache hit rate: {(metrics.cacheHitRate * 100).toFixed(1)}%</small>
    </div>
  );
}
```

### 6. **Performance Monitoring**

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
        // Send to analytics service
        analytics.track('data_fetch_metrics', metrics);
      }
    }
  );

  return (
    <div>
      <div>Fetch Time: {metrics.fetchTime}ms</div>
      <div>Cache Hit Rate: {(metrics.cacheHitRate * 100).toFixed(1)}%</div>
      {data?.map(post => <PostCard key={post.id} post={post} />)}
    </div>
  );
}
```

## 📚 Documentation

- **[User Documentation](./USER_DOCUMENTATION.md)** - Complete guide for using the library
- **[Developer Documentation](./DEVELOPER_DOCUMENTATION.md)** - Architecture and implementation details
- **[Comparison with SWR](./COMPARISON_WITH_SWR.md)** - Detailed feature comparison

## 🔧 Core API

### `useData<T>(key, fn, options?)`

Main data fetching hook with caching and enhancements.

```typescript
const { 
  data, 
  isLoading, 
  error, 
  refetch,
  // High Priority Enhancements
  updateOptimistically,
  retry,
  retryCount,
  syncStatus,
  // Medium Priority Enhancements
  isConnected,
  metrics
} = useData(
  'posts',
  async (signal) => {
    const response = await fetch('/api/posts', { signal });
    return response.json();
  },
  {
    // Standard options
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    
    // High Priority Enhancements
    optimisticUpdates: true,
    retryAttempts: 5,
    retryDelay: 1000,
    exponentialBackoff: true,
    backgroundSync: true,
    offlineSupport: true,
    
    // Medium Priority Enhancements
    realtime: true,
    subscriptionUrl: 'ws://api.example.com/updates',
    cacheStrategy: "stale-while-revalidate",
    cacheTime: 10 * 60 * 1000,
    backgroundRefetch: true,
    enableMetrics: true,
    onMetrics: (metrics) => console.log(metrics)
  }
);
```

### `useUniversalInfiniteQuery<TData, TResponse, TPageParam>(key, fetchFn, options)`

Infinite scroll with universal pagination support and enhancements.

```typescript
import { PaginationAdapters } from 'react-data-cache';

const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  // High Priority Enhancements
  updateOptimistically,
  retry,
  retryCount,
  syncStatus,
  // Medium Priority Enhancements
  isConnected,
  metrics
} = useUniversalInfiniteQuery(
  'posts',
  async (pageParam, signal) => {
    const response = await fetch(`/api/posts?page=${pageParam}`, { signal });
    return response.json();
  },
  {
    ...PaginationAdapters.offsetBased<Post>(),
    // All enhancement options available here too
    optimisticUpdates: true,
    retryAttempts: 3,
    backgroundSync: true,
    realtime: true,
    enableMetrics: true
  }
);
```

### Enhanced Prefetching Utilities

```typescript
import { 
  prefetchData, 
  prefetchMulti, 
  prefetchWithStrategy, 
  prefetchInBackground 
} from 'react-data-cache';

// Prefetch with retry logic
prefetchData('posts', fetchPosts, {
  retryConfig: {
    attempts: 3,
    delay: 1000,
    exponentialBackoff: true
  }
});

// Prefetch with cache strategy
prefetchWithStrategy('user-123', fetchUser, 'stale-while-revalidate');

// Background prefetching
const cleanup = prefetchInBackground('live-data', fetchLiveData, 30000);
```

## 🎨 Pagination Adapters

The library provides pre-built adapters for common pagination patterns:

### Offset-Based Pagination

```typescript
PaginationAdapters.offsetBased<Post>()
```

### Cursor-Based Pagination

```typescript
PaginationAdapters.cursorBased<Post>()
```

### Link-Based Pagination

```typescript
PaginationAdapters.linkBased<Post>()
```

### Custom Adapter

```typescript
PaginationAdapters.custom<Post>({
  selectData: (response) => response.items,
  getNext: (response, currentOffset = 0) => {
    return response.hasMore ? currentOffset + response.items.length : undefined;
  },
  initialParam: 0
})
```

## 🔄 State Management

The library uses a centralized cache system with the following states:

- **idle** - Initial state, no data loaded
- **loading** - Fetch in progress
- **success** - Data loaded successfully
- **error** - Fetch failed
- **isRefetching** - Refetch in progress (preserves existing data)

## ⚡ Performance Features

- **Efficient Caching** - Map-based cache with O(1) lookup
- **Request Cancellation** - AbortController integration for performance
- **Event-Driven Updates** - Cross-component state synchronization
- **Stale-Time Control** - Intelligent refetching based on data age
- **Memory Management** - Proper cleanup and leak prevention
- **Performance Monitoring** - Built-in metrics and analytics
- **Advanced Caching** - Multiple cache strategies for different use cases

## 🛠️ Advanced Usage

### Conditional Fetching

```typescript
const { data } = useData(
  `user-${userId}`,
  fetchUser,
  { enabled: !!userId }
);
```

### Optimistic Updates

```typescript
const handleLike = () => {
  updateOptimistically(
    { likes: data.likes + 1 },
    async () => {
      await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    }
  );
};
```

### Background Refetching

```typescript
useEffect(() => {
  const interval = setInterval(refetch, 60000); // Refetch every minute
  return () => clearInterval(interval);
}, [refetch]);
```

## 🔧 Configuration Options

### `useData` Options

- `staleTime` - How long data is considered fresh (default: 5 seconds)
- `refetchOnMount` - Whether to refetch when component mounts (default: false)
- `noCache` - Bypass cache entirely (default: false)

#### **High Priority Enhancement Options**

- `optimisticUpdates` - Enable optimistic updates (default: false)
- `retryAttempts` - Number of retry attempts (default: 0)
- `retryDelay` - Delay between retries in ms (default: 1000)
- `exponentialBackoff` - Use exponential backoff (default: true)
- `onError` - Custom error handler function
- `backgroundSync` - Enable background sync (default: false)
- `offlineSupport` - Enable offline support (default: false)

#### **Medium Priority Enhancement Options**

- `realtime` - Enable real-time subscriptions (default: false)
- `subscriptionUrl` - WebSocket URL for real-time updates
- `onUpdate` - Callback for real-time updates
- `cacheStrategy` - Cache strategy ("default", "stale-while-revalidate", "cache-first", "network-first")
- `cacheTime` - How long to cache data (default: 5 minutes)
- `backgroundRefetch` - Enable background refetching (default: false)
- `enableMetrics` - Enable performance monitoring (default: false)
- `onMetrics` - Callback for performance metrics

### `useUniversalInfiniteQuery` Options

- `select` - Extract items from API response
- `getNextPageParam` - Determine next page parameter
- `getPreviousPageParam` - Determine previous page parameter (for bidirectional)
- `initialPageParam` - Initial page parameter
- `transformPage` - Transform each page response before storing
- `hasNextPage` - Check if there are more pages (fallback)
- `staleTime` - How long data is considered fresh
- `refetchOnMount` - Whether to refetch when component mounts
- `enabled` - Whether to enable the query
- **All enhancement options from `useData` are also available**

## 🧪 Examples

See the [User Documentation](./USER_DOCUMENTATION.md) for comprehensive examples including:

- Basic data fetching
- Error handling
- Infinite scroll implementations
- Prefetching strategies
- Performance optimization
- Type safety examples
- Complete application examples
- **NEW: Enhanced features examples**

## 🔍 Troubleshooting

Common issues and solutions:

### Data Not Updating

```typescript
// Use appropriate stale time or manual refetch
const { data, refetch } = useData('key', fetchFn, {
  staleTime: 0, // Always consider data stale
  refetchOnMount: true
});
```

### Type Errors

```typescript
// Provide explicit types
const { data } = useData<User>('user', fetchUser);
```

### Memory Leaks

The library handles request cancellation automatically with AbortController. Ensure proper cleanup in your fetch functions.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./contributing.md) and [Developer Documentation](./DEVELOPER_DOCUMENTATION.md) for details.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🆘 Support

- 📖 [User Documentation](./USER_DOCUMENTATION.md) - Complete usage guide
- 🔧 [Developer Documentation](./DEVELOPER_DOCUMENTATION.md) - Architecture details
- 🐛 [Issues](https://github.com/your-repo/issues) - Report bugs or request features
- 💬 [Discussions](https://github.com/your-repo/discussions) - Ask questions and share ideas

## 🚀 Roadmap

- [x] Optimistic updates with rollback
- [x] Advanced error recovery and retry logic
- [x] Background sync and offline support
- [x] Real-time subscriptions
- [x] Advanced caching strategies
- [x] Performance monitoring
- [ ] Request queuing and batching
- [ ] Server-side rendering (SSR) support
- [ ] GraphQL integration
- [ ] Middleware system

---

**Built with ❤️ for the React community**
