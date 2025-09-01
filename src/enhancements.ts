import { 
  RetryConfig, 
  OptimisticUpdate, 
  BackgroundSyncConfig, 
  RealtimeConfig, 
  CacheConfig, 
  MetricsConfig,
  PerformanceMetrics 
} from './types';

// Retry Logic
export class RetryManager {
  private config: RetryConfig;
  private currentAttempt = 0;

  constructor(config: RetryConfig) {
    this.config = config;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.currentAttempt = 0;
    
    while (this.currentAttempt < this.config.attempts) {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        this.currentAttempt++;
        
        if (this.currentAttempt >= this.config.attempts) {
          this.config.onError?.(error, this.currentAttempt);
          throw error;
        }
        
        this.config.onError?.(error, this.currentAttempt);
        
        const delay = this.config.exponentialBackoff 
          ? this.config.delay * Math.pow(2, this.currentAttempt - 1)
          : this.config.delay;
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retry attempts reached');
  }

  getCurrentAttempt(): number {
    return this.currentAttempt;
  }

  reset(): void {
    this.currentAttempt = 0;
  }
}

// Optimistic Updates
export class OptimisticUpdateManager<T> {
  private originalData: T | null = null;
  private isOptimistic = false;

  updateOptimistically(
    currentData: T,
    optimisticData: Partial<T>,
    mutationFn: () => Promise<void>,
    rollbackFn?: () => void
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.originalData = currentData;
      this.isOptimistic = true;
      try {
        await mutationFn();
        this.isOptimistic = false;
        resolve();
      } catch (error) {
        if (rollbackFn) {
          rollbackFn();
        }
        this.isOptimistic = false;
        reject(error);
      }
    });
  }

  getOriginalData(): T | null {
    return this.originalData;
  }

  isOptimisticUpdate(): boolean {
    return this.isOptimistic;
  }

  clearOptimisticData(): void {
    this.originalData = null;
    this.isOptimistic = false;
  }
}

// Background Sync
export class BackgroundSyncManager {
  private config: BackgroundSyncConfig;
  private syncInterval?: ReturnType<typeof setInterval>;
  private _isOnline = navigator.onLine;

  constructor(config: BackgroundSyncConfig) {
    this.config = config;
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this._isOnline = true;
      this.sync();
    });

    window.addEventListener('offline', () => {
      this._isOnline = false;
    });
  }

  startSync(interval: number = 30000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this._isOnline) {
        this.sync();
      }
    }, interval);
  }

  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  private async sync(): Promise<void> {
    if (!this.config.enabled || !this._isOnline) return;

    try {
      // This would be implemented based on the specific sync strategy
      this.config.onSync?.(null);
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  get isOffline(): boolean {
    return !this._isOnline;
  }
}

//  -time Subscriptions
export class RealtimeManager {
  private config: RealtimeConfig;
  private ws?: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(config: RealtimeConfig) {
    this.config = config;
  }

  connect(): void {
    if (!this.config.enabled || !this.config.subscriptionUrl) return;

    try {
      this.ws = new WebSocket(this.config.subscriptionUrl);
      
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.config.onConnect?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.config.onUpdate?.(data);
        } catch (error) {
          console.error('Failed to parse real-time message:', error);
        }
      };

      this.ws.onclose = () => {
        this.config.onDisconnect?.();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to real-time subscription:', error);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Advanced Caching
export class AdvancedCacheManager {
  private cache = new Map<string, { data: any; timestamp: number; version?: string }>();
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.config.cacheTime;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: any, version?: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      version: version || this.config.version
    });
  }

  invalidate(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getCacheKeys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Performance Monitoring
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fetchTime: 0,
    cacheHitRate: 0,
    retryCount: 0,
    lastFetchTimestamp: 0,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0
  };

  private config: MetricsConfig;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(config: MetricsConfig) {
    this.config = config;
  }

  startFetch(): number {
    return Date.now();
  }

  endFetch(startTime: number, success: boolean): void {
    const fetchTime = Date.now() - startTime;
    
    this.metrics.fetchTime = fetchTime;
    this.metrics.lastFetchTimestamp = Date.now();
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    this.updateCacheHitRate();
    this.config.onMetrics?.(this.getMetrics());
  }

  recordCacheHit(): void {
    this.cacheHits++;
    this.updateCacheHitRate();
  }

  recordCacheMiss(): void {
    this.cacheMisses++;
    this.updateCacheHitRate();
  }

  recordRetry(): void {
    this.metrics.retryCount++;
  }

  private updateCacheHitRate(): void {
    const total = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRate = total > 0 ? this.cacheHits / total : 0;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      fetchTime: 0,
      cacheHitRate: 0,
      retryCount: 0,
      lastFetchTimestamp: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    };
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

// Utility functions
export function createRetryManager(config: Partial<RetryConfig> = {}): RetryManager {
  const defaultConfig: RetryConfig = {
    attempts: 3,
    delay: 1000,
    exponentialBackoff: true,
    ...config
  };
  return new RetryManager(defaultConfig);
}

export function createOptimisticUpdateManager<T>(): OptimisticUpdateManager<T> {
  return new OptimisticUpdateManager<T>();
}

export function createBackgroundSyncManager(config: Partial<BackgroundSyncConfig> = {}): BackgroundSyncManager {
  const defaultConfig: BackgroundSyncConfig = {
    enabled: false,
    offlineSupport: false,
    ...config
  };
  return new BackgroundSyncManager(defaultConfig);
}

export function createRealtimeManager(config: Partial<RealtimeConfig> = {}): RealtimeManager {
  const defaultConfig: RealtimeConfig = {
    enabled: false,
    ...config
  };
  return new RealtimeManager(defaultConfig);
}

export function createAdvancedCacheManager(config: Partial<CacheConfig> = {}): AdvancedCacheManager {
  const defaultConfig: CacheConfig = {
    strategy: "default",
    cacheTime: 5 * 60 * 1000, // 5 minutes
    backgroundRefetch: false,
    ...config
  };
  return new AdvancedCacheManager(defaultConfig);
}

export function createPerformanceMonitor(config: Partial<MetricsConfig> = {}): PerformanceMonitor {
  const defaultConfig: MetricsConfig = {
    enabled: false,
    trackCacheHits: true,
    trackFetchTimes: true,
    ...config
  };
  return new PerformanceMonitor(defaultConfig);
}
