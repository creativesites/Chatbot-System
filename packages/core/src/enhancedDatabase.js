// enhancedDatabase.js - Enhanced database connection with pooling and monitoring
const { Pool } = require('pg');
const { createClient } = require('redis');
const NodeCache = require('node-cache');
const config = require('./config');
require('dotenv').config();

class DatabaseManager {
    constructor(options = {}) {
        this.logger = options.logger;
        this.connectionAttempts = 0;
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 5000;
        
        // In-memory cache for frequently accessed data
        this.memoryCache = new NodeCache({
            stdTTL: options.memoryCacheTTL || 300, // 5 minutes default
            checkperiod: 60, // Check for expired keys every minute
            useClones: false
        });

        this.initializeConnections();
        this.setupHealthChecks();
    }

    initializeConnections() {
        // PostgreSQL Connection Pool
        this.pgPool = new Pool({
            ...config.dbConfig,
            // Connection pool settings
            max: process.env.PG_POOL_MAX || 20, // Maximum number of clients
            min: process.env.PG_POOL_MIN || 5,  // Minimum number of clients
            idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
            connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection could not be established
            maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
            
            // Reconnection settings
            application_name: 'myavana-chatbot',
            statement_timeout: 30000, // 30 seconds
            query_timeout: 30000,
            
            // SSL configuration for production
            ssl: process.env.NODE_ENV === 'production' ? {
                rejectUnauthorized: false
            } : false
        });

        // Redis Connection with retry logic
        this.redisClient = createClient({
            ...config.redisConfig,
            socket: {
                connectTimeout: 10000,
                lazyConnect: true,
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        this.logger?.error('Redis max reconnection attempts reached');
                        return false;
                    }
                    return Math.min(retries * 100, 3000);
                }
            },
            // Connection pool settings for Redis
            pool: {
                min: 2,
                max: 10
            }
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // PostgreSQL Pool Events
        this.pgPool.on('connect', (client) => {
            this.logger?.info('New PostgreSQL client connected', {
                totalCount: this.pgPool.totalCount,
                idleCount: this.pgPool.idleCount,
                waitingCount: this.pgPool.waitingCount
            });
        });

        this.pgPool.on('acquire', (client) => {
            this.logger?.debug('PostgreSQL client acquired from pool', {
                totalCount: this.pgPool.totalCount,
                idleCount: this.pgPool.idleCount
            });
        });

        this.pgPool.on('error', (err) => {
            this.logger?.error('PostgreSQL pool error', {
                error: err.message,
                stack: err.stack
            });
        });

        this.pgPool.on('remove', (client) => {
            this.logger?.info('PostgreSQL client removed from pool', {
                totalCount: this.pgPool.totalCount
            });
        });

        // Redis Events
        this.redisClient.on('connect', () => {
            this.logger?.info('Redis client connected');
        });

        this.redisClient.on('ready', () => {
            this.logger?.info('Redis client ready');
        });

        this.redisClient.on('error', (err) => {
            this.logger?.error('Redis client error', {
                error: err.message,
                stack: err.stack
            });
        });

        this.redisClient.on('reconnecting', () => {
            this.logger?.info('Redis client reconnecting');
        });

        this.redisClient.on('end', () => {
            this.logger?.warn('Redis client connection ended');
        });
    }

    async connect() {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                this.logger?.info(`Database connection attempt ${attempt}/${this.maxRetries}`);
                
                // Connect to Redis
                await this.redisClient.connect();
                this.logger?.info('Connected to Redis successfully');
                
                // Test PostgreSQL pool
                const client = await this.pgPool.connect();
                await client.query('SELECT NOW()');
                client.release();
                this.logger?.info('Connected to PostgreSQL successfully');
                
                this.connectionAttempts = attempt;
                return true;
                
            } catch (error) {
                lastError = error;
                this.logger?.error(`Database connection attempt ${attempt} failed`, {
                    error: error.message,
                    attempt,
                    maxRetries: this.maxRetries
                });
                
                if (attempt < this.maxRetries) {
                    this.logger?.info(`Retrying in ${this.retryDelay}ms...`);
                    await this.sleep(this.retryDelay);
                }
            }
        }
        
        this.logger?.error('All database connection attempts failed', {
            error: lastError?.message,
            attempts: this.maxRetries
        });
        
        throw new Error(`Failed to connect to databases after ${this.maxRetries} attempts: ${lastError?.message}`);
    }

    // Enhanced query method with caching and error handling
    async query(text, params = [], options = {}) {
        const queryStart = Date.now();
        const cacheKey = options.cacheKey;
        const cacheTTL = options.cacheTTL || 300; // 5 minutes default
        const useCache = options.useCache !== false && cacheKey;
        
        try {
            // Check cache first
            if (useCache) {
                const cached = this.memoryCache.get(cacheKey);
                if (cached) {
                    this.logger?.debug('Query cache hit', {
                        cacheKey,
                        queryTime: 0
                    });
                    return cached;
                }
            }
            
            // Execute query
            const result = await this.pgPool.query(text, params);
            const queryTime = Date.now() - queryStart;
            
            this.logger?.info('Database query executed', {
                queryTime,
                rowCount: result.rowCount,
                cached: false,
                cacheKey: cacheKey || null
            });
            
            // Cache result if specified
            if (useCache && result.rows) {
                this.memoryCache.set(cacheKey, result, cacheTTL);
            }
            
            return result;
            
        } catch (error) {
            const queryTime = Date.now() - queryStart;
            this.logger?.error('Database query failed', {
                error: error.message,
                queryTime,
                query: text.substring(0, 200),
                paramsCount: params.length
            });
            throw error;
        }
    }

    // Transaction wrapper
    async transaction(callback) {
        const client = await this.pgPool.connect();
        const transactionStart = Date.now();
        
        try {
            await client.query('BEGIN');
            this.logger?.debug('Transaction started');
            
            const result = await callback(client);
            
            await client.query('COMMIT');
            const transactionTime = Date.now() - transactionStart;
            
            this.logger?.info('Transaction completed successfully', {
                transactionTime
            });
            
            return result;
            
        } catch (error) {
            await client.query('ROLLBACK');
            const transactionTime = Date.now() - transactionStart;
            
            this.logger?.error('Transaction rolled back', {
                error: error.message,
                transactionTime
            });
            
            throw error;
        } finally {
            client.release();
        }
    }

    // Redis operations with error handling
    async redisGet(key, options = {}) {
        const start = Date.now();
        try {
            const result = await this.redisClient.get(key);
            const duration = Date.now() - start;
            
            this.logger?.debug('Redis GET operation', {
                key: this.sanitizeKey(key),
                hit: result !== null,
                duration
            });
            
            return result ? JSON.parse(result) : null;
        } catch (error) {
            this.logger?.error('Redis GET failed', {
                key: this.sanitizeKey(key),
                error: error.message
            });
            if (options.fallback) {
                return options.fallback;
            }
            throw error;
        }
    }

    async redisSet(key, value, ttl = 3600) {
        const start = Date.now();
        try {
            const serialized = JSON.stringify(value);
            const result = await this.redisClient.setEx(key, ttl, serialized);
            const duration = Date.now() - start;
            
            this.logger?.debug('Redis SET operation', {
                key: this.sanitizeKey(key),
                ttl,
                size: serialized.length,
                duration
            });
            
            return result;
        } catch (error) {
            this.logger?.error('Redis SET failed', {
                key: this.sanitizeKey(key),
                error: error.message
            });
            throw error;
        }
    }

    async redisDel(key) {
        const start = Date.now();
        try {
            const result = await this.redisClient.del(key);
            const duration = Date.now() - start;
            
            this.logger?.debug('Redis DEL operation', {
                key: this.sanitizeKey(key),
                deleted: result,
                duration
            });
            
            return result;
        } catch (error) {
            this.logger?.error('Redis DEL failed', {
                key: this.sanitizeKey(key),
                error: error.message
            });
            throw error;
        }
    }

    // Batch operations
    async batchQuery(queries) {
        const start = Date.now();
        const client = await this.pgPool.connect();
        
        try {
            const results = [];
            
            for (const query of queries) {
                const result = await client.query(query.text, query.params);
                results.push(result);
            }
            
            const duration = Date.now() - start;
            this.logger?.info('Batch query completed', {
                queryCount: queries.length,
                duration
            });
            
            return results;
            
        } catch (error) {
            this.logger?.error('Batch query failed', {
                error: error.message,
                queryCount: queries.length
            });
            throw error;
        } finally {
            client.release();
        }
    }

    // Health check
    async healthCheck() {
        const health = {
            postgres: { status: 'unknown', details: {} },
            redis: { status: 'unknown', details: {} },
            cache: { status: 'unknown', details: {} }
        };

        // PostgreSQL health check
        try {
            const start = Date.now();
            const result = await this.pgPool.query('SELECT NOW() as server_time, version() as version');
            const responseTime = Date.now() - start;
            
            health.postgres = {
                status: 'healthy',
                details: {
                    responseTime,
                    serverTime: result.rows[0].server_time,
                    version: result.rows[0].version.split(' ')[0],
                    poolStats: {
                        totalCount: this.pgPool.totalCount,
                        idleCount: this.pgPool.idleCount,
                        waitingCount: this.pgPool.waitingCount
                    }
                }
            };
        } catch (error) {
            health.postgres = {
                status: 'unhealthy',
                details: { error: error.message }
            };
        }

        // Redis health check
        try {
            const start = Date.now();
            await this.redisClient.ping();
            const responseTime = Date.now() - start;
            
            health.redis = {
                status: 'healthy',
                details: {
                    responseTime,
                    connected: this.redisClient.isReady
                }
            };
        } catch (error) {
            health.redis = {
                status: 'unhealthy',
                details: { error: error.message }
            };
        }

        // Memory cache health check
        health.cache = {
            status: 'healthy',
            details: {
                keys: this.memoryCache.keys().length,
                stats: this.memoryCache.getStats()
            }
        };

        return health;
    }

    setupHealthChecks() {
        // Periodic health check
        setInterval(async () => {
            try {
                const health = await this.healthCheck();
                const unhealthyServices = Object.entries(health)
                    .filter(([_, service]) => service.status !== 'healthy')
                    .map(([name, _]) => name);
                
                if (unhealthyServices.length > 0) {
                    this.logger?.warn('Health check found unhealthy services', {
                        unhealthyServices,
                        health
                    });
                }
            } catch (error) {
                this.logger?.error('Health check failed', {
                    error: error.message
                });
            }
        }, 60000); // Every minute
    }

    // Cleanup methods
    async close() {
        this.logger?.info('Closing database connections...');
        
        try {
            await this.pgPool.end();
            this.logger?.info('PostgreSQL pool closed');
        } catch (error) {
            this.logger?.error('Error closing PostgreSQL pool', {
                error: error.message
            });
        }
        
        try {
            await this.redisClient.quit();
            this.logger?.info('Redis connection closed');
        } catch (error) {
            this.logger?.error('Error closing Redis connection', {
                error: error.message
            });
        }
        
        this.memoryCache.close();
        this.logger?.info('Memory cache cleared');
    }

    // Utility methods
    sanitizeKey(key) {
        if (typeof key !== 'string') return key;
        return key.replace(/user:\d+/g, 'user:***').substring(0, 50);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStats() {
        return {
            postgres: {
                totalCount: this.pgPool.totalCount,
                idleCount: this.pgPool.idleCount,
                waitingCount: this.pgPool.waitingCount
            },
            redis: {
                connected: this.redisClient.isReady
            },
            cache: {
                keys: this.memoryCache.keys().length,
                stats: this.memoryCache.getStats()
            }
        };
    }
}

// Export singleton instance
let dbManager = null;

function createDatabaseManager(options = {}) {
    if (!dbManager) {
        dbManager = new DatabaseManager(options);
    }
    return dbManager;
}

function getDatabaseManager() {
    if (!dbManager) {
        throw new Error('Database manager not initialized. Call createDatabaseManager first.');
    }
    return dbManager;
}

// Legacy compatibility
async function connectDatabases() {
    const manager = createDatabaseManager();
    await manager.connect();
    return manager;
}

module.exports = {
    DatabaseManager,
    createDatabaseManager,
    getDatabaseManager,
    connectDatabases,
    // Legacy exports for backward compatibility
    get pgClient() { return getDatabaseManager().pgPool; },
    get redisClient() { return getDatabaseManager().redisClient; }
};