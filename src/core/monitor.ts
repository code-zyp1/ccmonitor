import { watch, readFileSync, statSync, existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { EventEmitter } from 'events'
import { resolve, join } from 'path'
import { homedir } from 'os'
import type { ClaudeLogEntry, MonitorConfig } from './types.js'
import { createTestLogFile } from '../shared/testData.js'

export class ClaudeLogMonitor extends EventEmitter {
  private config: MonitorConfig
  private watcher: ReturnType<typeof watch> | null = null
  private lastPosition = 0
  private isRunning = false

  constructor(config: MonitorConfig) {
    super()
    this.config = config
  }

  async start(): Promise<void> {
    if (this.isRunning) return

    let logPath = await this.findLogFile()
    if (!logPath) {
      const searchPaths = this.getLogPaths()
      console.error('\nSearched for log files in:')
      searchPaths.forEach(path => console.error(`  - ${path}`))
      console.error('\nNo log files found. Creating test data...')
      
      // Create test log file
      const testLogPath = join(searchPaths[0], 'test-usage.jsonl')
      createTestLogFile(testLogPath)
      logPath = testLogPath
      
      console.log('Test data created. Monitor will use sample data.')
    }

    this.config.logPath = logPath
    console.log(`监听日志文件: ${logPath}`)
    
    // 读取现有内容
    await this.readExistingLogs()
    
    // 开始监听文件变化
    this.startWatching()
    this.isRunning = true
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
    this.isRunning = false
  }

  private async findLogFile(): Promise<string | null> {
    const possiblePaths = this.getLogPaths()
    
    for (const basePath of possiblePaths) {
      try {
        console.log(`Checking: ${basePath}`)
        if (existsSync(basePath)) {
          console.log(`  Directory exists: ${basePath}`)
          // Find the latest log file
          const files = await import('fs').then(fs => 
            fs.readdirSync(basePath, { withFileTypes: true })
          )
          
          const jsonlFiles = files
            .filter(f => f.isFile() && f.name.endsWith('.jsonl'))
            .map(f => ({
              path: join(basePath, f.name),
              mtime: statSync(join(basePath, f.name)).mtime
            }))
            .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

          console.log(`  Found ${jsonlFiles.length} JSONL files`)
          if (jsonlFiles.length > 0) {
            console.log(`  Using: ${jsonlFiles[0].path}`)
            return jsonlFiles[0].path
          }
        } else {
          console.log(`  Directory does not exist: ${basePath}`)
        }
      } catch (error) {
        console.log(`  Error accessing ${basePath}: ${error}`)
        continue
      }
    }

    return null
  }

  private getLogPaths(): string[] {
    const home = homedir()
    const platform = process.platform
    
    const paths = []
    
    if (platform === 'win32') {
      paths.push(
        resolve(home, 'AppData', 'Roaming', 'claude-code', 'logs'),
        resolve(home, '.claude', 'logs')
      )
    } else if (platform === 'darwin') {
      paths.push(
        resolve(home, 'Library', 'Logs', 'claude-code'),
        resolve(home, '.claude', 'logs')
      )
    } else {
      paths.push(
        resolve(home, '.local', 'share', 'claude-code', 'logs'),
        resolve(home, '.claude', 'logs')
      )
    }

    return paths
  }

  private async readExistingLogs(): Promise<void> {
    try {
      const content = await readFile(this.config.logPath, 'utf-8')
      this.lastPosition = Buffer.byteLength(content, 'utf-8')
      
      // 解析现有日志以建立基线
      const lines = content.trim().split('\\n').filter(line => line.trim())
      const entries: ClaudeLogEntry[] = []
      
      for (const line of lines) {
        try {
          const entry = this.parseLogLine(line)
          if (entry) {
            entries.push(entry)
          }
        } catch (error) {
          // 忽略解析失败的行
        }
      }

      if (entries.length > 0) {
        this.emit('logs_loaded', entries)
      }
    } catch (error) {
      console.warn('读取现有日志失败:', error)
      this.lastPosition = 0
    }
  }

  private startWatching(): void {
    this.watcher = watch(this.config.logPath, { persistent: true }, (eventType) => {
      if (eventType === 'change') {
        this.handleFileChange()
      }
    })
  }

  private async handleFileChange(): Promise<void> {
    try {
      const stats = statSync(this.config.logPath)
      const currentSize = stats.size
      
      if (currentSize > this.lastPosition) {
        // 读取新增内容
        const content = readFileSync(this.config.logPath, 'utf-8')
        const newContent = content.slice(this.lastPosition)
        const newLines = newContent.trim().split('\\n').filter(line => line.trim())
        
        for (const line of newLines) {
          try {
            const entry = this.parseLogLine(line)
            if (entry) {
              this.emit('new_entry', entry)
            }
          } catch (error) {
            console.warn('解析日志行失败:', line, error)
          }
        }
        
        this.lastPosition = currentSize
      } else if (currentSize < this.lastPosition) {
        // 文件被截断或重新创建，重新读取
        this.lastPosition = 0
        await this.readExistingLogs()
      }
    } catch (error) {
      this.emit('error', error as Error)
    }
  }

  private parseLogLine(line: string): ClaudeLogEntry | null {
    try {
      const data = JSON.parse(line)
      
      // 检查是否是Claude使用记录
      if (!data.model || !data.input_tokens || !data.output_tokens) {
        return null
      }

      return {
        timestamp: data.timestamp || Date.now(),
        model: data.model,
        input_tokens: data.input_tokens || 0,
        output_tokens: data.output_tokens || 0,
        cache_creation_input_tokens: data.cache_creation_input_tokens || 0,
        cache_read_input_tokens: data.cache_read_input_tokens || 0,
        total_tokens: (data.input_tokens || 0) + (data.output_tokens || 0) + 
                     (data.cache_creation_input_tokens || 0),
        cost: data.cost,
        session_id: data.session_id
      }
    } catch (error) {
      return null
    }
  }

  // TypeScript事件类型安全
  override on(event: 'new_entry', listener: (entry: ClaudeLogEntry) => void): this
  override on(event: 'logs_loaded', listener: (entries: ClaudeLogEntry[]) => void): this  
  override on(event: 'error', listener: (error: Error) => void): this
  override on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener)
  }

  override emit(event: 'new_entry', entry: ClaudeLogEntry): boolean
  override emit(event: 'logs_loaded', entries: ClaudeLogEntry[]): boolean
  override emit(event: 'error', error: Error): boolean
  override emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args)
  }
}