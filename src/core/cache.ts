/**
 * Caching System for Claude Code Monitor
 * Provides intelligent caching for log entries and performance data
 */

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export class CacheManager<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private defaultTTL: number

  constructor(defaultTTL = 300000) { // 5 minutes default
    this.defaultTTL = defaultTTL
  }

  /**
   * Store data in cache with optional TTL
   */
  set(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    }
    this.cache.set(key, entry)
  }

  /**
   * Retrieve data from cache if not expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return undefined
    }

    return entry.data
  }

  /**
   * Clear expired entries from cache
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}