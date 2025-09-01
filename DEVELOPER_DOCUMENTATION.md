# Developer Documentation - React Data Cache Library

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Design Principles](#core-design-principles)
3. [Module Architecture](#module-architecture)
4. [State Management Strategy](#state-management-strategy)
5. [Caching Implementation](#caching-implementation)
6. [Event System Design](#event-system-design)
7. [Type System Architecture](#type-system-architecture)
8. [Performance Optimizations](#performance-optimizations)
9. [Enhancement Features](#enhancement-features)
10. [Testing Strategy](#testing-strategy)
11. [Contributing Guidelines](#contributing-guidelines)

## Architecture Overview

### Why This Architecture?

The React Data Cache Library is built around a **centralized cache system** with **event-driven updates** and **progressive enhancement**. This architecture was chosen for several key reasons:

1. **Performance**: Centralized cache eliminates duplicate requests and enables efficient data sharing
2. **Simplicity**: Event-driven updates reduce complexity compared to state management libraries
3. **Flexibility**: Progressive enhancement allows users to start simple and add features as needed
4. **React 18 Compatibility**: Uses `useSyncExternalStore` for concurrent features support

### Core Architecture Components

```
src/
├── index.ts                 # Public API exports
├── types.ts                 # TypeScript type definitions
├── cache.ts                 # Core caching mechanism
├── useData.ts              # Main data fetching hook
├── prefetch.ts             # Prefetching utilities
├── enhancements.ts         # Advanced feature managers
└── infinite-scroll/
    ├── useUniversalInfiniteQuery.ts    # Infinite scroll hook
    └── universalInfiniteCache.ts       # Infinite scroll cache
```

**Why this structure?**

- **Separation of Concerns**: Each module has a single responsibility
- **Tree-shakable**: Users only import what they need
- **Maintainable**: Clear boundaries between functionality
- **Testable**: Each module can be tested in isolation

## Core Design Principles

### 1. Simplicity First

**Why?** Complex APIs lead to confusion and bugs. Simple APIs are easier to learn, use, and maintain.

**Implementation:**

```typescript
// Simple, intuitive API
const { data, isLoading, error } = useData('key', fetchFn);

// Instead of complex configuration
const { data, isLoading, error } = useData('key', fetchFn, {
  staleTime: 5000,
  refetchOnMount: true,
  retryAttempts: 3,
  // ... many more options
});
```

**Benefits:**

- **Zero Configuration**: Works out of the box
- **Progressive Enhancement**: Add features as needed
- **Reduced Cognitive Load**: Developers can focus on business logic
- **Fewer Bugs**: Less configuration means fewer configuration errors

### 2. Performance by Default

**Why?** Performance should not be an afterthought. Every design decision considers performance implications.

**Implementation:**

```typescript
// Map-based cache for O(1) lookups
export const dataCache = new Map<string, DataState<any>>();

// AbortController for request cancellation
const controller = new AbortController();
const signal = newController.signal;

// Event-driven updates for efficient re-renders
window.dispatchEvent(new Event("dataFetched"));
```

**Benefits:**

- **Fast Cache Lookups**: O(1) time complexity
- **Memory Efficient**: No unnecessary object creation
- **Request Cancellation**: Prevents memory leaks and race conditions
- **Efficient Updates**: Only re-renders when data actually changes

### 3. Universal Design

**Why?** APIs come in many shapes and sizes. A universal design works with any API structure.

**Implementation:**

```typescript
// Universal pagination adapters
export const PaginationAdapters = {
  offsetBased: <T>() => ({ /* works with page/limit */ }),
  cursorBased: <T>() => ({ /* works with cursors */ }),
  linkBased: <T>() => ({ /* works with next/prev URLs */ }),
  custom: <T, R>(config) => ({ /* works with anything */ })
};
```

**Benefits:**

- **API Agnostic**: Works with any backend
- **Reduced Boilerplate**: Pre-built adapters for common patterns
- **Flexible**: Custom adapters for unique requirements
- **Future Proof**: Adapts to new API patterns

## Module Architecture

### 1. `types.ts` - Type System Foundation

**Why TypeScript?**
TypeScript provides compile-time safety, better IDE support, and self-documenting code.

**Key Design Decisions:**

#### Generic Type Parameters

```typescript
export function useData<T>(
  key: string,
  fn: FetchFunction<T>,
  options: UseDataOptions = {}
): UseDataResponse<T>
```

**Why generics?**

- **Type Safety**: Prevents runtime type errors
- **IntelliSense**: Better IDE autocomplete
- **Self-Documenting**: Types serve as documentation
- **Flexibility**: Works with any data type

#### Strict Interfaces

```typescript
export interface DataState<T> {
  status: "idle" | "loading" | "success" | "error" | "isRefetching";
  payload: T | null;
  controller?: AbortController;
  timestamp?: number;
}
```

**Why strict interfaces?**

- **Compile-time Errors**: Catch bugs before runtime
- **API Contract**: Clear expectations for data structure
- **Refactoring Safety**: TypeScript catches breaking changes
- **Documentation**: Interfaces serve as living documentation

#### Optional Properties with Sensible Defaults

```typescript
export interface UseDataOptions {
  staleTime?: number;        // Default: 5 seconds
  refetchOnMount?: boolean;   // Default: false
  noCache?: boolean;         // Default: false
}
```

**Why optional properties?**

- **Backward Compatibility**: New options don't break existing code
- **Progressive Enhancement**: Users can add features incrementally
- **Sensible Defaults**: Works without configuration
- **Flexibility**: Users can override defaults when needed

### 2. `cache.ts` - Core Caching Mechanism

**Why Map-based Cache?**

```typescript
export const dataCache = new Map<string, DataState<any>>();
```

**Benefits:**

- **O(1) Lookup**: Constant time complexity
- **Memory Efficient**: No hash collisions or rehashing
- **Simple API**: Standard Map methods
- **Iterable**: Easy to iterate over cache entries
- **No External Dependencies**: Built into JavaScript

**Alternative Considered:**

- **Object-based cache**: `{}` - Slower lookups, no iteration
- **WeakMap**: Garbage collection issues with string keys
- **Custom implementation**: Unnecessary complexity

#### Event-Driven Updates

```typescript
export function subscribe(callback: () => void) {
  window.addEventListener("dataFetched", callback);
  return () => window.removeEventListener("dataFetched", callback);
}
```

**Why DOM events?**

- **Cross-Component**: Updates all subscribed components simultaneously
- **Lightweight**: No external event system needed
- **Browser Native**: Leverages built-in browser capabilities
- **React 18 Compatible**: Works with concurrent features
- **Simple**: No complex state management required

**Alternative Considered:**

- **Custom event system**: Unnecessary complexity
- **React Context**: Performance issues with frequent updates
- **State management library**: Adds dependencies and complexity

#### State Lifecycle Management

```typescript
export function formatDataResponse<T>(
  { status, payload }: DataState<T>,
  key: string,
  fn: FetchFunction<T>
) {
  const statusResponse: Record<string, any> = {
    idle: { isLoading: true },
    loading: { isLoading: true },
    success: { data: payload },
    error: { error: payload },
    isRefetching: { isRefetching: true, data: payload }
  };
  return statusResponse[status];
}
```

**Why status-based state?**

- **Predictable**: Clear state transitions
- **UI Friendly**: Each status maps to UI state
- **Debuggable**: Easy to understand current state
- **Extensible**: Easy to add new states

### 3. `useData.ts` - Main Data Fetching Hook

**Why `useSyncExternalStore`?**

```typescript
const data = useSyncExternalStore(
  subscribe,
  () => dataCache.get(key) as DataState<T>
);
```

**Benefits:**

- **React 18 Compatible**: Works with concurrent features
- **External State**: No React state management overhead
- **Efficient Updates**: Only re-renders when data changes
- **SSR Friendly**: Proper hydration support
- **Future Proof**: React's recommended approach

**Alternative Considered:**

- **useState + useEffect**: Performance issues, complex state management
- **useReducer**: Overkill for simple state
- **Custom hook**: Would need to reimplement React's optimizations

#### Stale-Time Logic

```typescript
const isStale = Date.now() - (data.timestamp || 0) > (options.staleTime ?? defaultStaleTime);
```

**Why timestamp-based staleness?**

- **Simple**: Easy to understand and debug
- **Accurate**: Based on actual time elapsed
- **Configurable**: Different stale times for different data
- **Performance**: Avoids unnecessary refetches

**Alternative Considered:**

- **Version-based**: Complex to implement and maintain
- **Hash-based**: Expensive to compute
- **Manual invalidation**: Requires user intervention

### 4. `prefetch.ts` - Prefetching Utilities

**Why Separate Prefetching?**
Prefetching is a distinct concern from data fetching. Separation allows for:

- **Reusability**: Prefetching can be used independently
- **Flexibility**: Different prefetching strategies
- **Performance**: Optimized for different use cases
- **Testing**: Can be tested in isolation

#### Request Cancellation

```typescript
const existingController = dataCache.get(key)?.controller;
if (existingController && dataCache.get(key)?.status === "loading") {
  existingController.abort();
}
```

**Why AbortController?**

- **Standard API**: Built into browsers
- **Memory Management**: Prevents memory leaks
- **Performance**: Stops unnecessary network requests
- **User Experience**: Responsive UI during rapid interactions

**Alternative Considered:**

- **Custom cancellation**: Would need to reimplement browser functionality
- **Timeout-based**: Less reliable than AbortController
- **No cancellation**: Would cause memory leaks and race conditions

### 5. `enhancements.ts` - Advanced Feature Managers

**Why Class-Based Managers?**

```typescript
export class RetryManager {
  private config: RetryConfig;
  private currentAttempt = 0;
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Implementation
  }
}
```

**Benefits:**

- **Encapsulation**: Internal state is protected
- **Reusability**: Can be used across different contexts
- **Testability**: Easy to mock and test
- **Extensibility**: Easy to add new methods
- **Type Safety**: Better TypeScript support

**Alternative Considered:**

- **Function-based**: Would need to pass state around
- **Singleton**: Would prevent multiple instances
- **React hooks**: Would tie to React lifecycle

#### Exponential Backoff

```typescript
const delay = this.config.exponentialBackoff 
  ? this.config.delay * Math.pow(2, this.currentAttempt - 1)
  : this.config.delay;
```

**Why exponential backoff?**

- **Network Friendly**: Reduces server load during outages
- **User Experience**: Faster recovery when issues are resolved
- **Standard Practice**: Industry standard for retry logic
- **Configurable**: Can be disabled for different use cases

## State Management Strategy

### Why Centralized State?

**Benefits:**

- **Data Sharing**: Multiple components can share the same data
- **Performance**: Eliminates duplicate requests
- **Consistency**: All components see the same data
- **Memory Efficiency**: Single source of truth

**Implementation:**

```typescript
// Global cache shared across all components
export const dataCache = new Map<string, DataState<any>>();

// Event-driven updates ensure consistency
window.dispatchEvent(new Event("dataFetched"));
```

### State Transitions

```
idle → loading → success
  ↓       ↓        ↓
error ← error ← error
  ↓
isRefetching → success
```

**Why these states?**

- **idle**: Initial state, no data loaded
- **loading**: Fetch in progress, show loading UI
- **success**: Data loaded successfully, show data
- **error**: Fetch failed, show error UI
- **isRefetching**: Refetch in progress, preserve existing data

**Benefits:**

- **Predictable**: Clear state transitions
- **UI Friendly**: Each state maps to UI behavior
- **Debuggable**: Easy to understand current state
- **User Experience**: Preserves data during refetches

## Caching Implementation

### Cache Key Strategy

**Why String Keys?**

```typescript
// Good cache keys
"user-profile-123"
"posts-page-1"
"comments-post-456"
```

**Benefits:**

- **Simple**: Easy to understand and debug
- **Predictable**: Same data always uses same key
- **Descriptive**: Keys indicate what data is cached
- **Flexible**: Can include any information in key

**Best Practices:**

- **Unique**: Different data sources have different keys
- **Stable**: Keys don't change between renders
- **Descriptive**: Keys should indicate data content
- **Hierarchical**: Use separators for related data

### Cache Invalidation

**Strategies:**

1. **Stale-Time Based**: Automatic invalidation after time period
2. **Manual Invalidation**: User-triggered cache clearing
3. **No-Cache Mode**: Bypass cache entirely
4. **Refetch on Mount**: Force refresh when component mounts

**Why Multiple Strategies?**

- **Flexibility**: Different use cases need different strategies
- **Performance**: Avoid unnecessary network requests
- **User Control**: Users can override default behavior
- **Real-time Data**: Some data needs frequent updates

## Event System Design

### Why DOM Events?

**Benefits:**

- **Cross-Component**: Updates all subscribed components
- **Decoupled**: Components don't need direct references
- **Efficient**: No polling or manual synchronization
- **Simple**: No external event system required
- **Browser Native**: Leverages built-in capabilities

**Implementation:**

```typescript
// Subscribe to updates
const unsubscribe = subscribe(() => {
  // Handle state change
});

// Cleanup on unmount
return unsubscribe;
```

**Alternative Considered:**

- **Custom event system**: Unnecessary complexity
- **React Context**: Performance issues with frequent updates
- **State management library**: Adds dependencies
- **Polling**: Inefficient and resource intensive

### Event Types

1. **dataFetched**: Regular data cache updates
2. **universalInfiniteDataFetched**: Infinite scroll cache updates

**Why Separate Events?**

- **Performance**: Only update relevant components
- **Clarity**: Clear separation of concerns
- **Debugging**: Easier to track event flow
- **Extensibility**: Easy to add new event types

## Type System Architecture

### Generic Type Parameters

**Why Extensive Generics?**

```typescript
function useData<T>(
  key: string,
  fn: FetchFunction<T>,
  options: UseDataOptions = {}
): UseDataResponse<T>
```

**Benefits:**

- **Type Safety**: Prevents runtime type errors
- **IntelliSense**: Better IDE autocomplete
- **Self-Documenting**: Types serve as documentation
- **Flexibility**: Works with any data type
- **Refactoring Safety**: TypeScript catches breaking changes

### Type Constraints

**Why Flexible Constraints?**

```typescript
// T: Data type (any)
// TResponse: API response type (any)
// TPageParam: Page parameter type (any)
```

**Benefits:**

- **Universal**: Works with any API structure
- **Flexible**: No assumptions about data shape
- **Extensible**: Easy to add new data types
- **Future Proof**: Adapts to new API patterns

### Type Inference

**Why Automatic Inference?**

```typescript
const { data } = useData("users", fetchUsers);
// data is automatically typed as User[]
```

**Benefits:**

- **Less Boilerplate**: No manual type annotations
- **Reduced Errors**: TypeScript infers correct types
- **Better DX**: Less code to write and maintain
- **Consistency**: Types are always correct

## Performance Optimizations

### 1. Efficient Re-renders

**Why `useSyncExternalStore`?**

- **React 18 Compatible**: Works with concurrent features
- **External State**: No React state management overhead
- **Efficient Updates**: Only re-renders when data changes
- **SSR Friendly**: Proper hydration support

### 2. Memory Optimization

**Why Map-based Cache?**

- **O(1) Lookup**: Constant time complexity
- **Memory Efficient**: No hash collisions or rehashing
- **Simple API**: Standard Map methods
- **No External Dependencies**: Built into JavaScript

**Why AbortController?**

- **Memory Management**: Prevents memory leaks
- **Performance**: Stops unnecessary network requests
- **Standard API**: Built into browsers
- **User Experience**: Responsive UI during rapid interactions

### 3. Network Optimization

**Why Request Deduplication?**

- **Performance**: Eliminates duplicate requests
- **Server Load**: Reduces server load
- **User Experience**: Faster response times
- **Consistency**: All components see same data

**Why Stale-Time Control?**

- **Performance**: Avoids unnecessary refetches
- **User Experience**: Faster loading times
- **Server Load**: Reduces server load
- **Configurable**: Different stale times for different data

### 4. Bundle Size Optimization

**Why Tree-shakable Design?**

- **Performance**: Smaller bundle sizes
- **Flexibility**: Users only import what they need
- **Maintainability**: Clear module boundaries
- **Future Proof**: Easy to add new features

## Enhancement Features

### 1. Optimistic Updates

**Why Built-in Optimistic Updates?**

```typescript
const { data, updateOptimistically } = useData(
  'post-123',
  fetchPost,
  { optimisticUpdates: true }
);

const handleLike = () => {
  updateOptimistically(
    { likes: data.likes + 1 },
    async () => {
      await fetch('/api/posts/123/like', { method: 'POST' });
    }
  );
};
```

**Benefits:**

- **Instant Feedback**: UI updates immediately
- **Better UX**: Users see immediate response
- **Automatic Rollback**: Handles errors gracefully
- **Simple API**: Easy to implement

**Why Automatic Rollback?**

- **Error Handling**: Graceful error recovery
- **Data Consistency**: Ensures data integrity
- **User Experience**: Clear error feedback
- **Reliability**: Robust error handling

### 2. Advanced Retry Logic

**Why Exponential Backoff?**

```typescript
const delay = this.config.exponentialBackoff 
  ? this.config.delay * Math.pow(2, this.currentAttempt - 1)
  : this.config.delay;
```

**Benefits:**

- **Network Friendly**: Reduces server load during outages
- **User Experience**: Faster recovery when issues are resolved
- **Standard Practice**: Industry standard for retry logic
- **Configurable**: Can be disabled for different use cases

**Why Custom Error Handlers?**

- **Flexibility**: Different error handling for different scenarios
- **Debugging**: Better error tracking and logging
- **User Experience**: Custom error messages and recovery
- **Monitoring**: Integration with error tracking services

### 3. Background Sync

**Why Built-in Offline Support?**

```typescript
const { data, syncStatus } = useData(
  'posts',
  fetchPosts,
  {
    backgroundSync: true,
    offlineSupport: true
  }
);
```

**Benefits:**

- **Offline Experience**: Works without internet
- **Background Sync**: Syncs when connection returns
- **User Experience**: Seamless offline/online transition
- **Reliability**: Robust network handling

**Why Network Status Detection?**

- **User Experience**: Clear offline/online indicators
- **Performance**: Optimize for network conditions
- **Reliability**: Handle network changes gracefully
- **Debugging**: Better network issue diagnosis

### 4. Real-time Subscriptions

**Why WebSocket Integration?**

```typescript
const { data, isConnected } = useData(
  'live-chat',
  fetchChat,
  {
    realtime: true,
    subscriptionUrl: 'ws://api.example.com/chat'
  }
);
```

**Benefits:**

- **Real-time Updates**: Live data without polling
- **Performance**: More efficient than polling
- **User Experience**: Instant updates
- **Automatic Reconnection**: Handles connection issues

**Why Automatic Reconnection?**

- **Reliability**: Handles network issues gracefully
- **User Experience**: Seamless connection recovery
- **Performance**: Optimized reconnection strategy
- **Debugging**: Better connection issue diagnosis

### 5. Performance Monitoring

**Why Built-in Metrics?**

```typescript
const { data, metrics } = useData(
  'posts',
  fetchPosts,
  {
    enableMetrics: true,
    onMetrics: (metrics) => {
      analytics.track('data_fetch_metrics', metrics);
    }
  }
);
```

**Benefits:**

- **Performance Insights**: Track performance issues
- **Optimization**: Data-driven performance improvements
- **Monitoring**: Production performance monitoring
- **Debugging**: Better performance issue diagnosis

**Why Cache Hit Rate Tracking?**

- **Performance**: Identify caching effectiveness
- **Optimization**: Optimize cache strategies
- **Monitoring**: Track cache performance
- **Debugging**: Cache-related issue diagnosis

## Testing Strategy

### Unit Testing

**Why Test Each Module?**

- **Reliability**: Ensure each module works correctly
- **Maintainability**: Catch regressions during development
- **Documentation**: Tests serve as living documentation
- **Refactoring**: Safe refactoring with test coverage

**Test Structure:**

```typescript
describe('cache', () => {
  it('should store and retrieve data', () => {
    // Test cache operations
  });
  
  it('should handle state transitions', () => {
    // Test state management
  });
  
  it('should emit events on updates', () => {
    // Test event system
  });
});
```

### Integration Testing

**Why Integration Tests?**

- **End-to-End**: Test complete workflows
- **Real-world Usage**: Test actual usage patterns
- **Regression Testing**: Catch integration issues
- **Documentation**: Examples of real usage

### Performance Testing

**Why Performance Tests?**

- **Performance Regression**: Catch performance issues
- **Optimization**: Measure optimization effectiveness
- **Benchmarking**: Compare with alternatives
- **Monitoring**: Track performance over time

## Contributing Guidelines

### Code Style

**Why TypeScript?**

- **Type Safety**: Prevent runtime errors
- **Better DX**: Better IDE support
- **Documentation**: Types serve as documentation
- **Maintainability**: Easier to maintain and refactor

**Why ESLint?**

- **Consistency**: Consistent code style
- **Quality**: Catch common errors
- **Maintainability**: Easier to read and maintain
- **Team Collaboration**: Consistent code across team

### Architecture Principles

**Why These Principles?**

1. **Simplicity**: Complex code is harder to maintain
2. **Performance**: Performance should not be an afterthought
3. **Type Safety**: TypeScript provides compile-time safety
4. **Backward Compatibility**: Don't break existing code

### Testing Requirements

**Why Comprehensive Testing?**

- **Reliability**: Ensure library works correctly
- **Maintainability**: Safe refactoring and changes
- **Documentation**: Tests serve as examples
- **Quality**: High-quality, production-ready code

### Documentation

**Why Comprehensive Documentation?**

- **Onboarding**: Help new contributors
- **Maintenance**: Easier to maintain and update
- **User Support**: Better user experience
- **Community**: Foster community contribution

This developer documentation provides a comprehensive understanding of the library's architecture, design decisions, and implementation details. It serves as a guide for contributors and maintainers to understand the codebase and make informed decisions about future development.
