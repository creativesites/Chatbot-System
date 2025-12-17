// validation.js - Input validation and sanitization
const Joi = require('joi');
const DOMPurify = require('isomorphic-dompurify');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

class Validator {
    constructor(options = {}) {
        this.logger = options.logger;
        this.maxMessageLength = options.maxMessageLength || 5000;
        this.maxImageSize = options.maxImageSize || 10 * 1024 * 1024; // 10MB
        this.allowedImageTypes = options.allowedImageTypes || ['image/jpeg', 'image/png', 'image/webp'];
    }

    // Request validation schemas
    getSchemas() {
        return {
            chatMessage: Joi.object({
                message: Joi.string()
                    .required()
                    .max(this.maxMessageLength)
                    .trim()
                    .custom(this.sanitizeText.bind(this)),
                from: Joi.string()
                    .required()
                    .pattern(/^[a-zA-Z0-9_-]+$/)
                    .max(100),
                groupId: Joi.string()
                    .required()
                    .pattern(/^[a-zA-Z0-9_-]+$/)
                    .max(100),
                eventName: Joi.string()
                    .optional()
                    .valid('WELCOME', 'KOMMUNICATE_MEDIA_EVENT', 'REGULAR')
                    .default('REGULAR'),
                metadata: Joi.object().optional(),
                contentType: Joi.string().optional(),
                source: Joi.string().optional(),
                chatKey: Joi.string().optional()
            }),

            imageMessage: Joi.object({
                message: Joi.string()
                    .optional()
                    .max(1000)
                    .trim()
                    .custom(this.sanitizeText.bind(this)),
                from: Joi.string()
                    .required()
                    .pattern(/^[a-zA-Z0-9_-]+$/)
                    .max(100),
                groupId: Joi.string()
                    .required()
                    .pattern(/^[a-zA-Z0-9_-]+$/)
                    .max(100),
                eventName: Joi.string()
                    .required()
                    .valid('KOMMUNICATE_MEDIA_EVENT'),
                metadata: Joi.object({
                    KM_CHAT_CONTEXT: Joi.object({
                        attachments: Joi.array().items(
                            Joi.object({
                                type: Joi.string().valid(...this.allowedImageTypes),
                                payload: Joi.object({
                                    url: Joi.string().uri().required()
                                }).required()
                            })
                        ).min(1).max(5)
                    }).required()
                }).required()
            }),

            welcomeMessage: Joi.object({
                from: Joi.string()
                    .required()
                    .pattern(/^[a-zA-Z0-9_-]+$/)
                    .max(100),
                eventName: Joi.string()
                    .required()
                    .valid('WELCOME')
            })
        };
    }

    async validateRequest(requestBody) {
        try {
            const { eventName } = requestBody;
            
            // Determine which schema to use
            let schema;
            switch (eventName) {
                case 'WELCOME':
                    schema = this.getSchemas().welcomeMessage;
                    break;
                case 'KOMMUNICATE_MEDIA_EVENT':
                    schema = this.getSchemas().imageMessage;
                    break;
                default:
                    schema = this.getSchemas().chatMessage;
            }

            const { error, value } = schema.validate(requestBody, {
                abortEarly: false,
                stripUnknown: true
            });

            if (error) {
                const errors = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    value: detail.context?.value
                }));

                this.logger?.warn('Request validation failed', {
                    errors,
                    requestBody: this.sanitizeForLogging(requestBody)
                });

                return {
                    isValid: false,
                    errors,
                    sanitizedData: null
                };
            }

            // Additional security checks
            const securityCheck = await this.performSecurityChecks(value);
            if (!securityCheck.passed) {
                return {
                    isValid: false,
                    errors: securityCheck.errors,
                    sanitizedData: null
                };
            }

            return {
                isValid: true,
                errors: [],
                sanitizedData: value
            };

        } catch (error) {
            this.logger?.error('Validation error', {
                error: error.message,
                stack: error.stack
            });

            return {
                isValid: false,
                errors: [{ field: 'general', message: 'Validation failed' }],
                sanitizedData: null
            };
        }
    }

    async performSecurityChecks(data) {
        const errors = [];

        // Check for potential XSS in message
        if (data.message) {
            const originalLength = data.message.length;
            data.message = this.sanitizeHtml(data.message);
            
            if (data.message.length !== originalLength) {
                this.logger?.warn('Potential XSS attempt detected', {
                    originalLength,
                    sanitizedLength: data.message.length,
                    userId: data.from
                });
            }
        }

        // Check for SQL injection patterns
        if (data.message && this.containsSqlInjectionPatterns(data.message)) {
            errors.push({
                field: 'message',
                message: 'Potentially malicious content detected'
            });
        }

        // Check for excessive special characters (potential attack)
        if (data.message && this.hasExcessiveSpecialChars(data.message)) {
            errors.push({
                field: 'message',
                message: 'Message contains excessive special characters'
            });
        }

        // Check image URL if present
        if (data.metadata?.KM_CHAT_CONTEXT?.attachments) {
            for (const attachment of data.metadata.KM_CHAT_CONTEXT.attachments) {
                if (!this.isValidImageUrl(attachment.payload.url)) {
                    errors.push({
                        field: 'metadata.attachments',
                        message: 'Invalid or potentially malicious image URL'
                    });
                }
            }
        }

        return {
            passed: errors.length === 0,
            errors
        };
    }

    // Sanitization methods
    sanitizeText(value, helpers) {
        if (typeof value !== 'string') return value;
        
        // Remove null bytes and control characters
        let sanitized = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        // Normalize unicode
        sanitized = sanitized.normalize('NFKC');
        
        // Trim excessive whitespace
        sanitized = sanitized.replace(/\s+/g, ' ').trim();
        
        return sanitized;
    }

    sanitizeHtml(html) {
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u'],
            ALLOWED_ATTR: [],
            KEEP_CONTENT: true
        });
    }

    // Security check methods
    containsSqlInjectionPatterns(text) {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
            /(UNION\s+SELECT)/i,
            /(OR\s+1\s*=\s*1)/i,
            /(AND\s+1\s*=\s*1)/i,
            /(';\s*(DROP|DELETE|INSERT|UPDATE))/i,
            /(\/\*.*\*\/)/,
            /(--\s*)/
        ];

        return sqlPatterns.some(pattern => pattern.test(text));
    }

    hasExcessiveSpecialChars(text) {
        const specialCharCount = (text.match(/[^a-zA-Z0-9\s.,!?-]/g) || []).length;
        const ratio = specialCharCount / text.length;
        return ratio > 0.3; // More than 30% special characters
    }

    isValidImageUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Check protocol
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                return false;
            }
            
            // Check for suspicious domains or paths
            const suspiciousPatterns = [
                /localhost/i,
                /127\.0\.0\.1/,
                /192\.168\./,
                /10\.\d+\.\d+\.\d+/,
                /file:\/\//,
                /javascript:/i,
                /data:/i,
                /vbscript:/i
            ];
            
            return !suspiciousPatterns.some(pattern => pattern.test(url));
        } catch {
            return false;
        }
    }

    // Rate limiting configuration
    createRateLimit(options = {}) {
        return rateLimit({
            windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
            max: options.max || 100, // limit each IP to 100 requests per windowMs
            message: {
                error: true,
                message: 'Too many requests from this IP, please try again later',
                retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                this.logger?.warn('Rate limit exceeded', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    path: req.path
                });
                res.status(429).json({
                    error: true,
                    message: 'Too many requests, please slow down',
                    retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
                });
            }
        });
    }

    createSlowDown(options = {}) {
        return slowDown({
            windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
            delayAfter: options.delayAfter || 50, // allow 50 requests per windowMs without delay
            delayMs: options.delayMs || 500, // add 500ms delay per request after delayAfter
            maxDelayMs: options.maxDelayMs || 20000, // max delay of 20 seconds
            handler: (req, res, next, delay) => {
                this.logger?.info('Request slowed down', {
                    ip: req.ip,
                    delay,
                    path: req.path
                });
                next();
            }
        });
    }

    // Utility methods
    sanitizeForLogging(obj, maxDepth = 3, currentDepth = 0) {
        if (currentDepth >= maxDepth) return '[Max Depth Reached]';
        
        if (obj === null || obj === undefined) return obj;
        
        if (typeof obj === 'string') {
            // Truncate long strings and remove sensitive information
            let sanitized = obj.substring(0, 200);
            if (obj.length > 200) sanitized += '... [truncated]';
            
            // Remove potential sensitive patterns
            sanitized = sanitized.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[email]');
            sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[card]');
            sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ssn]');
            
            return sanitized;
        }
        
        if (typeof obj === 'object' && !Array.isArray(obj)) {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                // Skip potentially sensitive keys
                if (['password', 'token', 'secret', 'key', 'auth'].some(sensitive => 
                    key.toLowerCase().includes(sensitive))) {
                    sanitized[key] = '[REDACTED]';
                } else {
                    sanitized[key] = this.sanitizeForLogging(value, maxDepth, currentDepth + 1);
                }
            }
            return sanitized;
        }
        
        if (Array.isArray(obj)) {
            return obj.slice(0, 10).map(item => 
                this.sanitizeForLogging(item, maxDepth, currentDepth + 1)
            );
        }
        
        return obj;
    }

    // Content moderation
    async moderateContent(text) {
        // Basic profanity filter (in production, use a service like AWS Comprehend)
        const profanityPatterns = [
            // Add your profanity patterns here
        ];

        const containsProfanity = profanityPatterns.some(pattern => pattern.test(text));
        
        if (containsProfanity) {
            this.logger?.warn('Profanity detected in content', {
                textLength: text.length,
                detected: true
            });
        }

        return {
            isClean: !containsProfanity,
            confidence: containsProfanity ? 0.8 : 0.1,
            categories: containsProfanity ? ['profanity'] : []
        };
    }
}

module.exports = Validator;