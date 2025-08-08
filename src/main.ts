#!/usr/bin/env node

import { ClaudeLogMonitor } from './core/monitor.js'
import { UsageCalculator } from './core/calculator.js'
import { UsagePredictor } from './core/predictor.js'
import { TerminalUI } from './interfaces/terminal/ui.js'
import { DEFAULT_CONFIG, PLAN_LIMITS } from './shared/constants.js'
import type { MonitorConfig, ClaudeLogEntry } from './core/types.js'

class CCMonitor {
  private monitor: ClaudeLogMonitor
  private calculator: UsageCalculator
  private predictor: UsagePredictor
  private ui: TerminalUI
  private config: MonitorConfig
  private refreshTimer: NodeJS.Timeout | null = null

  constructor() {
    // 初始化配置
    this.config = {
      logPath: '', // 将通过monitor.start()自动检测
      refreshInterval: DEFAULT_CONFIG.refreshInterval,
      predictionWindow: DEFAULT_CONFIG.predictionWindow,
      limits: PLAN_LIMITS,
      currentPlan: 'pro', // 默认pro计划，可以通过命令行参数或配置文件修改
      warningThresholds: DEFAULT_CONFIG.warningThresholds
    }

    // 初始化组件
    this.monitor = new ClaudeLogMonitor(this.config)
    this.calculator = new UsageCalculator(this.config)
    this.predictor = new UsagePredictor()
    this.ui = new TerminalUI()

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    // 监听日志变化
    this.monitor.on('logs_loaded' as any, (entries: ClaudeLogEntry[]) => {
      this.calculator.addEntries(entries)
      this.updatePredictorHistory(entries)
      this.updateDisplay()
    })

    this.monitor.on('new_entry' as any, (entry: ClaudeLogEntry) => {
      this.calculator.addEntry(entry)
      
      // 更新预测器历史数据
      const usage = this.calculator.calculateUsage()
      this.predictor.addDataPoint(
        entry.timestamp,
        entry.total_tokens,
        usage.current.used
      )
      
      this.updateDisplay()
    })

    this.monitor.on('error' as any, (error: Error) => {
      this.ui.showError(`Monitor error: ${error.message}`)
      console.error('Monitor error:', error)
    })

    // 进程退出处理
    process.on('SIGINT', () => {
      this.stop()
    })

    process.on('SIGTERM', () => {
      this.stop()
    })

    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error)
      this.stop()
    })
  }

  private updatePredictorHistory(entries: ClaudeLogEntry[]): void {
    // 按时间排序并更新预测器历史数据
    const sortedEntries = [...entries].sort((a, b) => a.timestamp - b.timestamp)
    
    let cumulativeTokens = 0
    for (const entry of sortedEntries) {
      cumulativeTokens += entry.total_tokens
      this.predictor.addDataPoint(
        entry.timestamp,
        entry.total_tokens,
        cumulativeTokens
      )
    }
  }

  private updateDisplay(): void {
    try {
      const usage = this.calculator.calculateUsage()
      const prediction = this.predictor.predict(usage)
      
      this.ui.updateDisplay(usage, prediction)
    } catch (error) {
      console.error('Update display error:', error)
    }
  }

  async start(): Promise<void> {
    try {
      console.log('Starting Claude Code Monitor...')
      console.log('')
      
      // 解析命令行参数
      this.parseCommandLineArgs()
      
      // 启动日志监控
      await this.monitor.start()
      console.log(`Monitor started, refresh interval: ${this.config.refreshInterval}s`)
      const currentLimit = this.config.currentPlan === 'custom' && this.config.limits.custom 
        ? this.config.limits.custom
        : this.config.limits[this.config.currentPlan as keyof typeof this.config.limits] || 0
      console.log(`Current plan: ${this.config.currentPlan.toUpperCase()} (${currentLimit.toLocaleString()} tokens)`)
      console.log('')
      
      // 初始化显示
      this.updateDisplay()
      
      // 设置定时刷新
      this.refreshTimer = setInterval(() => {
        this.updateDisplay()
      }, this.config.refreshInterval * 1000)
      
      console.log('Monitor interface started, press Q or Ctrl+C to exit')
      
    } catch (error) {
      console.error('Failed to start:', (error as Error).message)
      console.error('')
      console.error('Please check:')
      console.error('1. Claude Code is installed and has been run before')
      console.error('2. Log files exist')
      console.error('3. Sufficient file read permissions')
      process.exit(1)
    }
  }

  private parseCommandLineArgs(): void {
    const args = process.argv.slice(2)
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      
      switch (arg) {
        case '--plan':
        case '-p':
          const plan = args[++i]?.toLowerCase()
          if (plan && ['pro', 'max5', 'max20'].includes(plan)) {
            this.config.currentPlan = plan as 'pro' | 'max5' | 'max20'
          }
          break
          
        case '--refresh':
        case '-r':
          const interval = parseInt(args[++i])
          if (interval >= 1 && interval <= 60) {
            this.config.refreshInterval = interval
          }
          break
          
        case '--custom-limit':
        case '-l':
          const limit = parseInt(args[++i])
          if (limit > 0) {
            this.config.limits.custom = limit
            this.config.currentPlan = 'custom'
          }
          break
          
        case '--help':
        case '-h':
          this.showHelp()
          process.exit(0)
          break
          
        case '--version':
        case '-v':
          console.log('Claude Code Monitor v0.1.0')
          process.exit(0)
          break
      }
    }
  }

  private showHelp(): void {
    console.log(`
Claude Code Monitor v0.1.0

Usage:
  ccmonitor [options]

Options:
  -p, --plan <plan>          Set plan type (pro|max5|max20)
  -l, --custom-limit <num>   Set custom token limit
  -r, --refresh <seconds>    Set refresh interval (1-60s, default 3s)
  -h, --help                 Show help information
  -v, --version              Show version information

Examples:
  ccmonitor                  # Use default settings (pro plan)
  ccmonitor --plan max5      # Use Max5 plan
  ccmonitor --custom-limit 1000000 --refresh 5  # Custom limit and refresh

Keyboard Shortcuts:
  Q / Esc / Ctrl+C          Exit program
  R                         Toggle real-time monitoring
  P                         Show/hide prediction analysis
  M                         Show/hide model statistics
  H / ?                     Show help information

More info: https://github.com/your-username/ccmonitor
`)
  }

  stop(): void {
    console.log('\\nStopping monitor...')
    
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
    
    this.monitor.stop()
    this.ui.destroy()
    
    console.log('Monitor stopped')
    process.exit(0)
  }
}

// 启动应用
async function main() {
  const app = new CCMonitor()
  await app.start()
}

// 错误处理
main().catch((error) => {
  console.error('💥 应用启动失败:', error)
  process.exit(1)
})