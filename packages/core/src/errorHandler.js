// errorHandler.js - Comprehensive error handling system
const { v4: uuidv4 } = require('uuid');

class ErrorHandler {
    constructor(options = {}) {
        this.logger = options.logger;
        this.notificationService = options.notificationService;
        this.environment = options.environment || process.env.NODE_ENV || 'development';
        
        // Error categorization
        this.errorCategories = {
            VALIDATION: 'VALIDATION_ERROR',
            DATABASE: 'DATABASE_ERROR',
            AI_MODEL: 'AI_MODEL_ERROR',
            NETWORK: 'NETWORK_ERROR',
            AUTHENTICATION: 'AUTH_ERROR',
            RATE_LIMIT: 'RATE_LIMIT_ERROR',
            BUSINESS_LOGIC: 'BUSINESS_LOGIC_ERROR',
            SYSTEM: 'SYSTEM_ERROR',
            EXTERNAL_API: 'EXTERNAL_API_ERROR'
        };

        // Severity levels
        this.severityLevels = {
            LOW: 'low',
            MEDIUM: 'medium',
            HIGH: 'high',
            CRITICAL: 'critical'
        };

        // Error recovery strategies
        this.recoveryStrategies = new Map();
        this.initializeRecoveryStrategies();
    }

    initializeRecoveryStrategies() {
        // AI Model failures
        this.recoveryStrategies.set(this.errorCategories.AI_MODEL, {
            maxRetries: 3,
            backoffMs: 1000,
            fallbackModels: ['gemini15Flash', 'xai-grok-3-mini-fast'],
            canRecover: true
        });

        // Database failures
        this.recoveryStrategies.set(this.errorCategories.DATABASE, {
            maxRetries: 2,
            backoffMs: 500,
            canRecover: true,
            fallbackAction: 'return_cached_data'
        });

        // Network failures
        this.recoveryStrategies.set(this.errorCategories.NETWORK, {
            maxRetries: 3,
            backoffMs: 2000,
            canRecover: true
        });

        // Validation errors
        this.recoveryStrategies.set(this.errorCategories.VALIDATION, {
            maxRetries: 0,
            canRecover: false,
            userMessage: 'Please check your input and try again'
        });
    }

    // Create structured error
    createError(message, category, severity = this.severityLevels.MEDIUM, originalError = null, context = {}) {
        const error = new Error(message);
        error.id = uuidv4();
        error.category = category;
        error.severity = severity;
        error.timestamp = new Date().toISOString();
        error.context = context;
        error.originalError = originalError;
        error.recoverable = this.isRecoverable(category);
        
        return error;
    }

    // Main error handling method
    async handleError(error, context = {}) {
        const errorInfo = this.extractErrorInfo(error);
        const errorId = errorInfo.id || uuidv4();

        // Enrich error context
        const enrichedContext = {
            ...context,
            errorId,
            timestamp: new Date().toISOString(),
            environment: this.environment,
            stackTrace: error.stack
        };

        // Log error
        await this.logError(errorInfo, enrichedContext);

        // Attempt recovery if possible
        if (errorInfo.recoverable) {
            const recoveryResult = await this.attemptRecovery(errorInfo, enrichedContext);
            if (recoveryResult.success) {
                this.logger?.info('Error recovery successful', {
                    errorId,
                    category: errorInfo.category,
                    recoveryStrategy: recoveryResult.strategy
                });
                return recoveryResult;
            }
        }

        // Notify if critical
        if (errorInfo.severity === this.severityLevels.CRITICAL) {
            await this.notifyCriticalError(errorInfo, enrichedContext);
        }

        // Return structured error response
        return this.createErrorResponse(errorInfo, enrichedContext);
    }

    extractErrorInfo(error) {
        if (error.category) {
            // Already a structured error
            return error;
        }

        // Categorize common errors
        const category = this.categorizeError(error);
        const severity = this.determineSeverity(error, category);

        return {
            id: uuidv4(),
            message: error.message,
            category,
            severity,
            originalError: error,
            recoverable: this.isRecoverable(category),
            timestamp: new Date().toISOString()
        };
    }

    categorizeError(error) {
        const message = error.message.toLowerCase();
        const stack = error.stack?.toLowerCase() || '';

        // Database errors
        if (message.includes('connection') && (message.includes('postgres') || message.includes('redis'))) {
            return this.errorCategories.DATABASE;
        }

        // AI Model errors
        if (message.includes('gemini') || message.includes('grok') || message.includes('openai') || 
            message.includes('model') || message.includes('api quota')) {
            return this.errorCategories.AI_MODEL;
        }

        // Network errors
        if (message.includes('network') || message.includes('timeout') || message.includes('econnrefused') ||
            message.includes('enotfound') || message.includes('fetch')) {
            return this.errorCategories.NETWORK;
        }

        // Validation errors
        if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
            return this.errorCategories.VALIDATION;
        }

        // Rate limiting
        if (message.includes('rate limit') || message.includes('too many requests')) {
            return this.errorCategories.RATE_LIMIT;
        }

        // Authentication errors
        if (message.includes('unauthorized') || message.includes('authentication') || message.includes('token')) {
            return this.errorCategories.AUTHENTICATION;
        }

        // Default to system error
        return this.errorCategories.SYSTEM;
    }

    determineSeverity(error, category) {
        // Critical errors that require immediate attention
        if (category === this.errorCategories.DATABASE && error.message.includes('connection')) {
            return this.severityLevels.CRITICAL;
        }

        if (category === this.errorCategories.SYSTEM && error.message.includes('out of memory')) {
            return this.severityLevels.CRITICAL;
        }

        // High severity errors
        if (category === this.errorCategories.AI_MODEL && error.message.includes('quota')) {
            return this.severityLevels.HIGH;
        }

        // Medium severity (default)
        if ([this.errorCategories.NETWORK, this.errorCategories.EXTERNAL_API].includes(category)) {
            return this.severityLevels.MEDIUM;
        }

        // Low severity
        if ([this.errorCategories.VALIDATION, this.errorCategories.RATE_LIMIT].includes(category)) {
            return this.severityLevels.LOW;
        }

        return this.severityLevels.MEDIUM;
    }

    isRecoverable(category) {
        const strategy = this.recoveryStrategies.get(category);
        return strategy ? strategy.canRecover : false;
    }

    async attemptRecovery(errorInfo, context) {
        const strategy = this.recoveryStrategies.get(errorInfo.category);
        if (!strategy || !strategy.canRecover) {
            return { success: false, reason: 'No recovery strategy available' };
        }

        const maxRetries = strategy.maxRetries || 0;
        const backoffMs = strategy.backoffMs || 1000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger?.info('Attempting error recovery', {
                    errorId: errorInfo.id,
                    category: errorInfo.category,
                    attempt,
                    maxRetries
                });

                // Wait before retry (exponential backoff)
                if (attempt > 1) {
                    const delay = backoffMs * Math.pow(2, attempt - 2);
                    await this.sleep(delay);
                }

                // Attempt recovery based on category
                const recoveryResult = await this.executeRecoveryStrategy(errorInfo, strategy, context);
                if (recoveryResult.success) {
                    return {
                        success: true,
                        strategy: strategy,
                        attempt,
                        result: recoveryResult.data
                    };
                }

            } catch (recoveryError) {
                this.logger?.warn('Recovery attempt failed', {
                    errorId: errorInfo.id,
                    attempt,
                    recoveryError: recoveryError.message
                });
            }
        }

        return { success: false, reason: 'Max retries exceeded' };
    }

    async executeRecoveryStrategy(errorInfo, strategy, context) {
        switch (errorInfo.category) {
            case this.errorCategories.AI_MODEL:
                return await this.recoverFromAIModelError(errorInfo, strategy, context);
            
            case this.errorCategories.DATABASE:
                return await this.recoverFromDatabaseError(errorInfo, strategy, context);
            
            case this.errorCategories.NETWORK:
                return await this.recoverFromNetworkError(errorInfo, strategy, context);
            
            default:
                return { success: false, reason: 'No specific recovery strategy' };
        }
    }

    async recoverFromAIModelError(errorInfo, strategy, context) {
        // Try fallback models
        if (strategy.fallbackModels && context.modelRetry !== true) {
            return {
                success: true,
                data: {
                    action: 'use_fallback_model',
                    fallbackModels: strategy.fallbackModels
                }
            };
        }
        return { success: false, reason: 'No fallback models available' };
    }

    async recoverFromDatabaseError(errorInfo, strategy, context) {
        // Try to reconnect or use cached data
        if (strategy.fallbackAction === 'return_cached_data') {
            return {
                success: true,
                data: {
                    action: 'use_cached_data',
                    message: 'Using cached data due to database connectivity issues'
                }
            };
        }
        return { success: false, reason: 'Database recovery failed' };
    }

    async recoverFromNetworkError(errorInfo, strategy, context) {
        // Simple retry for network errors
        return {
            success: true,
            data: {
                action: 'retry_request',
                message: 'Retrying network request'
            }
        };
    }

    async logError(errorInfo, context) {
        const logLevel = this.getLogLevel(errorInfo.severity);
        
        this.logger?.[logLevel]('Application error occurred', {
            errorId: errorInfo.id,
            category: errorInfo.category,
            severity: errorInfo.severity,
            message: errorInfo.message,
            recoverable: errorInfo.recoverable,
            context: this.sanitizeContext(context),
            stackTrace: errorInfo.originalError?.stack
        });
    }

    getLogLevel(severity) {
        switch (severity) {
            case this.severityLevels.CRITICAL:
                return 'error';
            case this.severityLevels.HIGH:
                return 'error';
            case this.severityLevels.MEDIUM:
                return 'warn';
            case this.severityLevels.LOW:
                return 'info';
            default:
                return 'warn';
        }
    }

    async notifyCriticalError(errorInfo, context) {
        if (this.notificationService) {
            try {
                await this.notificationService.sendCriticalAlert({
                    errorId: errorInfo.id,
                    category: errorInfo.category,
                    message: errorInfo.message,
                    context: this.sanitizeContext(context),
                    timestamp: errorInfo.timestamp
                });
            } catch (notificationError) {
                this.logger?.error('Failed to send critical error notification', {
                    originalErrorId: errorInfo.id,
                    notificationError: notificationError.message
                });
            }
        }
    }

    createErrorResponse(errorInfo, context) {
        const userMessage = this.getUserFriendlyMessage(errorInfo);
        const response = {
            error: true,
            errorId: errorInfo.id,
            message: userMessage,
            category: errorInfo.category,
            recoverable: errorInfo.recoverable,
            timestamp: errorInfo.timestamp
        };

        // Add debug info in development
        if (this.environment === 'development') {
            response.debug = {
                originalMessage: errorInfo.message,
                stack: errorInfo.originalError?.stack,
                context: this.sanitizeContext(context)
            };
        }

        return response;
    }

    getUserFriendlyMessage(errorInfo) {
        const strategy = this.recoveryStrategies.get(errorInfo.category);
        if (strategy?.userMessage) {
            return strategy.userMessage;
        }

        switch (errorInfo.category) {
            case this.errorCategories.VALIDATION:
                return 'Please check your input and try again.';
            case this.errorCategories.AI_MODEL:
                return 'I\'m having trouble processing your request right now. Please try again in a moment.';
            case this.errorCategories.DATABASE:
                return 'We\'re experiencing some technical difficulties. Please try again later.';
            case this.errorCategories.NETWORK:
                return 'Network connectivity issue. Please check your connection and try again.';
            case this.errorCategories.RATE_LIMIT:
                return 'You\'re sending requests too quickly. Please wait a moment and try again.';
            case this.errorCategories.AUTHENTICATION:
                return 'Authentication failed. Please verify your credentials.';
            default:
                return 'Something went wrong. Please try again later.';
        }
    }

    sanitizeContext(context) {
        const sanitized = { ...context };
        
        // Remove sensitive information
        const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'auth'];
        sensitiveKeys.forEach(key => {
            if (sanitized[key]) {
                sanitized[key] = '[REDACTED]';
            }
        });

        // Truncate large objects
        Object.keys(sanitized).forEach(key => {
            if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
                sanitized[key] = sanitized[key].substring(0, 1000) + '... [truncated]';
            }
        });

        return sanitized;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Express middleware
    middleware() {
        return async (error, req, res, next) => {
            const context = {
                requestId: req.requestId,
                userId: req.body?.from,
                path: req.path,
                method: req.method,
                userAgent: req.get('User-Agent'),
                ip: req.ip
            };

            const errorResponse = await this.handleError(error, context);
            
            const statusCode = this.getStatusCode(errorResponse);
            res.status(statusCode).json(errorResponse);
        };
    }

    getStatusCode(errorResponse) {
        switch (errorResponse.category) {
            case this.errorCategories.VALIDATION:
                return 400;
            case this.errorCategories.AUTHENTICATION:
                return 401;
            case this.errorCategories.RATE_LIMIT:
                return 429;
            case this.errorCategories.DATABASE:
            case this.errorCategories.AI_MODEL:
            case this.errorCategories.SYSTEM:
                return 500;
            case this.errorCategories.NETWORK:
            case this.errorCategories.EXTERNAL_API:
                return 502;
            default:
                return 500;
        }
    }
}

module.exports = ErrorHandler;