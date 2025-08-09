/**
 * Notification System for Claude Code Monitor
 * Provides desktop notifications and alerts for usage thresholds
 * Enhanced with real-time monitoring and cross-platform support
 */

import type { UsageData } from './types.js'

export interface NotificationConfig {
  enabled: boolean
  thresholds: {
    warning: number    // percentage
    critical: number   // percentage
  }
  desktop: boolean
  sound: boolean
}

export class NotificationManager {
  private config: NotificationConfig
  private lastNotification = 0
  private readonly NOTIFICATION_COOLDOWN = 300000 // 5 minutes

  constructor(config: NotificationConfig) {
    this.config = config
  }

  /**
   * Check usage and send notifications if needed
   */
  checkUsageNotifications(usage: UsageData): void {
    if (!this.config.enabled) return

    const now = Date.now()
    if (now - this.lastNotification < this.NOTIFICATION_COOLDOWN) return

    const usagePercentage = (usage.used / usage.limit) * 100

    if (usagePercentage >= this.config.thresholds.critical) {
      this.sendNotification(
        'Critical Usage Alert',
        `Claude usage at ${usagePercentage.toFixed(1)}%! Limit will be reached soon.`,
        'critical'
      )
    } else if (usagePercentage >= this.config.thresholds.warning) {
      this.sendNotification(
        'Usage Warning',
        `Claude usage at ${usagePercentage.toFixed(1)}%. Consider monitoring your usage.`,
        'warning'
      )
    }
  }

  /**
   * Send notification based on type
   */
  private sendNotification(title: string, message: string, type: 'warning' | 'critical'): void {
    this.lastNotification = Date.now()

    if (this.config.desktop) {
      this.sendDesktopNotification(title, message, type)
    }

    // Console notification for debugging
    const icon = type === 'critical' ? '🚨' : '⚠️'
    console.log(`${icon} ${title}: ${message}`)
  }

  /**
   * Send desktop notification (cross-platform)
   */
  private sendDesktopNotification(title: string, message: string, type: 'warning' | 'critical'): void {
    // For Windows, could use PowerShell toast notifications
    // For macOS/Linux, could use native notification systems
    // For now, using console output as fallback
    console.log(`[DESKTOP NOTIFICATION] ${title}: ${message}`)
  }

  /**
   * Update notification configuration
   */
  updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Test notification system
   */
  testNotification(): void {
    this.sendNotification(
      'Test Notification',
      'Notification system is working correctly!',
      'warning'
    )
  }
}