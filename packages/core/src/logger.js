// logger.js - Industry-grade logging system
const winston = require('winston');
const path = require('path');

class Logger {
    constructor(options = {}) {
        this.serviceName = options.serviceName || 'myavana-chatbot';
        this.environment = options.environment || process.env.NODE_ENV || 'development';
        this.logLevel = options.logLevel || process.env.LOG_LEVEL || 'info';
        
        this.logger = this.createLogger();
    }

    createLogger() {
        const logFormat = winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.json(),
            winston.format.printf(({ timestamp, level, message, service, requestId, userId, ...meta }) => {
                const logObject = {
                    timestamp,
                    level: level.toUpperCase(),
                    service: service || this.serviceName,
                    message,
                    ...(requestId && { requestId }),
                    ...(userId && { userId }),
                    ...meta
                };
                return JSON.stringify(logObject);
            })
        );

        const transports = [
            // Console transport for development
            new winston.transports.Console({
                format: this.environment === 'development' 
                    ? winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple(),
                        winston.format.printf(({ timestamp, level, message, requestId, userId, ...meta }) => {
                            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                            const idInfo = [requestId && `[${requestId}]`, userId && `[User:${userId}]`]
                                .filter(Boolean).join(' ');
                            return `${timestamp} ${level}: ${idInfo} ${message} ${metaStr}`;
                        })
                    )
                    : logFormat
            })
        ];

        // File transports for production
        if (this.environment === 'production') {
            const logsDir = path.join(process.cwd(), 'logs');
            
            transports.push(
                // Error logs
                new winston.transports.File({
                    filename: path.join(logsDir, 'error.log'),
                    level: 'error',
                    format: logFormat,
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                }),
                // Combined logs
                new winston.transports.File({
                    filename: path.join(logsDir, 'combined.log'),
                    format: logFormat,
                    maxsize: 5242880, // 5MB
                    maxFiles: 10,
                }),
                // Performance logs
                new winston.transports.File({
                    filename: path.join(logsDir, 'performance.log'),
                    level: 'info',
                    format: logFormat,
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                })
            );
        }

        return winston.createLogger({
            level: this.logLevel,
            format: logFormat,
            defaultMeta: { 
                service: this.serviceName,
                environment: this.environment 
            },
            transports,
            exitOnError: false,
        });
    }

    // Core logging methods
    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    error(message, meta = {}) {
        this.logger.error(message, meta);
    }

    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }

    // Specialized logging methods
    logRequest(requestId, method, url, body, meta = {}) {
        this.info('Incoming request', {
            requestId,
            method,
            url,
            bodySize: JSON.stringify(body).length,
            ...meta
        });
    }

    logResponse(requestId, statusCode, responseTime, meta = {}) {
        this.info('Response sent', {
            requestId,
            statusCode,
            responseTime: `${responseTime}ms`,
            ...meta
        });
    }

    logAIInteraction(requestId, model, prompt, response, responseTime, meta = {}) {
        this.info('AI interaction', {
            requestId,
            model,
            promptLength: prompt ? prompt.length : 0,
            responseLength: response ? JSON.stringify(response).length : 0,
            responseTime: `${responseTime}ms`,
            ...meta
        });
    }

    logDatabaseOperation(operation, table, duration, success, meta = {}) {
        const level = success ? 'info' : 'error';
        this.logger[level]('Database operation', {
            operation,
            table,
            duration: `${duration}ms`,
            success,
            ...meta
        });
    }

    logCacheOperation(operation, key, hit, duration, meta = {}) {
        this.info('Cache operation', {
            operation,
            key: this.sanitizeKey(key),
            hit,
            duration: `${duration}ms`,
            ...meta
        });
    }

    logUserAction(userId, action, conversationId, meta = {}) {
        this.info('User action', {
            userId,
            action,
            conversationId,
            ...meta
        });
    }

    logError(error, context = {}) {
        this.error('Application error', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            ...context
        });
    }

    logPerformance(operation, duration, meta = {}) {
        const level = duration > 5000 ? 'warn' : 'info'; // Warn if operation takes > 5s
        this.logger[level]('Performance metric', {
            operation,
            duration: `${duration}ms`,
            slow: duration > 5000,
            ...meta
        });
    }

    logSecurityEvent(event, userId, severity = 'medium', meta = {}) {
        const level = severity === 'high' ? 'error' : 'warn';
        this.logger[level]('Security event', {
            event,
            userId,
            severity,
            timestamp: new Date().toISOString(),
            ...meta
        });
    }

    logBusinessMetric(metric, value, userId, conversationId, meta = {}) {
        this.info('Business metric', {
            metric,
            value,
            userId,
            conversationId,
            ...meta
        });
    }

    // Utility methods
    sanitizeKey(key) {
        if (typeof key !== 'string') return key;
        // Remove sensitive information from cache keys
        return key.replace(/user:\d+/g, 'user:***').substring(0, 100);
    }

    // Create child logger with additional context
    child(meta = {}) {
        return {
            info: (message, additionalMeta = {}) => this.info(message, { ...meta, ...additionalMeta }),
            error: (message, additionalMeta = {}) => this.error(message, { ...meta, ...additionalMeta }),
            warn: (message, additionalMeta = {}) => this.warn(message, { ...meta, ...additionalMeta }),
            debug: (message, additionalMeta = {}) => this.debug(message, { ...meta, ...additionalMeta }),
        };
    }

    // Middleware for Express
    middleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Add logger to request
            req.logger = this.child({ requestId });
            req.requestId = requestId;
            
            // Log request
            this.logRequest(requestId, req.method, req.url, req.body);
            
            // Override res.end to log response
            const originalEnd = res.end;
            res.end = function(...args) {
                const responseTime = Date.now() - startTime;
                this.logResponse(requestId, res.statusCode, responseTime);
                originalEnd.apply(res, args);
            }.bind(this);
            
            next();
        };
    }
}

// Singleton instance
let loggerInstance = null;

function createLogger(options = {}) {
    if (!loggerInstance) {
        loggerInstance = new Logger(options);
    }
    return loggerInstance;
}

function getLogger() {
    if (!loggerInstance) {
        loggerInstance = new Logger();
    }
    return loggerInstance;
}

module.exports = {
    Logger,
    createLogger,
    getLogger
};