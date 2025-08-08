import { writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import type { ClaudeLogEntry } from '../core/types.js'

export function generateTestData(): ClaudeLogEntry[] {
  const now = Date.now()
  const entries: ClaudeLogEntry[] = []
  
  // Generate sample data for the last 4 hours
  const models = ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307']
  
  for (let i = 0; i < 50; i++) {
    const timestamp = now - (Math.random() * 4 * 60 * 60 * 1000) // Random time in last 4 hours
    const model = models[Math.floor(Math.random() * models.length)]
    const inputTokens = Math.floor(Math.random() * 2000) + 100
    const outputTokens = Math.floor(Math.random() * 1000) + 50
    
    entries.push({
      timestamp,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_creation_input_tokens: Math.random() > 0.7 ? Math.floor(Math.random() * 500) : 0,
      cache_read_input_tokens: Math.random() > 0.8 ? Math.floor(Math.random() * 200) : 0,
      total_tokens: inputTokens + outputTokens,
      session_id: `session_${Math.floor(i / 10)}`
    })
  }
  
  return entries.sort((a, b) => a.timestamp - b.timestamp)
}

export function createTestLogFile(path: string): void {
  const dir = dirname(path)
  mkdirSync(dir, { recursive: true })
  
  const testData = generateTestData()
  const jsonlContent = testData
    .map(entry => JSON.stringify(entry))
    .join('\n')
  
  writeFileSync(path, jsonlContent, 'utf-8')
  console.log(`Test log file created: ${path}`)
}