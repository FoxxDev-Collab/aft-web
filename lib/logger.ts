import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');

// DOD/Enterprise log levels and colors
const logLevels = {
  levels: {
    emergency: 0,  // System unusable
    alert: 1,      // Action must be taken immediately
    critical: 2,   // Critical conditions
    error: 3,      // Error conditions
    warning: 4,    // Warning conditions
    notice: 5,     // Normal but significant conditions
    info: 6,       // Informational messages
    debug: 7       // Debug-level messages
  },
  colors: {
    emergency: 'red',
    alert: 'yellow',
    critical: 'red',
    error: 'red',
    warning: 'yellow',
    notice: 'cyan',
    info: 'green',
    debug: 'blue'
  }
};

winston.addColors(logLevels.colors);

// Security-compliant timestamp format (ISO 8601 with timezone)
const timestampFormat = winston.format.timestamp({
  format: 'YYYY-MM-DD HH:mm:ss.SSS Z'
});

// Enterprise log format with correlation IDs and security context
const logFormat = winston.format.combine(
  timestampFormat,
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, correlationId, userId, sessionId, userAgent, ip, ...meta }) => {
    const logEntry: Record<string, unknown> = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(correlationId ? { correlationId } : {}),
      ...(userId ? { userId } : {}),
      ...(sessionId ? { sessionId } : {}),
      ...(userAgent ? { userAgent } : {}),
      ...(ip ? { ip } : {}),
      ...(stack ? { stack } : {}),
      ...meta
    };
    
    return JSON.stringify(logEntry);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  timestampFormat,
  winston.format.printf(({ timestamp, level, message, correlationId, userId }) => {
    const prefix = correlationId ? `[${correlationId}]` : '';
    const userContext = userId ? ` (user:${userId})` : '';
    return `${timestamp} ${level}:${prefix}${userContext} ${message}`;
  })
);

// Daily rotate file transport for application logs
const applicationLogTransport = new DailyRotateFile({
  filename: path.join(logDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '100m',
  maxFiles: '30d',
  format: logFormat,
  level: 'info'
});

// Daily rotate file transport for error logs
const errorLogTransport = new DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '100m',
  maxFiles: '90d', // Keep error logs longer
  format: logFormat,
  level: 'error'
});

// Daily rotate file transport for security/audit logs
const securityLogTransport = new DailyRotateFile({
  filename: path.join(logDir, 'security-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '100m',
  maxFiles: '365d', // Keep security logs for 1 year
  format: logFormat,
  level: 'notice'
});

// Create the main logger
const logger = winston.createLogger({
  levels: logLevels.levels,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    applicationLogTransport,
    errorLogTransport,
    securityLogTransport
  ],
  // Exit on handled exceptions
  exitOnError: false
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// Security logger for audit events
export const securityLogger = winston.createLogger({
  levels: logLevels.levels,
  level: 'notice',
  format: winston.format.combine(
    timestampFormat,
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const auditEntry = {
        timestamp,
        level: level.toUpperCase(),
        event_type: 'SECURITY_AUDIT',
        message,
        ...meta
      };
      return JSON.stringify(auditEntry);
    })
  ),
  transports: [securityLogTransport]
});

// Application logger helper functions with context
interface LogContext {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  action?: string;
  resource?: string;
}

class ApplicationLogger {
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  emergency(message: string, context?: LogContext) {
    logger.log('emergency', message, { correlationId: this.generateCorrelationId(), ...context });
  }

  alert(message: string, context?: LogContext) {
    logger.log('alert', message, { correlationId: this.generateCorrelationId(), ...context });
  }

  critical(message: string, context?: LogContext) {
    logger.log('critical', message, { correlationId: this.generateCorrelationId(), ...context });
  }

  error(message: string, context?: LogContext) {
    logger.error(message, { correlationId: this.generateCorrelationId(), ...context });
  }

  warning(message: string, context?: LogContext) {
    logger.warn(message, { correlationId: this.generateCorrelationId(), ...context });
  }

  notice(message: string, context?: LogContext) {
    logger.log('notice', message, { correlationId: this.generateCorrelationId(), ...context });
  }

  info(message: string, context?: LogContext) {
    logger.info(message, { correlationId: this.generateCorrelationId(), ...context });
  }

  debug(message: string, context?: LogContext) {
    logger.debug(message, { correlationId: this.generateCorrelationId(), ...context });
  }

  // Security-specific logging methods
  securityEvent(event: string, details: Record<string, unknown>, context?: LogContext) {
    securityLogger.log('notice', `Security Event: ${event}`, {
      correlationId: this.generateCorrelationId(),
      event,
      details,
      ...context
    });
  }

  loginAttempt(successful: boolean, email: string, context?: LogContext) {
    const message = successful ? 'Successful login' : 'Failed login attempt';
    securityLogger.log('notice', message, {
      correlationId: this.generateCorrelationId(),
      event: 'LOGIN_ATTEMPT',
      successful,
      email,
      ...context
    });
  }

  dataAccess(resource: string, action: string, context?: LogContext) {
    securityLogger.log('notice', `Data access: ${action} on ${resource}`, {
      correlationId: this.generateCorrelationId(),
      event: 'DATA_ACCESS',
      resource,
      action,
      ...context
    });
  }

  privilegedAction(action: string, context?: LogContext) {
    securityLogger.log('notice', `Privileged action: ${action}`, {
      correlationId: this.generateCorrelationId(),
      event: 'PRIVILEGED_ACTION',
      action,
      ...context
    });
  }
}

export const appLogger = new ApplicationLogger();
export default logger;