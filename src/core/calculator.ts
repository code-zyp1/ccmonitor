import { subHours, isAfter, differenceInMinutes } from 'date-fns'
import type { ClaudeLogEntry, UsageData, MonitorConfig, SessionInfo } from './types.js'
import { PLAN_LIMITS, MODEL_COSTS, RESET_INTERVAL } from '../shared/constants.js'

/**
 * Usage Calculator - Monitors and calculates Claude usage statistics
 * Provides real-time tracking of token usage and plan limits
 */
export class UsageCalculator {
  private entries: ClaudeLogEntry[] = []
  private config: MonitorConfig
  private currentResetTime: Date

  constructor(config: MonitorConfig) {
    this.config = config
    this.currentResetTime = this.calculateNextResetTime()
  }

  addEntries(entries: ClaudeLogEntry[]): void {
    // 合并新条目并按时间排序
    this.entries.push(...entries)
    this.entries.sort((a, b) => a.timestamp - b.timestamp)
    
    // 只保留当前5小时窗口的数据
    const fiveHoursAgo = Date.now() - RESET_INTERVAL
    this.entries = this.entries.filter(e => e.timestamp > fiveHoursAgo)
    
    // 检查是否需要更新重置时间
    this.updateResetTime()
  }

  addEntry(entry: ClaudeLogEntry): void {
    this.addEntries([entry])
  }

  calculateUsage(): UsageData {
    const limit = this.getCurrentLimit()
    
    // 计算当前使用量
    const used = this.calculateTotalTokens()
    const percentage = (used / limit) * 100
    
    // 计算时间相关统计
    const timeToReset = differenceInMinutes(this.currentResetTime, new Date())
    
    // 计算最近时段使用量
    const lastHour = this.calculateTokensInPeriod(subHours(new Date(), 1))
    const last6Hours = this.calculateTokensInPeriod(subHours(new Date(), 6))
    const currentSession = this.calculateCurrentSessionTokens()
    const averagePerHour = this.calculateAverageUsagePerHour()
    
    // 按模型统计
    const models = this.calculateModelBreakdown()

    return {
      current: {
        used,
        limit,
        percentage: Math.min(percentage, 100),
        resetTime: this.currentResetTime,
        timeToReset: Math.max(timeToReset, 0)
      },
      recent: {
        lastHour,
        last6Hours,
        currentSession,
        averagePerHour
      },
      models
    }
  }

  private calculateTotalTokens(): number {
    return this.entries.reduce((total, entry) => total + entry.total_tokens, 0)
  }

  private calculateTokensInPeriod(startTime: Date): number {
    const startTimestamp = startTime.getTime()
    return this.entries
      .filter(entry => entry.timestamp >= startTimestamp)
      .reduce((total, entry) => total + entry.total_tokens, 0)
  }

  private calculateCurrentSessionTokens(): number {
    // 假设会话间隔超过30分钟算作新会话
    const sessionGapMs = 30 * 60 * 1000 // 30分钟
    const now = Date.now()
    
    let sessionStart = now
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i]
      if (now - entry.timestamp > sessionGapMs) {
        break
      }
      sessionStart = entry.timestamp
    }
    
    return this.entries
      .filter(entry => entry.timestamp >= sessionStart)
      .reduce((total, entry) => total + entry.total_tokens, 0)
  }

  private calculateAverageUsagePerHour(): number {
    if (this.entries.length === 0) return 0
    
    const oldestEntry = this.entries[0]
    const timeSpanHours = (Date.now() - oldestEntry.timestamp) / (1000 * 60 * 60)
    
    if (timeSpanHours < 0.1) return 0 // 少于6分钟的数据不计算平均值
    
    const totalTokens = this.calculateTotalTokens()
    return totalTokens / timeSpanHours
  }

  private calculateModelBreakdown(): UsageData['models'] {
    const breakdown: UsageData['models'] = {}
    
    for (const entry of this.entries) {
      if (!breakdown[entry.model]) {
        breakdown[entry.model] = {
          tokens: 0,
          cost: 0,
          count: 0
        }
      }
      
      breakdown[entry.model].tokens += entry.total_tokens
      breakdown[entry.model].cost += this.calculateEntryCost(entry)
      breakdown[entry.model].count += 1
    }
    
    return breakdown
  }

  private calculateEntryCost(entry: ClaudeLogEntry): number {
    if (entry.cost) return entry.cost
    
    const modelCost = MODEL_COSTS[entry.model as keyof typeof MODEL_COSTS]
    if (!modelCost) return 0
    
    let cost = 0
    cost += entry.input_tokens * modelCost.input
    cost += entry.output_tokens * modelCost.output
    
    if ('cache_write' in modelCost && entry.cache_creation_input_tokens) {
      cost += entry.cache_creation_input_tokens * modelCost.cache_write
    }
    
    if ('cache_read' in modelCost && entry.cache_read_input_tokens) {
      cost += entry.cache_read_input_tokens * modelCost.cache_read
    }
    
    return cost
  }

  private getCurrentLimit(): number {
    if (this.config.currentPlan === 'custom' && this.config.limits.custom) {
      return this.config.limits.custom
    }
    return PLAN_LIMITS[this.config.currentPlan as keyof typeof PLAN_LIMITS]
  }

  private calculateNextResetTime(): Date {
    // Claude Code的重置时间是UTC时间每5小时一次
    // 0:00, 5:00, 10:00, 15:00, 20:00
    const now = new Date()
    const utcHour = now.getUTCHours()
    
    const resetHours = [0, 5, 10, 15, 20]
    let nextResetHour = resetHours.find(hour => hour > utcHour)
    
    if (!nextResetHour) {
      nextResetHour = resetHours[0] // 次日的0点
      now.setUTCDate(now.getUTCDate() + 1)
    }
    
    const resetTime = new Date(now)
    resetTime.setUTCHours(nextResetHour, 0, 0, 0)
    
    return resetTime
  }

  private updateResetTime(): void {
    const now = new Date()
    if (isAfter(now, this.currentResetTime)) {
      // 重置时间已过，计算下一个重置时间
      this.currentResetTime = this.calculateNextResetTime()
      
      // 清理过期数据
      const fiveHoursAgo = Date.now() - RESET_INTERVAL
      this.entries = this.entries.filter(e => e.timestamp > fiveHoursAgo)
    }
  }

  // 获取会话信息
  getSessions(): SessionInfo[] {
    if (this.entries.length === 0) return []
    
    const sessions: SessionInfo[] = []
    const sessionGapMs = 30 * 60 * 1000 // 30分钟会话间隔
    
    let currentSession: SessionInfo = {
      id: 'session_1',
      startTime: new Date(this.entries[0].timestamp),
      totalTokens: 0,
      models: []
    }
    
    let lastTimestamp = this.entries[0].timestamp
    
    for (const entry of this.entries) {
      if (entry.timestamp - lastTimestamp > sessionGapMs) {
        // 结束当前会话
        currentSession.endTime = new Date(lastTimestamp)
        sessions.push(currentSession)
        
        // 开始新会话
        currentSession = {
          id: `session_${sessions.length + 1}`,
          startTime: new Date(entry.timestamp),
          totalTokens: 0,
          models: []
        }
      }
      
      currentSession.totalTokens += entry.total_tokens
      if (!currentSession.models.includes(entry.model)) {
        currentSession.models.push(entry.model)
      }
      
      lastTimestamp = entry.timestamp
    }
    
    // 添加最后一个会话
    if (currentSession.totalTokens > 0) {
      sessions.push(currentSession)
    }
    
    return sessions
  }

  // 获取使用趋势数据
  getUsageTrend(intervalMinutes = 30): Array<{ time: Date; tokens: number; cumulative: number }> {
    if (this.entries.length === 0) return []
    
    const trend: Array<{ time: Date; tokens: number; cumulative: number }> = []
    const intervalMs = intervalMinutes * 60 * 1000
    
    const startTime = this.entries[0].timestamp
    const endTime = Date.now()
    
    let currentTime = startTime
    let cumulative = 0
    let entryIndex = 0
    
    while (currentTime <= endTime) {
      const nextTime = currentTime + intervalMs
      let intervalTokens = 0
      
      // 统计当前时间区间的tokens
      while (entryIndex < this.entries.length && this.entries[entryIndex].timestamp < nextTime) {
        intervalTokens += this.entries[entryIndex].total_tokens
        cumulative += this.entries[entryIndex].total_tokens
        entryIndex++
      }
      
      trend.push({
        time: new Date(currentTime),
        tokens: intervalTokens,
        cumulative
      })
      
      currentTime = nextTime
    }
    
    return trend
  }

  // 检测使用模式
  detectUsagePattern(): {
    peakHours: number[]
    averageSessionDuration: number
    mostUsedModel: string
    dailyPattern: 'consistent' | 'burst' | 'mixed'
  } {
    const sessions = this.getSessions()
    const trend = this.getUsageTrend(60) // 按小时统计
    
    // 检测高峰时段
    const hourlyUsage = new Array(24).fill(0)
    for (const entry of this.entries) {
      const hour = new Date(entry.timestamp).getHours()
      hourlyUsage[hour] += entry.total_tokens
    }
    
    const avgHourlyUsage = hourlyUsage.reduce((sum, usage) => sum + usage, 0) / 24
    const peakHours = hourlyUsage
      .map((usage, hour) => ({ hour, usage }))
      .filter(({ usage }) => usage > avgHourlyUsage * 1.5)
      .map(({ hour }) => hour)
    
    // 计算平均会话时长
    const completedSessions = sessions.filter(s => s.endTime)
    const averageSessionDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, session) => {
          return sum + differenceInMinutes(session.endTime!, session.startTime)
        }, 0) / completedSessions.length
      : 0
    
    // 找到最常用模型
    const modelUsage = this.calculateModelBreakdown()
    const mostUsedModel = Object.entries(modelUsage)
      .sort(([,a], [,b]) => b.tokens - a.tokens)[0]?.[0] || 'unknown'
    
    // 检测使用模式
    const variance = this.calculateUsageVariance(trend)
    let dailyPattern: 'consistent' | 'burst' | 'mixed' = 'consistent'
    
    if (variance > avgHourlyUsage * 2) {
      dailyPattern = 'burst'
    } else if (variance > avgHourlyUsage) {
      dailyPattern = 'mixed'
    }
    
    return {
      peakHours,
      averageSessionDuration,
      mostUsedModel,
      dailyPattern
    }
  }

  private calculateUsageVariance(trend: Array<{ time: Date; tokens: number; cumulative: number }>): number {
    if (trend.length === 0) return 0
    
    const values = trend.map(t => t.tokens)
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    
    return Math.sqrt(variance)
  }
}