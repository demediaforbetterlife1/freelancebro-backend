type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogData {
  level: LogLevel
  message: string
  timestamp: string
  data?: any
}

class Logger {
  private log(level: LogLevel, message: string, data?: any) {
    const logData: LogData = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(data && { data }),
    }

    // In production, you might want to send this to a logging service
    // like Sentry, LogRocket, Datadog, etc.
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logData))
    } else {
      // Pretty print in development
      const colors = {
        info: '\x1b[36m',    // Cyan
        warn: '\x1b[33m',    // Yellow
        error: '\x1b[31m',   // Red
        debug: '\x1b[90m',   // Gray
      }
      const reset = '\x1b[0m'
      console.log(
        `${colors[level]}[${level.toUpperCase()}]${reset} ${message}`,
        data ? data : ''
      )
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data)
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data)
  }

  error(message: string, data?: any) {
    this.log('error', message, data)
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV !== 'production') {
      this.log('debug', message, data)
    }
  }
}

export const logger = new Logger()
