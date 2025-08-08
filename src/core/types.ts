// 核心数据类型定义
export interface ClaudeLogEntry {
  timestamp: number
  model: string
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  total_tokens: number
  cost?: number
  session_id?: string
}

export interface UsageData {
  current: {
    used: number
    limit: number
    percentage: number
    resetTime: Date
    timeToReset: number // 分钟
  }
  recent: {
    lastHour: number
    last6Hours: number
    currentSession: number
    averagePerHour: number
  }
  models: {
    [model: string]: {
      tokens: number
      cost: number
      count: number
    }
  }
}

export interface PredictionResult {
  timeToLimit: number | null // 分钟，null表示无法预测
  confidence: number // 0-1之间的置信度
  burnRate: number // tokens/分钟
  recommendation: 'continue' | 'slow_down' | 'pause' | 'critical'
  message: string
}

export interface UsagePoint {
  timestamp: number
  tokens: number
  cumulativeTokens: number
}

export interface MonitorConfig {
  logPath: string
  refreshInterval: number // 秒
  predictionWindow: number // 分钟，用于预测的时间窗口
  limits: {
    pro: number
    max5: number  
    max20: number
    custom?: number
  }
  currentPlan: 'pro' | 'max5' | 'max20' | 'custom'
  warningThresholds: {
    yellow: number // 0.8
    red: number // 0.9
  }
}

export interface SessionInfo {
  id: string
  startTime: Date
  endTime?: Date
  totalTokens: number
  models: string[]
}

// 事件类型
export type MonitorEvent = 
  | { type: 'usage_updated'; data: UsageData }
  | { type: 'prediction_updated'; data: PredictionResult }  
  | { type: 'warning'; level: 'yellow' | 'red'; message: string }
  | { type: 'reset_detected'; newResetTime: Date }
  | { type: 'error'; error: Error }

// 预测算法类型
export type PredictionAlgorithm = 'linear' | 'moving_average' | 'exponential_smoothing'

// UI状态
export interface UIState {
  currentView: 'overview' | 'detailed' | 'history'
  isRealtime: boolean
  showPrediction: boolean
  showModels: boolean
}