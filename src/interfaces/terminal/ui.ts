import blessed from 'blessed'
import { format } from 'date-fns'
import type { UsageData, PredictionResult, UIState } from '../../core/types.js'
import { SYMBOLS } from '../../shared/constants.js'

export class TerminalUI {
  private screen: blessed.Widgets.Screen
  private boxes: {
    main?: blessed.Widgets.BoxElement
    header?: blessed.Widgets.BoxElement  
    usage?: blessed.Widgets.BoxElement
    prediction?: blessed.Widgets.BoxElement
    models?: blessed.Widgets.BoxElement
    footer?: blessed.Widgets.BoxElement
  } = {}
  
  private state: UIState = {
    currentView: 'overview',
    isRealtime: true,
    showPrediction: true,
    showModels: true
  }

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Claude Code Monitor',
      dockBorders: true,
      cursor: {
        artificial: true,
        shape: 'line',
        blink: true,
        color: 'white'
      }
    })

    this.setupUI()
    this.setupKeyHandlers()
  }

  private setupUI(): void {
    // 主容器
    this.boxes.main = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: '#00d4ff'
        }
      }
    })

    // 头部信息区
    this.boxes.header = blessed.box({
      parent: this.boxes.main,
      top: 0,
      left: 1,
      width: '100%-2',
      height: 3,
      content: '',
      style: {
        fg: 'white',
        bg: 'blue'
      }
    })

    // 使用量显示区  
    this.boxes.usage = blessed.box({
      parent: this.boxes.main,
      top: 3,
      left: 1,
      width: '60%',
      height: 12,
      border: {
        type: 'line'
      },
      label: ' Usage Statistics ',
      style: {
        border: {
          fg: '#00ff88'
        }
      }
    })

    // 预测分析区
    this.boxes.prediction = blessed.box({
      parent: this.boxes.main,
      top: 3, 
      left: '60%',
      width: '40%-1',
      height: 8,
      border: {
        type: 'line'
      },
      label: ' Prediction Analysis ',
      style: {
        border: {
          fg: '#ffaa00'
        }
      }
    })

    // 模型分解区
    this.boxes.models = blessed.box({
      parent: this.boxes.main,
      top: 11,
      left: '60%', 
      width: '40%-1',
      height: 4,
      border: {
        type: 'line'
      },
      label: ' Model Usage ',
      style: {
        border: {
          fg: '#8888ff'
        }
      }
    })

    // 底部状态栏
    this.boxes.footer = blessed.box({
      parent: this.boxes.main,
      bottom: 0,
      left: 1,
      width: '100%-2',
      height: 3,
      content: '',
      style: {
        fg: 'white',
        bg: 'black'
      }
    })

    // 渲染屏幕
    this.screen.render()
  }

  private setupKeyHandlers(): void {
    this.screen.key(['escape', 'q', 'C-c'], () => {
      process.exit(0)
    })

    this.screen.key(['r'], () => {
      this.state.isRealtime = !this.state.isRealtime
      this.updateFooter()
    })

    this.screen.key(['p'], () => {
      this.state.showPrediction = !this.state.showPrediction
      this.updateLayout()
    })

    this.screen.key(['m'], () => {
      this.state.showModels = !this.state.showModels  
      this.updateLayout()
    })

    this.screen.key(['h', '?'], () => {
      this.showHelp()
    })
  }

  updateDisplay(usage: UsageData, prediction: PredictionResult): void {
    this.updateHeader(usage)
    this.updateUsage(usage)
    this.updatePrediction(prediction)
    this.updateModels(usage.models)
    this.updateFooter()
    this.screen.render()
  }

  private updateHeader(usage: UsageData): void {
    if (!this.boxes.header) return

    const { current } = usage
    const resetTime = format(current.resetTime, 'HH:mm:ss')
    const statusIcon = this.getStatusIcon(current.percentage)
    
    const headerText = ` ${statusIcon} Claude Code Monitor - Next Reset: ${resetTime} (${current.timeToReset} min) `
    
    this.boxes.header.setContent(headerText)
  }

  private updateUsage(usage: UsageData): void {
    if (!this.boxes.usage) return

    const { current, recent } = usage
    
    // 创建进度条
    const progressBar = this.createProgressBar(current.percentage, 40)
    const percentageColor = this.getPercentageColor(current.percentage)
    
    const content = [
      '',
      `  Current Usage: ${current.used.toLocaleString()} / ${current.limit.toLocaleString()} tokens`,
      `  ${progressBar} ${percentageColor}${current.percentage.toFixed(1)}%{/}`,
      '',
      `  Last 1h: ${recent.lastHour.toLocaleString()} tokens`,
      `  Last 6h: ${recent.last6Hours.toLocaleString()} tokens`,  
      `  Session: ${recent.currentSession.toLocaleString()} tokens`,
      `  Rate: ${recent.averagePerHour.toFixed(0)} tokens/hour`,
      '',
      `  Reset in: ${current.timeToReset} min`,
      ''
    ].join('\\n')

    this.boxes.usage.setContent(content)
  }

  private updatePrediction(prediction: PredictionResult): void {
    if (!this.boxes.prediction || !this.state.showPrediction) return

    const { timeToLimit, confidence, burnRate, recommendation, message } = prediction
    
    const recommendationIcon = this.getRecommendationIcon(recommendation)
    const confidenceBar = this.createProgressBar(confidence * 100, 20, '▓', '░')
    
    let timeText = '无法预测'
    if (timeToLimit !== null) {
      const hours = Math.floor(timeToLimit / 60)
      const minutes = Math.round(timeToLimit % 60)
      timeText = hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`
    }

    const content = [
      '',
      `  ${recommendationIcon} Status: ${this.getRecommendationText(recommendation)}`,
      `  Time to limit: ${timeText}`,
      `  Burn rate: ${burnRate.toFixed(1)} tokens/min`,
      `  Confidence: ${confidenceBar} ${(confidence * 100).toFixed(0)}%`,
      `  ${message}`,
      ''
    ].join('\\n')

    this.boxes.prediction.setContent(content)
  }

  private updateModels(models: UsageData['models']): void {
    if (!this.boxes.models || !this.state.showModels) return

    const modelEntries = Object.entries(models)
      .sort(([,a], [,b]) => b.tokens - a.tokens)
      .slice(0, 3) // 只显示前3个模型

    if (modelEntries.length === 0) {
      this.boxes.models.setContent('\\n  No usage data')
      return
    }

    const content = ['']
    for (const [model, data] of modelEntries) {
      const modelName = this.getShortModelName(model)
      const percentage = modelEntries.reduce((sum, [,m]) => sum + m.tokens, 0)
      const modelPercent = (data.tokens / percentage * 100).toFixed(0)
      content.push(`  ${modelName}: ${data.tokens.toLocaleString()} (${modelPercent}%)`)
    }
    content.push('')

    this.boxes.models.setContent(content.join('\\n'))
  }

  private updateFooter(): void {
    if (!this.boxes.footer) return

    const realtimeStatus = this.state.isRealtime ? '{green-fg}Live{/}' : '{red-fg}Paused{/}'
    const timestamp = format(new Date(), 'HH:mm:ss')
    
    const footerText = [
      ` Status: ${realtimeStatus} | Updated: ${timestamp}`,
      ` Keys: [Q]Quit [R]Pause [P]Prediction [M]Models [H]Help`
    ].join('\\n')

    this.boxes.footer.setContent(footerText)
  }

  private createProgressBar(
    percentage: number, 
    width: number, 
    filled: string = SYMBOLS.progress.filled,
    empty: string = SYMBOLS.progress.empty
  ): string {
    const fillWidth = Math.round((percentage / 100) * width)
    const emptyWidth = width - fillWidth
    
    const color = this.getPercentageColor(percentage, false)
    
    return `{${color}}${filled.repeat(fillWidth)}{/}${empty.repeat(emptyWidth)}`
  }

  private getStatusIcon(percentage: number): string {
    if (percentage >= 95) return '[CRIT]'
    if (percentage >= 80) return '[WARN]'
    if (percentage >= 60) return '[INFO]'
    return '[OK]'
  }

  private getPercentageColor(percentage: number, withTag: boolean = true): string {
    let color = 'green-fg'
    if (percentage >= 95) color = 'red-fg'
    else if (percentage >= 80) color = 'yellow-fg'
    else if (percentage >= 60) color = 'cyan-fg'
    
    return withTag ? `{${color}}` : color
  }

  private getRecommendationIcon(recommendation: PredictionResult['recommendation']): string {
    switch (recommendation) {
      case 'critical': return '[STOP]'
      case 'pause': return '[WAIT]'
      case 'slow_down': return '[SLOW]'
      case 'continue': return '[OK]'
      default: return '[INFO]'
    }
  }

  private getRecommendationText(recommendation: PredictionResult['recommendation']): string {
    switch (recommendation) {
      case 'critical': return '{red-fg}CRITICAL{/}'
      case 'pause': return '{yellow-fg}PAUSE{/}'  
      case 'slow_down': return '{cyan-fg}SLOW DOWN{/}'
      case 'continue': return '{green-fg}CONTINUE{/}'
      default: return 'UNKNOWN'
    }
  }

  private getShortModelName(model: string): string {
    if (model.includes('sonnet')) return 'Sonnet'
    if (model.includes('opus')) return 'Opus'
    if (model.includes('haiku')) return 'Haiku'
    return model.split('-')[0] || model
  }

  private updateLayout(): void {
    // 根据state调整布局
    if (!this.state.showPrediction && !this.state.showModels) {
      this.boxes.usage!.width = '100%-2'
      this.boxes.prediction!.hide()
      this.boxes.models!.hide()
    } else if (!this.state.showPrediction) {
      this.boxes.usage!.width = '60%'
      this.boxes.prediction!.hide()
      this.boxes.models!.show()
      this.boxes.models!.top = 3
      this.boxes.models!.height = 12
    } else if (!this.state.showModels) {
      this.boxes.usage!.width = '60%'
      this.boxes.prediction!.show()
      this.boxes.prediction!.height = 12
      this.boxes.models!.hide()
    } else {
      this.boxes.usage!.width = '60%'
      this.boxes.prediction!.show()
      this.boxes.prediction!.height = 8
      this.boxes.models!.show()
      this.boxes.models!.top = 11
      this.boxes.models!.height = 4
    }
    
    this.screen.render()
  }

  private showHelp(): void {
    const helpBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 60,
      height: 16,
      border: {
        type: 'line'
      },
      label: ' Help Information ',
      content: [
        '',
        '  Keyboard Shortcuts:',
        '  ===================================',  
        '  Q / Esc / Ctrl+C  Exit program',
        '  R                 Toggle real-time monitoring',
        '  P                 Show/hide prediction analysis',
        '  M                 Show/hide model statistics',
        '  H / ?             Show this help information',
        '',
        '  Interface Guide:',
        '  ===================================',
        '  * Green: Normal usage (< 60%)',
        '  * Blue: Watch usage (60-80%)', 
        '  * Yellow: Near limit (80-95%)',
        '  * Red: At limit (>= 95%)',
        '',
        '  Press any key to close help...'
      ].join('\\n'),
      style: {
        border: {
          fg: 'yellow'
        }
      }
    })

    helpBox.focus()
    helpBox.key(['escape', 'enter', 'space'], () => {
      helpBox.destroy()
      this.screen.render()
    })

    this.screen.render()
  }

  showError(error: string): void {
    const errorBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center', 
      width: 50,
      height: 8,
      border: {
        type: 'line'
      },
      label: ' Error ',
      content: `\\n\\n  [X] ${error}\\n\\n  Press any key to continue...`,
      style: {
        border: {
          fg: 'red'
        }
      }
    })

    errorBox.focus()
    errorBox.key(['escape', 'enter', 'space'], () => {
      errorBox.destroy()
      this.screen.render()
    })

    this.screen.render()
  }

  destroy(): void {
    this.screen.destroy()
  }
}