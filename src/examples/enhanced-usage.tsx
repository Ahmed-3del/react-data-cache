import React from 'react';
import { 
  useData, 
  useUniversalInfiniteQuery, 
  PaginationAdapters,
  prefetchData,
  prefetchWithStrategy,
  prefetchInBackground,
  performanceMonitor,
  clearDataCache
} from '../index';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  likes: number;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  likes: number;
  createdAt: string;
}

// Example 1: High Priority Enhancements

// 1. Optimistic Updates with Rollback
function OptimisticPostUpdate({ postId }: { postId: string }) {
  const { data, updateOptimistically } = useData<Post>(
    `post-${postId}`,
    async (signal) => {
      const response = await fetch(`/api/posts/${postId}`, { signal });
      return response.json();
    },
    {
      optimisticUpdates: true,
      staleTime: 5 * 60 * 1000
    }
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
      <p>{data?.content}</p>
      <button onClick={handleLike}>
        Like ({data?.likes || 0})
      </button>
    </div>
  );
}

// 2. Advanced Error Recovery and Retry Logic
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

  return <UserCard user={data ?? undefined} />;
}

// 3. Background Sync and Offline Support
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

// Example 2: Medium Priority Enhancements

// 4. Real-time Subscriptions

// Define a Message type if not already defined
type Message = {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
};

function LiveChat({ chatId }: { chatId: string }) {
  const { data, isConnected, metrics } = useData<Message[]>(
    `chat-${chatId}`,
    async (signal) => {
      const response = await fetch(`/api/chats/${chatId}/messages`, { signal });
      return response.json() as Promise<Message[]>;
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

// 5. Advanced Caching Strategies
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
      {data ? (
        <UserCard user={data} />
      ) : (
        <div>Loading user...</div>
      )}
      <div className="cache-info">
        <small>Cache hit rate: {(metrics.cacheHitRate * 100).toFixed(1)}%</small>
        <small>Average fetch time: {metrics.fetchTime}ms</small>
      </div>
    </div>
  );
}

// 6. Performance Monitoring
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

// Example 3: Enhanced Infinite Scroll
function EnhancedPostsList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    updateOptimistically,
    retry,
    retryCount,
    syncStatus,
    isConnected,
    metrics
  } = useUniversalInfiniteQuery<Post>(
    'enhanced-posts',
    async (pageParam, signal) => {
      const response = await fetch(`/api/posts?page=${pageParam}`, { signal });
      return response.json();
    },
    {
      ...PaginationAdapters.offsetBased<Post>(),
      // High Priority Enhancements
      optimisticUpdates: true,
      retryAttempts: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      backgroundSync: true,
      offlineSupport: true,
      // Medium Priority Enhancements
      realtime: true,
      subscriptionUrl: 'ws://api.example.com/posts-updates',
      cacheStrategy: "stale-while-revalidate",
      cacheTime: 5 * 60 * 1000,
      backgroundRefetch: true,
      enableMetrics: true,
      onMetrics: (metrics) => {
        console.log('Infinite scroll metrics:', metrics);
      }
    }
  );

  const handleLike = (postId: string, currentLikes: number) => {
    updateOptimistically(
      data.map(post => 
        post.id === postId 
          ? { ...post, likes: currentLikes + 1 }
          : post
      ),
      async () => {
        await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
      }
    );
  };

  return (
    <div className="enhanced-posts">
      <div className="status-bar">
        <span>Sync: {syncStatus}</span>
        <span>Connection: {isConnected ? '🟢' : '🔴'}</span>
        <span>Retries: {retryCount}</span>
        <span>Cache: {(metrics.cacheHitRate * 100).toFixed(1)}%</span>
      </div>
      
      {data.map(post => (
        <div key={post.id} className="post">
          <h3>{post.title}</h3>
          <p>{post.content}</p>
          <button onClick={() => handleLike(post.id, post.likes)}>
            Like ({post.likes})
          </button>
        </div>
      ))}
      
      {hasNextPage && (
        <button 
          onClick={fetchNextPage}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
      
      {retryCount > 0 && (
        <button onClick={retry}>
          Retry (Attempt {retryCount})
        </button>
      )}
    </div>
  );
}

// Example 4: Advanced Prefetching
function AdvancedPrefetching() {
  // Prefetch with strategy
  const prefetchUser = () => {
    prefetchWithStrategy(
      'user-123',
      async (signal) => {
        const response = await fetch('/api/users/123', { signal });
        return response.json();
      },
      'stale-while-revalidate'
    );
  };

  // Background prefetching
  const startBackgroundSync = () => {
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
  };

  return (
    <div>
      <button onClick={prefetchUser}>Prefetch User</button>
      <button onClick={startBackgroundSync}>Start Background Sync</button>
      <button onClick={() => clearDataCache()}>Clear Cache</button>
    </div>
  );
}

// Example 5: Complete Application
function EnhancedApp() {
  return (
    <div className="enhanced-app">
      <header>
        <h1>Enhanced Data Fetching Demo</h1>
        <AdvancedPrefetching />
      </header>
      
      <main>
        <section>
          <h2>Optimistic Updates</h2>
          <OptimisticPostUpdate postId="123" />
        </section>
        
        <section>
          <h2>Robust Error Handling</h2>
          <RobustDataFetch userId="456" />
        </section>
        
        <section>
          <h2>Offline Support</h2>
          <OfflineAwarePosts />
        </section>
        
        <section>
          <h2>Real-time Chat</h2>
          <LiveChat chatId="789" />
        </section>
        
        <section>
          <h2>Smart Caching</h2>
          <SmartUserProfile userId="123" />
        </section>
        
        <section>
          <h2>Performance Monitoring</h2>
          <MonitoredDataFetch />
        </section>
        
        <section>
          <h2>Enhanced Infinite Scroll</h2>
          <EnhancedPostsList />
        </section>
      </main>
    </div>
  );
}

// Helper components
function UserCard({ user }: { user?: User }) {
  if (!user) return <div>Loading user...</div>;
  
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
}

function PostCard({ post }: { post?: Post }) {
  if (!post) return <div>Loading post...</div>;
  
  return (
    <div className="post-card">
      <h3>{post.title}</h3>
      <p>{post.content}</p>
      <small>{new Date(post.createdAt).toLocaleDateString()}</small>
    </div>
  );
}

function MessageBubble({ message }: { message: any }) {
  return (
    <div className="message">
      <strong>{message.author}:</strong> {message.content}
    </div>
  );
}

// Mock analytics service
const analytics = {
  track: (event: string, data: any) => {
    console.log('Analytics:', event, data);
  }
};

export default EnhancedApp;
