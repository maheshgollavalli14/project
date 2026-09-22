type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SECURITY' | 'CONTEST' | 'AUDIT';

interface LogPayload {
  message: string;
  level?: LogLevel;
  context?: string;
  data?: Record<string, any>;
}

export const logger = {
  log(level: LogLevel, message: string, context?: string, data?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const logObj = {
      timestamp,
      level,
      context: context || 'Application',
      message,
      ...(data ? { data } : {}),
    };

    if (level === 'ERROR' || level === 'SECURITY') {
      console.error(JSON.stringify(logObj));
    } else if (level === 'WARN') {
      console.warn(JSON.stringify(logObj));
    } else {
      console.log(JSON.stringify(logObj));
    }
  },

  info(message: string, context?: string, data?: Record<string, any>) {
    this.log('INFO', message, context, data);
  },

  warn(message: string, context?: string, data?: Record<string, any>) {
    this.log('WARN', message, context, data);
  },

  error(message: string, context?: string, data?: Record<string, any>) {
    this.log('ERROR', message, context, data);
  },

  security(message: string, context?: string, data?: Record<string, any>) {
    this.log('SECURITY', message, context, data);
  },

  contest(message: string, context?: string, data?: Record<string, any>) {
    this.log('CONTEST', message, context, data);
  },

  audit(message: string, context?: string, data?: Record<string, any>) {
    this.log('AUDIT', message, context, data);
  },
};
