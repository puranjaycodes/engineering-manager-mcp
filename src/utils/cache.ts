// src/utils/cache.ts
import { CacheEntry, CacheConfig } from '../types/index.js';

/**
 * In-memory cache manager with TTL support
 * Helps reduce API calls and improve performance
 */
export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly defaultTTL: number = 300; // 5 minutes default
  private readonly maxSize: number = 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor(private config: Partial<CacheConfig> = {}) {
    this.defaultTTL = config.ttl || 300;
    this.maxSize = config.maxSize || 1000;
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Set a value in the cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttlSeconds - Time to live in seconds (optional)
   */
  public set<T>(key: string, data: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds || this.defaultTTL;
    const fullKey = this.getFullKey(key);
    
    // Check cache size and evict if necessary
    if (this.cache.size >= this.maxSize && !this.cache.has(fullKey)) {
      this.evictOldest();
    }
    
    this.cache.set(fullKey, {
      data,
      expiry: Date.now() + (ttl * 1000),
      key: fullKey
    });
  }

  /**
   * Get a value from the cache
   * @param key - Cache key
   * @returns Cached data or null if not found/expired
   */
  public get<T>(key: string): T | null {
    const fullKey = this.getFullKey(key);
    const entry = this.cache.get(fullKey) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.missCount++;
      return null;
    }
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(fullKey);
      this.missCount++;
      return null;
    }
    
    this.hitCount++;
    return entry.data;
  }

  /**
   * Check if a key exists and is not expired
   * @param key - Cache key
   */
  public has(key: string): boolean {
    const data = this.get(key);
    return data !== null;
  }

  /**
   * Delete a specific key from cache
   * @param key - Cache key
   */
  public delete(key: string): boolean {
    const fullKey = this.getFullKey(key);
    return this.cache.delete(fullKey);
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: total > 0 ? (this.hitCount / total) : 0
    };
  }

  /**
   * Get or set a value using a factory function
   * @param key - Cache key
   * @param factory - Function to generate value if not in cache
   * @param ttlSeconds - Time to live in seconds
   */
  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const data = await factory();
    this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * Invalidate all cache entries matching a pattern
   * @param pattern - Pattern to match (supports * wildcard)
   */
  public invalidatePattern(pattern: string): number {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    
    let count = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Get full cache key with prefix
   */
  private getFullKey(key: string): string {
    return this.config.prefix ? `${this.config.prefix}:${key}` : key;
  }

  /**
   * Evict the oldest cache entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestExpiry = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < oldestExpiry) {
        oldestExpiry = entry.expiry;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries periodically
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Start the cleanup interval
   */
  private startCleanupInterval(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Stop the cleanup interval (for cleanup)
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

/**
 * Singleton cache instances for different purposes
 */
class CacheFactory {
  private static caches: Map<string, CacheManager> = new Map();

  /**
   * Get or create a cache instance
   * @param name - Cache name
   * @param config - Cache configuration
   */
  public static getCache(name: string, config?: Partial<CacheConfig>): CacheManager {
    if (!this.caches.has(name)) {
      this.caches.set(name, new CacheManager({
        ...config,
        prefix: name
      }));
    }
    return this.caches.get(name)!;
  }

  /**
   * Clear all caches
   */
  public static clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * Destroy all caches
   */
  public static destroyAll(): void {
    for (const cache of this.caches.values()) {
      cache.destroy();
    }
    this.caches.clear();
  }

  /**
   * Get statistics for all caches
   */
  public static getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    return stats;
  }
}

// Pre-configured cache instances
export const sprintCache = CacheFactory.getCache('sprint', { ttl: 600 }); // 10 minutes
export const issueCache = CacheFactory.getCache('issue', { ttl: 300 }); // 5 minutes
export const userCache = CacheFactory.getCache('user', { ttl: 3600 }); // 1 hour
export const boardCache = CacheFactory.getCache('board', { ttl: 1800 }); // 30 minutes

// Export the factory for custom caches
export { CacheFactory };

/**
 * Cache key builders for consistency
 */
export const CacheKeys = {
  // Jira cache keys
  sprint: (boardId: number) => `sprint:${boardId}`,
  sprintIssues: (sprintId: number) => `sprint-issues:${sprintId}`,
  board: (boardId: number) => `board:${boardId}`,
  issue: (issueKey: string) => `issue:${issueKey}`,
  userByEmail: (email: string) => `user:email:${email}`,
  
  // Slack cache keys
  channel: (channelId: string) => `channel:${channelId}`,
  user: (userId: string) => `user:${userId}`,
  
  // Report cache keys
  standupReport: (boardId: number, projectKey?: string) => 
    projectKey ? `standup:${boardId}:${projectKey}` : `standup:${boardId}`,
};

/**
 * Decorator for caching method results
 */
export function Cacheable(cacheName: string, ttlSeconds: number = 300) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cache = CacheFactory.getCache(cacheName);
    
    descriptor.value = async function(...args: any[]) {
      // Create cache key from method name and arguments
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;
      
      // Try to get from cache
      const cached = cache.get(cacheKey);
      if (cached !== null) {
        console.log(`Cache hit: ${propertyKey}`);
        return cached;
      }
      
      // Call original method
      console.log(`Cache miss: ${propertyKey}`);
      const result = await originalMethod.apply(this, args);
      
      // Store in cache
      cache.set(cacheKey, result, ttlSeconds);
      
      return result;
    };
    
    return descriptor;
  };
}
