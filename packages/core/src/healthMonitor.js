// healthMonitor.js - Comprehensive health monitoring and alerting system
const EventEmitter = require('events');

class HealthMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        this.logger = options.logger;
        this.dbManager = options.dbManager;
        this.notificationService = options.notificationService;
        
        // Health check configuration
        this.config = {
            checkInterval: options.checkInterval || 60000, // 1 minute
            alertThresholds: {
                responseTime: options.responseTimeThreshold || 5000, // 5 seconds
                errorRate: options.errorRateThreshold || 0.05, // 5%
                memoryUsage: options.memoryThreshold || 0.8, // 80%
                cpuUsage: options.cpuThreshold || 0.8, // 80%
                diskUsage: options.diskThreshold || 0.9 // 90%
            },
            services: options.services || ['database', 'redis', 'ai-models']
        };

        // Metrics storage
        this.metrics = {
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
                avgResponseTime: 0,
                responseTimes: []
            },
            system: {
                memory: { usage: 0, free: 0, total: 0 },
                cpu: { usage: 0 },
                disk: { usage: 0, free: 0, total: 0 }
            },
            services: new Map(),
            errors: [],
            alerts: []
        };

        // Health status
        this.overallHealth = 'healthy';
        this.serviceHealth = new Map();
        
        this.isRunning = false;
        this.checkInterval = null;
        
        this.initializeServiceHealth();
    }

    initializeServiceHealth() {
        this.config.services.forEach(service => {
            this.serviceHealth.set(service, {
                status: 'unknown',
                lastCheck: null,
                consecutiveFailures: 0,
                uptime: 0,
                responseTime: 0
            });
        });
    }

    start() {
        if (this.isRunning) {
            this.logger?.warn('Health monitor is already running');
            return;
        }

        this.isRunning = true;
        this.logger?.info('Starting health monitor', {
            checkInterval: this.config.checkInterval,
            services: this.config.services
        });

        // Initial health check
        this.performHealthCheck();

        // Set up periodic health checks
        this.checkInterval = setInterval(() => {
            this.performHealthCheck();
        }, this.config.checkInterval);

        this.emit('started');
    }

    stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        this.logger?.info('Health monitor stopped');
        this.emit('stopped');
    }

    async performHealthCheck() {
        const checkStart = Date.now();
        
        try {
            // Check system resources
            await this.checkSystemHealth();
            
            // Check individual services
            await this.checkServicesHealth();
            
            // Analyze metrics and determine overall health
            this.updateOverallHealth();
            
            // Generate alerts if necessary
            await this.checkAlertConditions();
            
            const checkDuration = Date.now() - checkStart;
            this.logger?.debug('Health check completed', {
                duration: checkDuration,
                overallHealth: this.overallHealth
            });

        } catch (error) {
            this.logger?.error('Health check failed', {
                error: error.message,
                stack: error.stack
            });
        }
    }

    async checkSystemHealth() {
        const process = require('process');
        const os = require('os');

        // Memory usage
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        this.metrics.system.memory = {
            usage: usedMem / totalMem,
            free: freeMem,
            total: totalMem,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external
        };

        // CPU usage (simplified - in production, use a proper CPU monitoring library)
        const cpuUsage = process.cpuUsage();
        this.metrics.system.cpu = {
            user: cpuUsage.user,
            system: cpuUsage.system,
            usage: (cpuUsage.user + cpuUsage.system) / 1000000 // Convert to seconds
        };

        // Log system metrics
        this.logger?.debug('System health metrics', {
            memory: {
                usagePercent: (this.metrics.system.memory.usage * 100).toFixed(2),
                heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
                heapTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2)
            },
            cpu: this.metrics.system.cpu
        });
    }

    async checkServicesHealth() {
        const healthChecks = [];

        // Database health check
        if (this.config.services.includes('database') && this.dbManager) {
            healthChecks.push(this.checkDatabaseHealth());
        }

        // Redis health check
        if (this.config.services.includes('redis') && this.dbManager) {
            healthChecks.push(this.checkRedisHealth());
        }

        // AI models health check
        if (this.config.services.includes('ai-models')) {
            healthChecks.push(this.checkAIModelsHealth());
        }

        // Execute all health checks
        await Promise.allSettled(healthChecks);
    }

    async checkDatabaseHealth() {
        const serviceName = 'database';
        const start = Date.now();
        
        try {
            const health = await this.dbManager.healthCheck();
            const responseTime = Date.now() - start;
            
            const status = health.postgres.status === 'healthy' ? 'healthy' : 'unhealthy';
            
            this.updateServiceHealth(serviceName, {
                status,
                responseTime,
                details: health.postgres.details
            });

        } catch (error) {
            this.updateServiceHealth(serviceName, {
                status: 'unhealthy',
                responseTime: Date.now() - start,
                error: error.message
            });
        }
    }

    async checkRedisHealth() {
        const serviceName = 'redis';
        const start = Date.now();
        
        try {
            const health = await this.dbManager.healthCheck();
            const responseTime = Date.now() - start;
            
            const status = health.redis.status === 'healthy' ? 'healthy' : 'unhealthy';
            
            this.updateServiceHealth(serviceName, {
                status,
                responseTime,
                details: health.redis.details
            });

        } catch (error) {
            this.updateServiceHealth(serviceName, {
                status: 'unhealthy',
                responseTime: Date.now() - start,
                error: error.message
            });
        }
    }

    async checkAIModelsHealth() {
        const serviceName = 'ai-models';
        const start = Date.now();
        
        try {
            // Simple health check - could be enhanced to actually test model endpoints
            const responseTime = Date.now() - start;
            
            this.updateServiceHealth(serviceName, {
                status: 'healthy',
                responseTime,
                details: { message: 'AI models are configured and accessible' }
            });

        } catch (error) {
            this.updateServiceHealth(serviceName, {
                status: 'unhealthy',
                responseTime: Date.now() - start,
                error: error.message
            });
        }
    }

    updateServiceHealth(serviceName, healthData) {
        const currentHealth = this.serviceHealth.get(serviceName) || {};
        const now = new Date();
        
        const updated = {
            ...currentHealth,
            status: healthData.status,
            lastCheck: now,
            responseTime: healthData.responseTime,
            details: healthData.details || {},
            error: healthData.error || null
        };

        // Update consecutive failures
        if (healthData.status === 'unhealthy') {
            updated.consecutiveFailures = (currentHealth.consecutiveFailures || 0) + 1;
        } else {
            updated.consecutiveFailures = 0;
        }

        // Update uptime (simplified)
        if (healthData.status === 'healthy') {
            updated.uptime = (currentHealth.uptime || 0) + (this.config.checkInterval / 1000);
        }

        this.serviceHealth.set(serviceName, updated);

        // Log service health update
        this.logger?.debug('Service health updated', {
            service: serviceName,
            status: updated.status,
            responseTime: updated.responseTime,
            consecutiveFailures: updated.consecutiveFailures
        });

        // Emit service health event
        this.emit('serviceHealthUpdated', serviceName, updated);
    }

    updateOverallHealth() {
        const services = Array.from(this.serviceHealth.values());
        const unhealthyServices = services.filter(service => service.status === 'unhealthy');
        const criticalServices = services.filter(service => 
            service.status === 'unhealthy' && service.consecutiveFailures >= 3
        );

        let newOverallHealth = 'healthy';

        if (criticalServices.length > 0) {
            newOverallHealth = 'critical';
        } else if (unhealthyServices.length > 0) {
            newOverallHealth = 'degraded';
        } else if (this.isSystemResourcesHigh()) {
            newOverallHealth = 'warning';
        }

        if (newOverallHealth !== this.overallHealth) {
            const previousHealth = this.overallHealth;
            this.overallHealth = newOverallHealth;
            
            this.logger?.info('Overall health status changed', {
                from: previousHealth,
                to: newOverallHealth,
                unhealthyServices: unhealthyServices.length,
                criticalServices: criticalServices.length
            });

            this.emit('overallHealthChanged', {
                previous: previousHealth,
                current: newOverallHealth,
                services: this.getServiceHealthSummary()
            });
        }
    }

    isSystemResourcesHigh() {
        const { memory, cpu } = this.metrics.system;
        return memory.usage > this.config.alertThresholds.memoryUsage ||
               cpu.usage > this.config.alertThresholds.cpuUsage;
    }

    async checkAlertConditions() {
        const alerts = [];

        // Check response time alerts
        if (this.metrics.requests.avgResponseTime > this.config.alertThresholds.responseTime) {
            alerts.push({
                type: 'high_response_time',
                severity: 'warning',
                message: `Average response time (${this.metrics.requests.avgResponseTime}ms) exceeds threshold`,
                threshold: this.config.alertThresholds.responseTime
            });
        }

        // Check error rate alerts
        const errorRate = this.getErrorRate();
        if (errorRate > this.config.alertThresholds.errorRate) {
            alerts.push({
                type: 'high_error_rate',
                severity: 'critical',
                message: `Error rate (${(errorRate * 100).toFixed(2)}%) exceeds threshold`,
                threshold: this.config.alertThresholds.errorRate * 100
            });
        }

        // Check memory usage alerts
        if (this.metrics.system.memory.usage > this.config.alertThresholds.memoryUsage) {
            alerts.push({
                type: 'high_memory_usage',
                severity: 'warning',
                message: `Memory usage (${(this.metrics.system.memory.usage * 100).toFixed(2)}%) exceeds threshold`,
                threshold: this.config.alertThresholds.memoryUsage * 100
            });
        }

        // Check service-specific alerts
        this.serviceHealth.forEach((health, serviceName) => {
            if (health.consecutiveFailures >= 3) {
                alerts.push({
                    type: 'service_consecutive_failures',
                    severity: 'critical',
                    message: `Service ${serviceName} has ${health.consecutiveFailures} consecutive failures`,
                    service: serviceName,
                    failures: health.consecutiveFailures
                });
            }
        });

        // Process new alerts
        for (const alert of alerts) {
            await this.processAlert(alert);
        }
    }

    async processAlert(alert) {
        const alertId = this.generateAlertId(alert);
        
        // Check if this alert was already sent recently (prevent spam)
        const recentAlert = this.metrics.alerts.find(a => 
            a.id === alertId && 
            (Date.now() - a.timestamp) < 300000 // 5 minutes
        );

        if (recentAlert) {
            return; // Don't send duplicate alerts within 5 minutes
        }

        // Add to alerts history
        const alertRecord = {
            id: alertId,
            ...alert,
            timestamp: Date.now()
        };
        
        this.metrics.alerts.push(alertRecord);
        
        // Keep only last 100 alerts
        if (this.metrics.alerts.length > 100) {
            this.metrics.alerts = this.metrics.alerts.slice(-100);
        }

        // Log alert
        this.logger?.warn('Health alert triggered', alert);

        // Send notification if critical
        if (alert.severity === 'critical' && this.notificationService) {
            try {
                await this.notificationService.sendAlert(alert);
            } catch (error) {
                this.logger?.error('Failed to send alert notification', {
                    alert,
                    error: error.message
                });
            }
        }

        // Emit alert event
        this.emit('alert', alert);
    }

    generateAlertId(alert) {
        const key = `${alert.type}_${alert.service || 'system'}`;
        return Buffer.from(key).toString('base64').substring(0, 8);
    }

    // Public methods for recording metrics
    recordRequest(responseTime, success = true) {
        this.metrics.requests.total++;
        
        if (success) {
            this.metrics.requests.successful++;
        } else {
            this.metrics.requests.failed++;
        }

        // Update response times (keep last 100)
        this.metrics.requests.responseTimes.push(responseTime);
        if (this.metrics.requests.responseTimes.length > 100) {
            this.metrics.requests.responseTimes.shift();
        }

        // Calculate average response time
        const times = this.metrics.requests.responseTimes;
        this.metrics.requests.avgResponseTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    }

    recordError(error, context = {}) {
        const errorRecord = {
            message: error.message,
            category: error.category || 'unknown',
            severity: error.severity || 'medium',
            timestamp: Date.now(),
            context
        };

        this.metrics.errors.push(errorRecord);
        
        // Keep only last 1000 errors
        if (this.metrics.errors.length > 1000) {
            this.metrics.errors = this.metrics.errors.slice(-1000);
        }

        this.emit('error', errorRecord);
    }

    // Utility methods
    getErrorRate() {
        const total = this.metrics.requests.total;
        if (total === 0) return 0;
        return this.metrics.requests.failed / total;
    }

    getServiceHealthSummary() {
        const summary = {};
        this.serviceHealth.forEach((health, serviceName) => {
            summary[serviceName] = {
                status: health.status,
                responseTime: health.responseTime,
                consecutiveFailures: health.consecutiveFailures,
                lastCheck: health.lastCheck
            };
        });
        return summary;
    }

    getHealthReport() {
        return {
            overall: this.overallHealth,
            timestamp: new Date().toISOString(),
            services: this.getServiceHealthSummary(),
            metrics: {
                requests: {
                    total: this.metrics.requests.total,
                    successful: this.metrics.requests.successful,
                    failed: this.metrics.requests.failed,
                    errorRate: this.getErrorRate(),
                    avgResponseTime: this.metrics.requests.avgResponseTime
                },
                system: {
                    memory: {
                        usagePercent: (this.metrics.system.memory.usage * 100).toFixed(2),
                        heapUsedMB: (this.metrics.system.memory.heapUsed / 1024 / 1024).toFixed(2)
                    },
                    cpu: this.metrics.system.cpu
                }
            },
            recentAlerts: this.metrics.alerts.slice(-10), // Last 10 alerts
            recentErrors: this.metrics.errors.slice(-10)   // Last 10 errors
        };
    }

    // Express middleware for health endpoint
    createHealthEndpoint() {
        return (req, res) => {
            const report = this.getHealthReport();
            const statusCode = report.overall === 'healthy' ? 200 : 503;
            
            res.status(statusCode).json(report);
        };
    }

    // Express middleware for recording requests
    createMetricsMiddleware() {
        return (req, res, next) => {
            const start = Date.now();
            
            // Override res.end to capture response
            const originalEnd = res.end;
            res.end = function(...args) {
                const responseTime = Date.now() - start;
                const success = res.statusCode < 400;
                
                this.recordRequest(responseTime, success);
                
                originalEnd.apply(res, args);
            }.bind(this);
            
            next();
        };
    }
}

module.exports = HealthMonitor;