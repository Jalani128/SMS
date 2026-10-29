import { logger } from './logger.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  schoolId?: string;
  createdAt: number;
}

export class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();
  private maxEntries: number;
  private defaultTtlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(options?: { maxEntries?: number; defaultTtlMs?: number }) {
    this.maxEntries = options?.maxEntries || 500;
    this.defaultTtlMs = options?.defaultTtlMs || 30000; // 30s default TTL
  }

  /**
   * Retrieves an item from cache if present and unexpired.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  /**
   * Stores an item with a bounded TTL and tenant school scope.
   */
  set<T>(key: string, value: T, ttlMs?: number, schoolId?: string): void {
    // Evict oldest entries if store exceeds capacity
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    const effectiveTtl = ttlMs !== undefined ? ttlMs : this.defaultTtlMs;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + effectiveTtl,
      schoolId,
      createdAt: Date.now(),
    });
  }

  /**
   * Deletes a specific cache key.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Invalidates all cache entries belonging to a given school tenant.
   * Useful when new attendance, fees, or exam marks are recorded.
   */
  invalidateSchool(schoolId: string): number {
    let evicted = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.schoolId === schoolId || key.includes(`school:${schoolId}`)) {
        this.store.delete(key);
        evicted++;
      }
    }
    return evicted;
  }

  /**
   * Clears the entire cache.
   */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Cache telemetry and performance statistics.
   */
  getStats(): { size: number; hits: number; misses: number; hitRatio: number } {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRatio: total > 0 ? Number((this.hits / total).toFixed(3)) : 0,
    };
  }
}

// Global Singleton Cache Instance
export const analyticsCache = new MemoryCache({ maxEntries: 500, defaultTtlMs: 30000 });

/**
 * Generates a deterministic, tenant-isolated cache key for analytics queries.
 */
export const buildAnalyticsCacheKey = (
  schoolId: string,
  userRole: string,
  namespace: string,
  params: Record<string, any>
): string => {
  // Sort query parameters to ensure deterministic hashing
  const sortedParams = Object.keys(params || {})
    .sort()
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map((k) => `${k}=${String(params[k])}`)
    .join('&');

  return `analytics:school:${schoolId}:role:${userRole}:ns:${namespace}:${sortedParams || 'all'}`;
};
