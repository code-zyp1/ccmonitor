import type { UsageData, PredictionResult, PredictionAlgorithm, UsagePoint } from './types.js'

export class UsagePredictor {
  private history: UsagePoint[] = []
  private readonly maxHistorySize = 1000

  addDataPoint(timestamp: number, tokens: number, cumulativeTokens: number): void {
    this.history.push({
      timestamp,
      tokens,
      cumulativeTokens
    })

    // 保持历史记录大小限制
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize)
    }

    // 按时间排序
    this.history.sort((a, b) => a.timestamp - b.timestamp)
  }

  predict(
    currentUsage: UsageData,
    algorithm: PredictionAlgorithm = 'moving_average'
  ): PredictionResult {
    const { used, limit } = currentUsage.current

    // 如果已经接近或超过限制
    if (used >= limit) {
      return {
        timeToLimit: 0,
        confidence: 1.0,
        burnRate: 0,
        recommendation: 'critical',
        message: '已达到使用限制'
      }
    }

    // 如果没有足够的历史数据
    if (this.history.length < 2) {
      return this.basicPrediction(currentUsage)
    }

    // 根据算法进行预测
    switch (algorithm) {
      case 'linear':
        return this.linearPrediction(currentUsage)
      case 'moving_average':
        return this.movingAveragePrediction(currentUsage)
      case 'exponential_smoothing':
        return this.exponentialSmoothingPrediction(currentUsage)
      default:
        return this.movingAveragePrediction(currentUsage)
    }
  }

  private basicPrediction(currentUsage: UsageData): PredictionResult {
    const { used, limit, timeToReset } = currentUsage.current
    const { averagePerHour } = currentUsage.recent

    if (averagePerHour <= 0) {
      return {
        timeToLimit: null,
        confidence: 0.1,
        burnRate: 0,
        recommendation: 'continue',
        message: '使用率较低，可以继续使用'
      }
    }

    const remainingTokens = limit - used
    const timeToLimitHours = remainingTokens / averagePerHour
    const timeToLimitMinutes = timeToLimitHours * 60

    return {
      timeToLimit: Math.max(0, timeToLimitMinutes),
      confidence: 0.3,
      burnRate: averagePerHour / 60, // 转换为每分钟
      recommendation: this.getRecommendation(timeToLimitMinutes, timeToReset),
      message: this.getRecommendationMessage(timeToLimitMinutes, timeToReset)
    }
  }

  private linearPrediction(currentUsage: UsageData): PredictionResult {
    const { used, limit, timeToReset } = currentUsage.current
    
    // 使用最近的数据点进行线性回归
    const recentHistory = this.getRecentHistory(60) // 最近60分钟
    if (recentHistory.length < 2) {
      return this.basicPrediction(currentUsage)
    }

    // 计算线性趋势
    const slope = this.calculateSlope(recentHistory)
    const burnRatePerMinute = slope / (60 * 1000) // 转换为每分钟tokens

    if (burnRatePerMinute <= 0) {
      return {
        timeToLimit: null,
        confidence: 0.5,
        burnRate: 0,
        recommendation: 'continue',
        message: '当前无明显使用趋势'
      }
    }

    const remainingTokens = limit - used
    const timeToLimitMinutes = remainingTokens / burnRatePerMinute

    const confidence = this.calculateTrendConfidence(recentHistory)

    return {
      timeToLimit: Math.max(0, timeToLimitMinutes),
      confidence,
      burnRate: burnRatePerMinute,
      recommendation: this.getRecommendation(timeToLimitMinutes, timeToReset),
      message: this.getRecommendationMessage(timeToLimitMinutes, timeToReset)
    }
  }

  private movingAveragePrediction(currentUsage: UsageData): PredictionResult {
    const { used, limit, timeToReset } = currentUsage.current
    
    // 使用移动平均计算消耗速率
    const windowSizes = [5, 15, 30] // 5分钟、15分钟、30分钟窗口
    let bestPrediction: PredictionResult | null = null
    let bestConfidence = 0

    for (const windowMinutes of windowSizes) {
      const recentHistory = this.getRecentHistory(windowMinutes)
      if (recentHistory.length < 2) continue

      const avgBurnRate = this.calculateMovingAverage(recentHistory, windowMinutes)
      if (avgBurnRate <= 0) continue

      const remainingTokens = limit - used
      const timeToLimitMinutes = remainingTokens / avgBurnRate

      const confidence = this.calculateMovingAverageConfidence(recentHistory, windowMinutes)

      if (confidence > bestConfidence) {
        bestConfidence = confidence
        bestPrediction = {
          timeToLimit: Math.max(0, timeToLimitMinutes),
          confidence,
          burnRate: avgBurnRate,
          recommendation: this.getRecommendation(timeToLimitMinutes, timeToReset),
          message: this.getRecommendationMessage(timeToLimitMinutes, timeToReset)
        }
      }
    }

    return bestPrediction || this.basicPrediction(currentUsage)
  }

  private exponentialSmoothingPrediction(currentUsage: UsageData): PredictionResult {
    const { used, limit, timeToReset } = currentUsage.current
    
    const recentHistory = this.getRecentHistory(60)
    if (recentHistory.length < 3) {
      return this.movingAveragePrediction(currentUsage)
    }

    // 指数平滑参数
    const alpha = 0.3 // 平滑常数
    
    // 计算指数平滑后的消耗速率
    let smoothedRate = this.calculateTokensPerMinute(recentHistory[0], recentHistory[1])
    
    for (let i = 1; i < recentHistory.length - 1; i++) {
      const currentRate = this.calculateTokensPerMinute(recentHistory[i], recentHistory[i + 1])
      smoothedRate = alpha * currentRate + (1 - alpha) * smoothedRate
    }

    if (smoothedRate <= 0) {
      return this.movingAveragePrediction(currentUsage)
    }

    const remainingTokens = limit - used
    const timeToLimitMinutes = remainingTokens / smoothedRate

    const confidence = this.calculateExponentialSmoothingConfidence(recentHistory)

    return {
      timeToLimit: Math.max(0, timeToLimitMinutes),
      confidence,
      burnRate: smoothedRate,
      recommendation: this.getRecommendation(timeToLimitMinutes, timeToReset),
      message: this.getRecommendationMessage(timeToLimitMinutes, timeToReset)
    }
  }

  private getRecentHistory(minutes: number): UsagePoint[] {
    const cutoffTime = Date.now() - (minutes * 60 * 1000)
    return this.history.filter(point => point.timestamp >= cutoffTime)
  }

  private calculateSlope(points: UsagePoint[]): number {
    if (points.length < 2) return 0

    const n = points.length
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0

    for (const point of points) {
      sumX += point.timestamp
      sumY += point.cumulativeTokens
      sumXY += point.timestamp * point.cumulativeTokens
      sumXX += point.timestamp * point.timestamp
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    return isNaN(slope) ? 0 : slope
  }

  private calculateMovingAverage(points: UsagePoint[], windowMinutes: number): number {
    if (points.length < 2) return 0

    const windowMs = windowMinutes * 60 * 1000
    const now = Date.now()
    const rates: number[] = []

    for (let i = 0; i < points.length - 1; i++) {
      const rate = this.calculateTokensPerMinute(points[i], points[i + 1])
      if (now - points[i].timestamp <= windowMs) {
        rates.push(rate)
      }
    }

    if (rates.length === 0) return 0
    return rates.reduce((sum, rate) => sum + rate, 0) / rates.length
  }

  private calculateTokensPerMinute(point1: UsagePoint, point2: UsagePoint): number {
    const timeDiffMinutes = (point2.timestamp - point1.timestamp) / (1000 * 60)
    if (timeDiffMinutes <= 0) return 0
    
    const tokenDiff = point2.cumulativeTokens - point1.cumulativeTokens
    return tokenDiff / timeDiffMinutes
  }

  private calculateTrendConfidence(points: UsagePoint[]): number {
    if (points.length < 3) return 0.3

    // 计算R²值来评估线性趋势的拟合度
    const n = points.length
    const slope = this.calculateSlope(points)
    
    // 计算预测值和实际值的相关性
    const meanY = points.reduce((sum, p) => sum + p.cumulativeTokens, 0) / n
    let ssRes = 0, ssTot = 0
    
    for (const point of points) {
      const predicted = slope * point.timestamp
      ssRes += Math.pow(point.cumulativeTokens - predicted, 2)
      ssTot += Math.pow(point.cumulativeTokens - meanY, 2)
    }

    const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot)
    return Math.min(0.9, 0.3 + rSquared * 0.6)
  }

  private calculateMovingAverageConfidence(points: UsagePoint[], windowMinutes: number): number {
    if (points.length < 3) return 0.4

    // 基于数据稳定性计算置信度
    const rates: number[] = []
    for (let i = 0; i < points.length - 1; i++) {
      rates.push(this.calculateTokensPerMinute(points[i], points[i + 1]))
    }

    if (rates.length < 2) return 0.4

    const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / rates.length
    const stability = mean === 0 ? 0 : 1 / (1 + variance / mean)

    // 窗口越小，短期预测越准确
    const windowFactor = Math.max(0.5, 1 - windowMinutes / 60)
    
    return Math.min(0.85, 0.4 + stability * 0.3 + windowFactor * 0.15)
  }

  private calculateExponentialSmoothingConfidence(points: UsagePoint[]): number {
    // 指数平滑适合有趋势的数据，基于趋势一致性计算置信度
    if (points.length < 4) return 0.5

    const rates: number[] = []
    for (let i = 0; i < points.length - 1; i++) {
      rates.push(this.calculateTokensPerMinute(points[i], points[i + 1]))
    }

    // 计算趋势一致性
    let consistentTrend = 0
    for (let i = 1; i < rates.length; i++) {
      if ((rates[i] > rates[i-1] && rates[i-1] > 0) || 
          (rates[i] < rates[i-1] && rates[i-1] < 0) ||
          (Math.abs(rates[i] - rates[i-1]) / Math.max(rates[i], rates[i-1], 1) < 0.3)) {
        consistentTrend++
      }
    }

    const consistency = rates.length <= 1 ? 0 : consistentTrend / (rates.length - 1)
    return Math.min(0.8, 0.4 + consistency * 0.4)
  }

  private getRecommendation(
    timeToLimitMinutes: number | null, 
    timeToResetMinutes: number
  ): PredictionResult['recommendation'] {
    if (timeToLimitMinutes === null || timeToLimitMinutes > timeToResetMinutes) {
      return 'continue'
    }

    if (timeToLimitMinutes < 15) {
      return 'critical'
    } else if (timeToLimitMinutes < 60) {
      return 'pause'
    } else if (timeToLimitMinutes < timeToResetMinutes * 0.7) {
      return 'slow_down'
    } else {
      return 'continue'
    }
  }

  private getRecommendationMessage(
    timeToLimitMinutes: number | null,
    timeToResetMinutes: number
  ): string {
    if (timeToLimitMinutes === null) {
      return '当前使用率较低，可以正常使用'
    }

    if (timeToLimitMinutes > timeToResetMinutes) {
      return `预计在重置前不会达到限制，剩余 ${Math.round(timeToResetMinutes)} 分钟重置`
    }

    const hours = Math.floor(timeToLimitMinutes / 60)
    const minutes = Math.round(timeToLimitMinutes % 60)
    
    if (timeToLimitMinutes < 15) {
      return `⚠️ 紧急：预计 ${minutes} 分钟后达到限制！`
    } else if (timeToLimitMinutes < 60) {
      return `⚠️ 警告：预计 ${minutes} 分钟后达到限制，建议暂停使用`
    } else if (timeToLimitMinutes < timeToResetMinutes * 0.7) {
      return `📊 建议放慢使用频率，预计 ${hours > 0 ? `${hours}小时` : ''}${minutes}分钟后达到限制`
    } else {
      return `✅ 当前使用率适中，预计 ${hours > 0 ? `${hours}小时` : ''}${minutes}分钟后达到限制`
    }
  }

  // 获取预测准确度统计
  getAccuracyStats(): {
    totalPredictions: number
    accurateWithin15min: number
    accurateWithin30min: number
    averageError: number
  } {
    // 这里可以实现预测准确度跟踪
    // 实际使用中需要记录预测结果和实际结果进行对比
    return {
      totalPredictions: 0,
      accurateWithin15min: 0,
      accurateWithin30min: 0,
      averageError: 0
    }
  }
}