// 常量定义
export const MODEL_COSTS = {
  'claude-3-5-sonnet-20241022': {
    input: 3.0 / 1000000,    // $3 per million input tokens
    output: 15.0 / 1000000,  // $15 per million output tokens
    cache_write: 3.75 / 1000000, // $3.75 per million cache write tokens
    cache_read: 0.30 / 1000000   // $0.30 per million cache read tokens
  },
  'claude-3-opus-20240229': {
    input: 15.0 / 1000000,   // $15 per million input tokens
    output: 75.0 / 1000000   // $75 per million output tokens
  },
  'claude-3-haiku-20240307': {
    input: 0.25 / 1000000,   // $0.25 per million input tokens  
    output: 1.25 / 1000000   // $1.25 per million output tokens
  }
} as const

export const PLAN_LIMITS = {
  pro: 600000,      // 600K tokens per 5 hours
  max5: 2000000,    // 2M tokens per 5 hours  
  max20: 8000000    // 8M tokens per 5 hours
} as const

export const DEFAULT_CONFIG = {
  refreshInterval: 3,         // 3秒刷新
  predictionWindow: 60,       // 60分钟预测窗口
  warningThresholds: {
    yellow: 0.8,             // 80%警告
    red: 0.9                 // 90%严重警告
  }
} as const

export const RESET_INTERVAL = 5 * 60 * 60 * 1000 // 5小时，毫秒

export const LOG_PATTERNS = {
  // Claude Code日志文件位置模式
  windows: [
    '%APPDATA%\\claude-code\\logs',
    '%USERPROFILE%\\.claude\\logs'
  ],
  macos: [
    '~/Library/Logs/claude-code',
    '~/.claude/logs'
  ],
  linux: [
    '~/.local/share/claude-code/logs',
    '~/.claude/logs'
  ]
} as const

// 颜色主题
export const COLORS = {
  primary: '#00d4ff',
  success: '#00ff88', 
  warning: '#ffaa00',
  danger: '#ff4444',
  info: '#8888ff',
  muted: '#888888'
} as const

// ASCII艺术和符号 - Windows兼容版本
export const SYMBOLS = {
  progress: {
    filled: '#',
    empty: '.',
    partial: ['|', '/', '-', '\\', '|', '/', '-', '\\']
  },
  status: {
    ok: '[OK]',
    warning: '[!]',
    error: '[X]',
    info: '[i]'
  },
  arrows: {
    up: '^',
    down: 'v', 
    right: '>',
    left: '<'
  }
} as const