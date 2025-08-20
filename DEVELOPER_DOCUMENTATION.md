# Developer Documentation - React Data Cache Library

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Concepts](#core-concepts)
3. [Module Breakdown](#module-breakdown)
4. [Design Decisions](#design-decisions)
5. [State Management](#state-management)
6. [Caching Strategy](#caching-strategy)
7. [Event System](#event-system)
8. [Type System](#type-system)
9. [Performance Considerations](#performance-considerations)
10. [Testing Strategy](#testing-strategy)
11. [Contributing Guidelines](#contributing-guidelines)

## Architecture Overview

This library provides a lightweight, performant data fetching solution for React applications with built-in caching, prefetching, and infinite scroll capabilities. The architecture is designed around three core principles:

1. **Simplicity**: Minimal API surface with sensible defaults
2. **Performance**: Efficient caching and state management
3. **Flexibility**: Universal adapters for different pagination patterns

### Core Architecture Components

```
src/
├── index.ts                 # Public API exports
├── types.ts                 # TypeScript type definitions
├── cache.ts                 # Core caching mechanism
├── useData.ts              # Main data fetching hook
├── prefetch.ts             # Prefetching utilities
└── infinite-scroll/
    ├── useUniversalInfiniteQuery.ts    # Infinite scroll hook
    └── universalInfiniteCache.ts       # Infinite scroll cache
```

## Core Concepts

### 1. Data State Management

The library uses a centralized cache system with the following state structure:

```typescript
interface DataState<T> {
  status: "idle" | "loading" | "success" | "error" | "isRefetching";
  payload: T | null;
  controller?: AbortController;
  timestamp?: number;
}
```

**Why this design?**

- **Status-based**: Clear state transitions for UI rendering
- **AbortController**: Proper request cancellation for performance
- **Timestamp**: Enables stale-time based refetching
- **Payload**: Stores both success data and error information

### 2. Cache Strategy

The library implements a Map-based cache system:

```typescript
export const dataCache = new Map<string, DataState<any>>();
```

**Design Rationale:**

- **String keys**: Simple, predictable cache invalidation
- **Map structure**: O(1) lookup performance
- **Global scope**: Enables cross-component data sharing
- **Type safety**: Generic typing for compile-time safety

### 3. Event-Driven Updates

The library uses DOM events for state synchronization:

```typescript
window.addEventListener("dataFetched", callback);
window.dispatchEvent(new Event("dataFetched"));
```

**Why DOM events?**

- **Cross-component**: Updates all subscribed components simultaneously
- **Lightweight**: No external dependencies
- **Browser native**: No additional event system needed
- **React 18 compatible**: Works with concurrent features

## Module Breakdown

### 1. `types.ts` - Type System Foundation

This module defines the core type system that ensures type safety across the entire library.

**Key Types:**

- `FetchFunction<T>`: Standardized fetch function signature
- `DataState<T>`: Cache entry state structure
- `UseDataOptions`: Configuration options for data fetching
- `UniversalInfiniteOptions<TData, TPageParam>`: Infinite scroll configuration

**Design Decisions:**

- **Generic typing**: Maximum flexibility for different data types
- **Strict interfaces**: Compile-time error prevention
- **Optional properties**: Sensible defaults with customization options

### 2. `cache.ts` - Core Caching Mechanism

The cache module provides the foundation for all data storage and state management.

**Key Functions:**

- `subscribe()`: Event subscription for state updates
- `fetchOrUsePreloadedData()`: Handles initial data loading
- `formatDataResponse()`: Transforms cache state to hook response
- `clearDataCache()`: Cache invalidation utility

**Implementation Details:**

```typescript
export function subscribe(callback: () => void) {
  window.addEventListener("dataFetched", callback);
  return () => window.removeEventListener("dataFetched", callback);
}
```

**Why this approach?**

- **Event-driven**: Efficient updates across multiple components
- **Cleanup**: Proper event listener removal prevents memory leaks
- **Synchronous**: Immediate state propagation

### 3. `useData.ts` - Main Data Fetching Hook

The primary hook that provides data fetching capabilities with caching.

**Core Logic:**

```typescript
export function useData<T>(
  key: string,
  fn: FetchFunction<T>,
  options: UseDataOptions = {}
): UseDataResponse<T>;
```

**Key Features:**

- **Automatic initialization**: Creates cache entry if not exists
- **Stale-time checking**: Intelligent refetching based on data age
- **Refetch on mount**: Optional automatic refetching
- **No-cache mode**: Bypass caching when needed

**State Management Flow:**
1. Check if cache entry exists
2. Subscribe to state updates
3. Check if data is stale
4. Trigger fetch if needed
5. Return formatted response

### 4. `prefetch.ts` - Prefetching Utilities

Provides utilities for proactive data loading and optimization.

**Key Functions:**

- `prefetchData()`: Preload data for a specific key
- `prefetchMulti()`: Batch prefetch multiple data sources
- `prefetchOnEvent()`: Event-triggered prefetching

**Use Cases:**

- **Route-based prefetching**: Load data before navigation
- **Hover prefetching**: Load data on user interaction
- **Background updates**: Keep data fresh without blocking UI

### 5. Infinite Scroll Module

The infinite scroll functionality is built with universal pagination support.

#### `useUniversalInfiniteQuery.ts`

**Core Features:**

- **Universal pagination**: Supports offset, cursor, and link-based pagination
- **Bidirectional loading**: Load both next and previous pages
- **Built-in adapters**: Common pagination patterns pre-configured
- **Custom adapters**: Flexible configuration for any API

**Adapter System:**

```typescript
export const PaginationAdapters = {
  offsetBased: <T>() => ({
    /* offset pagination config */
  }),
  cursorBased: <T>() => ({
    /* cursor pagination config */
  }),
  linkBased: <T>() => ({
    /* link pagination config */
  }),
  skipTotal: <T>(limit: number) => ({
    /* skip/total config */
  }),
  custom: <T, R>(config) => ({
    /* custom config */
  }),
};
```

**Why Universal Design?**

- **API agnostic**: Works with any pagination pattern
- **Reduced boilerplate**: Pre-built adapters for common cases
- **Flexible**: Custom adapters for unique requirements
- **Type safe**: Full TypeScript support

#### `universalInfiniteCache.ts`

Separate cache system for infinite scroll data to avoid conflicts with regular data cache.

**Key Features:**

- **Page-based storage**: Maintains array of page responses
- **Parameter tracking**: Stores page parameters for navigation
- **Bidirectional support**: Handles both forward and backward pagination

## Design Decisions

### 1. Why `useSyncExternalStore`?

The library uses React's `useSyncExternalStore` for state management:

```typescript
const data = useSyncExternalStore(
  subscribe,
  () => dataCache.get(key) as DataState<T>
);
```

**Benefits:**

- **React 18 compatible**: Works with concurrent features
- **External state**: No React state management overhead
- **Efficient updates**: Only re-renders when data actually changes
- **SSR friendly**: Proper hydration support

### 2. AbortController Integration

Every fetch operation uses AbortController for proper request cancellation:

```typescript
const controller = new AbortController();
const signal = newController.signal;
```

**Why this matters:**

- **Performance**: Prevents unnecessary network requests
- **Memory management**: Avoids memory leaks from abandoned requests
- **User experience**: Responsive UI during rapid interactions
- **Resource efficiency**: Reduces server load

### 3. Stale-Time Based Refetching

The library implements intelligent refetching based on data age:

```typescript
const isStale =
  Date.now() - (data.timestamp || 0) > (options.staleTime ?? defaultStaleTime);
```

**Benefits:**

- **Fresh data**: Ensures data is reasonably current
- **Performance**: Avoids unnecessary refetches
- **Configurable**: Different stale times for different data types
- **User control**: Manual refetch capability

### 4. Event-Driven Architecture

Using DOM events for state synchronization:

**Advantages:**

- **Cross-component**: Updates all subscribed components
- **Decoupled**: Components don't need direct references
- **Efficient**: No polling or manual synchronization needed
- **Simple**: No external event system required

## State Management

### Cache State Lifecycle

1. **Idle**: Initial state, no data loaded
2. **Loading**: Fetch in progress
3. **Success**: Data loaded successfully
4. **Error**: Fetch failed
5. **IsRefetching**: Refetch in progress (preserves existing data)

### State Transitions

```
idle → loading → success
  ↓       ↓        ↓
error ← error ← error
  ↓
isRefetching → success
```

### Infinite Scroll State

Additional states for infinite scroll:

- **fetchingNextPage**: Loading next page
- **fetchingPreviousPage**: Loading previous page

## Caching Strategy

### Cache Key Strategy

Cache keys are strings that should be:

- **Unique**: Different data sources have different keys
- **Predictable**: Same data source always uses same key
- **Descriptive**: Should indicate what data is cached

**Examples:**

```typescript
"user-profile-123";
"posts-page-1";
"comments-post-456";
```

### Cache Invalidation

The library provides several invalidation strategies:

1. **Manual invalidation**: `clearDataCache()`
2. **Stale-time based**: Automatic refetching
3. **No-cache mode**: Bypass cache entirely
4. **Refetch on mount**: Force refresh when component mounts

### Memory Management

- **Map-based storage**: Efficient memory usage
- **AbortController**: Prevents memory leaks from abandoned requests
- **Event cleanup**: Proper event listener removal
- **No size limits**: Relies on application-level cache management

## Event System

### Event Types

1. **dataFetched**: Regular data cache updates
2. **universalInfiniteDataFetched**: Infinite scroll cache updates

### Event Flow

```
Data Fetch → Cache Update → Event Dispatch → Component Re-render
```

### Event Handling

```typescript
// Subscribe to updates
const unsubscribe = subscribe(() => {
  // Handle state change
});

// Cleanup on unmount
return unsubscribe;
```

## Type System

### Generic Type Parameters

The library uses extensive generic typing for type safety:

```typescript
function useData<T>(
  key: string,
  fn: FetchFunction<T>,
  options: UseDataOptions = {}
): UseDataResponse<T>;
```

### Type Constraints

- **T**: Data type (any)
- **TResponse**: API response type (any)
- **TPageParam**: Page parameter type (any)

### Type Inference

TypeScript automatically infers types from usage:

```typescript
const { data } = useData("users", fetchUsers);
// data is automatically typed as User[]
```

## Performance Considerations

### 1. Efficient Re-renders

- **useSyncExternalStore**: Only re-renders when data changes
- **Event-driven updates**: No polling or manual synchronization
- **AbortController**: Prevents unnecessary network requests

### 2. Memory Optimization

- **Map-based cache**: O(1) lookup performance
- **Event cleanup**: Proper memory management
- **Request cancellation**: Prevents memory leaks

### 3. Network Optimization

- **Stale-time control**: Reduces unnecessary requests
- **Prefetching**: Proactive data loading
- **Request deduplication**: Same key requests are shared

### 4. Bundle Size

- **No external dependencies**: Minimal bundle impact
- **Tree-shakable**: Only import what you use
- **TypeScript**: Compile-time optimizations

## Testing Strategy

### Unit Testing

Test each module in isolation:

```typescript
// Test cache operations
describe("cache", () => {
  it("should store and retrieve data", () => {
    // Test implementation
  });
});

// Test hook behavior
describe("useData", () => {
  it("should fetch data on mount", () => {
    // Test implementation
  });
});
```

### Integration Testing

Test component integration:

```typescript
describe("Component Integration", () => {
  it("should update UI when data changes", () => {
    // Test implementation
  });
});
```

### Performance Testing

- **Memory usage**: Monitor for leaks
- **Network requests**: Verify request optimization
- **Re-render frequency**: Ensure efficient updates

## Contributing Guidelines

### Code Style

- **TypeScript**: Strict typing required
- **ESLint**: Follow project linting rules
- **Prettier**: Consistent code formatting
- **JSDoc**: Document public APIs

### Architecture Principles

1. **Simplicity**: Keep APIs simple and intuitive
2. **Performance**: Optimize for speed and efficiency
3. **Type Safety**: Maintain strict TypeScript usage
4. **Backward Compatibility**: Avoid breaking changes

### Testing Requirements

- **Unit tests**: Cover all public APIs
- **Integration tests**: Test component integration
- **Performance tests**: Monitor for regressions
- **Type tests**: Ensure type safety

### Documentation

- **API documentation**: Document all public functions
- **Examples**: Provide usage examples
- **Migration guides**: Help with version updates
- **Performance tips**: Guide for optimal usage

### Pull Request Process

1. **Feature branch**: Create from main
2. **Tests**: Ensure all tests pass
3. **Documentation**: Update relevant docs
4. **Review**: Get approval from maintainers
5. **Merge**: Squash and merge to main

This developer documentation provides a comprehensive understanding of the library's architecture, design decisions, and implementation details. It serves as a guide for contributors and maintainers to understand the codebase and make informed decisions about future development.
