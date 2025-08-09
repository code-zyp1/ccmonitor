/**
 * Performance Optimization Module for Claude Code Monitor
 * Provides intelligent caching and batch processing capabilities
 */

import type { ClaudeLogEntry } from './types.js'

export interface PerformanceMetrics {
  processingTime: number
  memoryUsage: number
  cacheHitRate: number
  batchSize: number
}

export class PerformanceOptimizer {
  private cache = new Map<string, ClaudeLogEntry[]>()
  private metrics: PerformanceMetrics = {
    processingTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    batchSize: 100
  }

  constructor(private maxCacheSize = 1000) {}

  /**
   * Optimize log processing with intelligent batching
   */
  optimizeBatch(entries: ClaudeLogEntry[]): ClaudeLogEntry[] {
    const startTime = Date.now()
    
    // Batch processing logic
    const optimized = entries.reduce((acc, entry) => {
      if (this.shouldProcessEntry(entry)) {
        acc.push(this.enhanceEntry(entry))
      }
      return acc
    }, [] as ClaudeLogEntry[])

    this.metrics.processingTime = Date.now() - startTime
    return optimized
  }

  /**
   * Intelligent caching for frequently accessed data
   */
  cacheEntry(key: string, entries: ClaudeLogEntry[]): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, entries)
  }

  getCachedEntry(key: string): ClaudeLogEntry[] | undefined {
    return this.cache.get(key)
  }

  private shouldProcessEntry(entry: ClaudeLogEntry): boolean {
    return entry.total_tokens > 0 && entry.model.includes('claude')
  }

  private enhanceEntry(entry: ClaudeLogEntry): ClaudeLogEntry {
    return {
      ...entry,
      // Add performance metadata
      processed_at: Date.now()
    }
  }

  getMetrics(): PerformanceMetrics {
    this.metrics.memoryUsage = process.memoryUsage().heapUsed
    this.metrics.cacheHitRate = this.cache.size / this.maxCacheSize
    return { ...this.metrics }
  }

  clearCache(): void {
    this.cache.clear()
  }
}