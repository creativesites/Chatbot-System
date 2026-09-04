// cacheManager.js - PRODUCTION VERSION WITH MULTI-LAYER FALLBACK

const ai = require('./ai');
const { pgClient, redisClient } = require('./database');
const config = require('./config');

class CacheManager {
    constructor() {
        this.CACHE_TTL_HOURS = 24;
        this.CACHE_TTL_SECONDS = this.CACHE_TTL_HOURS * 60 * 60;
        this.CACHE_REFRESH_THRESHOLD_HOURS = 1;
        
        // In-memory fallback (last resort)
        this.memoryCache = new Map();
        
        console.log('🔧 Cache Manager initialized with multi-layer storage');
    }

    /**
     * Fast check for a valid Gemini cache across all storage layers (PG → Redis → memory).
     * Call this before constructPrompt() — if hasValidCache is true, skip prompt construction.
     *
     * @param {string} userId
     * @returns {Promise<{hasValidCache, cacheName, needsRefresh, reason, source}>}
     */
    async checkCacheValidity(userId) {
        console.log('🔍 Quick cache check for user:', userId);
        const checkStart = performance.now();
        
        try {
            // Try all layers in order of preference
            let existingCache = null;
            let source = 'none';
            
            // Layer 1: PostgreSQL (preferred)
            existingCache = await this.getUserCache(userId);
            if (existingCache) {
                source = 'postgresql';
            }
            
            // Layer 2: Redis (if PostgreSQL failed)
            if (!existingCache && redisClient) {
                existingCache = await this.getUserCacheFromRedis(userId);
                if (existingCache) source = 'redis';
            }
            
            // Layer 3: Memory (if both failed)
            if (!existingCache) {
                existingCache = this.getUserCacheFromMemory(userId);
                if (existingCache) source = 'memory';
            }
            
            if (!existingCache) {
                console.log('📭 No cache exists (checked:', (performance.now() - checkStart).toFixed(0), 'ms)');
                return {
                    hasValidCache: false,
                    cacheName: null,
                    needsRefresh: false,
                    reason: 'no_cache',
                    source: 'none'
                };
            }
            
            if (this.isCacheExpired(existingCache)) {
                console.log('⏰ Cache expired (from:', source, ')');
                return {
                    hasValidCache: false,
                    cacheName: null,
                    needsRefresh: true,
                    reason: 'expired',
                    source: source
                };
            }
            
            const remainingHours = this.getCacheRemainingHours(existingCache);
            const needsRefresh = remainingHours < this.CACHE_REFRESH_THRESHOLD_HOURS;
            
            console.log('✅ Valid cache found:', {
                source: source,
                cacheName: existingCache.cache_name,
                remainingHours: remainingHours,
                needsRefresh: needsRefresh,
                checkTime: (performance.now() - checkStart).toFixed(0) + 'ms'
            });
            
            return {
                hasValidCache: true,
                cacheName: existingCache.cache_name,
                needsRefresh: needsRefresh,
                remainingHours: remainingHours,
                reason: 'valid',
                source: source
            };
            
        } catch (error) {
            console.error('❌ Cache check failed:', error.message);
            return {
                hasValidCache: false,
                cacheName: null,
                needsRefresh: false,
                reason: 'error',
                source: 'none'
            };
        }
    }

    /**
     * Returns the existing valid Gemini cache name for this user, or creates a new one
     * from the provided system prompt string. Saves to all available storage layers.
     *
     * @param {string} userId
     * @param {string} systemPrompt - Full system instruction text to cache
     * @returns {Promise<{cacheName: string|null, isNewCache: boolean, error?: string}>}
     *   cacheName is null if cache creation failed — caller should fall back to sending full prompt
     */
    async getOrCreateCache(userId, systemPrompt) {
        console.log('🔍 ===== CACHE MANAGER: GET OR CREATE =====');
        console.log('📊 Cache Request:', {
            userId: userId,
            systemPromptLength: systemPrompt.length,
            estimatedTokens: Math.ceil(systemPrompt.length / 4),
            timestamp: new Date().toISOString()
        });

        try {
            // Quick check across all layers
            const existingCache = await this.getUserCacheFromAnyLayer(userId);
            
            if (existingCache && !this.isCacheExpired(existingCache)) {
                console.log('✅ Using existing cache:', existingCache.cache_name);
                return {
                    cacheName: existingCache.cache_name,
                    isNewCache: false
                };
            }

            // Create new cache
            console.log('🆕 Creating new Gemini cache...');
            const cacheStartTime = performance.now();
            const modelName = "gemini-3.7-flash";
            
            const cache = await ai.client.caches.create({
                model: modelName,
                config: {
                    systemInstruction: systemPrompt,
                },
                ttlSeconds: this.CACHE_TTL_SECONDS
            });

            const cacheCreationTime = performance.now() - cacheStartTime;
            console.log('✅ Gemini cache created:', {
                cacheName: cache.name,
                creationTime: cacheCreationTime.toFixed(2) + 'ms',
                ttlHours: this.CACHE_TTL_HOURS,
                expiresAt: new Date(Date.now() + this.CACHE_TTL_SECONDS * 1000).toISOString()
            });

            // Save to all available storage layers
            const saveStart = performance.now();
            await this.saveUserCacheMultiLayer(userId, cache.name);
            console.log('💾 Multi-layer save completed:', (performance.now() - saveStart).toFixed(0), 'ms');
            
            console.log('🔍 ===== CACHE MANAGER: COMPLETE =====');

            return {
                cacheName: cache.name,
                isNewCache: true
            };

        } catch (error) {
            console.error('❌ Cache creation/retrieval failed:', {
                error: error.message,
                userId: userId,
                timestamp: new Date().toISOString()
            });
            
            return {
                cacheName: null,
                isNewCache: false,
                error: error.message
            };
        }
    }

    /**
     * Try to get cache from any available layer
     */
    async getUserCacheFromAnyLayer(userId) {
        // Try PostgreSQL
        let cache = await this.getUserCache(userId);
        if (cache) return cache;
        
        // Try Redis
        if (redisClient) {
            cache = await this.getUserCacheFromRedis(userId);
            if (cache) return cache;
        }
        
        // Try Memory
        return this.getUserCacheFromMemory(userId);
    }

    /**
     * Save cache to all available layers (don't fail if one fails)
     */
    async saveUserCacheMultiLayer(userId, cacheName) {
        const expiresAt = new Date(Date.now() + this.CACHE_TTL_SECONDS * 1000);
        const cacheData = {
            cache_name: cacheName,
            created_at: new Date(),
            expires_at: expiresAt
        };
        
        const results = {
            postgresql: false,
            redis: false,
            memory: false
        };
        
        // Layer 1: PostgreSQL (primary)
        try {
            await this.saveUserCacheToPostgres(userId, cacheName, expiresAt);
            results.postgresql = true;
        } catch (error) {
            console.error('❌ PostgreSQL save failed:', error.message);
        }
        
        // Layer 2: Redis (fast fallback)
        if (redisClient) {
            try {
                await this.saveUserCacheToRedis(userId, cacheData);
                results.redis = true;
            } catch (error) {
                console.error('❌ Redis save failed:', error.message);
            }
        }
        
        // Layer 3: Memory (always succeeds)
        try {
            this.saveUserCacheToMemory(userId, cacheData);
            results.memory = true;
        } catch (error) {
            console.error('❌ Memory save failed:', error.message);
        }
        
        console.log('💾 Multi-layer save results:', results);
        
        // At least one layer must succeed
        if (!results.postgresql && !results.redis && !results.memory) {
            throw new Error('All cache storage layers failed');
        }
    }

    /**
     * Save to PostgreSQL with automatic fallback to DELETE+INSERT
     */
    async saveUserCacheToPostgres(userId, cacheName, expiresAt) {
        console.log('💾 Saving to PostgreSQL...');
        
        try {
            // First try UPSERT (requires PRIMARY KEY or UNIQUE constraint)
            try {
                const query = `
                    INSERT INTO user_gemini_caches (user_id, cache_name, created_at, expires_at) 
                    VALUES ($1, $2, NOW(), $3)
                    ON CONFLICT (user_id) 
                    DO UPDATE SET 
                        cache_name = EXCLUDED.cache_name,
                        created_at = NOW(),
                        expires_at = EXCLUDED.expires_at
                `;
                
                await pgClient.query(query, [userId, cacheName, expiresAt]);
                console.log('✅ PostgreSQL save successful (UPSERT)');
                return true;
                
            } catch (upsertError) {
                // If UPSERT fails (error code 42P10 = no constraint), use DELETE + INSERT
                if (upsertError.code === '42P10') {
                    console.log('⚠️ No constraint found, using DELETE+INSERT fallback');
                    
                    // Delete old record
                    await pgClient.query(
                        `DELETE FROM user_gemini_caches WHERE user_id = $1`,
                        [userId]
                    );
                    
                    // Insert new record
                    await pgClient.query(
                        `INSERT INTO user_gemini_caches (user_id, cache_name, created_at, expires_at) 
                         VALUES ($1, $2, NOW(), $3)`,
                        [userId, cacheName, expiresAt]
                    );
                    
                    console.log('✅ PostgreSQL save successful (DELETE+INSERT)');
                    return true;
                } else {
                    throw upsertError; // Re-throw if it's a different error
                }
            }
            
        } catch (error) {
            console.error('❌ PostgreSQL save completely failed:', error.message);
            throw error;
        }
    }

    /**
     * Save to Redis
     */
    async saveUserCacheToRedis(userId, cacheData) {
        console.log('💾 Saving to Redis...');
        
        try {
            const key = `gemini_cache:${userId}`;
            await redisClient.set(
                key,
                JSON.stringify(cacheData),
                { EX: this.CACHE_TTL_SECONDS }
            );
            console.log('✅ Redis save successful');
            return true;
        } catch (error) {
            console.error('❌ Redis save failed:', error.message);
            throw error;
        }
    }

    /**
     * Save to Memory (always succeeds)
     */
    saveUserCacheToMemory(userId, cacheData) {
        console.log('💾 Saving to memory...');
        this.memoryCache.set(userId, cacheData);
        console.log('✅ Memory save successful');
        
        // Auto-cleanup after TTL
        setTimeout(() => {
            if (this.memoryCache.has(userId)) {
                this.memoryCache.delete(userId);
                console.log('🧹 Auto-removed expired cache from memory:', userId);
            }
        }, this.CACHE_TTL_SECONDS * 1000);
        
        return true;
    }

    /**
     * Get from PostgreSQL
     */
    async getUserCache(userId) {
        try {
            const query = `
                SELECT cache_name, created_at, expires_at 
                FROM user_gemini_caches 
                WHERE user_id = $1 
                ORDER BY created_at DESC 
                LIMIT 1
            `;
            
            const result = await pgClient.query(query, [userId]);
            
            if (result && result.rows && result.rows.length > 0) {
                return result.rows[0];
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ PostgreSQL fetch failed:', error.message);
            return null;
        }
    }

    /**
     * Get from Redis
     */
    async getUserCacheFromRedis(userId) {
        if (!redisClient) return null;
        
        try {
            const key = `gemini_cache:${userId}`;
            const data = await redisClient.get(key);
            
            if (data) {
                return JSON.parse(data);
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Redis fetch failed:', error.message);
            return null;
        }
    }

    /**
     * Get from Memory
     */
    getUserCacheFromMemory(userId) {
        return this.memoryCache.get(userId) || null;
    }

    /**
     * Check if cache is expired
     */
    isCacheExpired(cacheRecord) {
        const now = new Date();
        const expiresAt = new Date(cacheRecord.expires_at);
        return now >= expiresAt;
    }

    /**
     * Get cache age in hours
     */
    getCacheAgeHours(cacheRecord) {
        const now = new Date();
        const createdAt = new Date(cacheRecord.created_at);
        const ageMs = now - createdAt;
        return parseFloat((ageMs / (1000 * 60 * 60)).toFixed(2));
    }

    /**
     * Get remaining cache lifetime in hours
     */
    getCacheRemainingHours(cacheRecord) {
        const now = new Date();
        const expiresAt = new Date(cacheRecord.expires_at);
        const remainingMs = expiresAt - now;
        return Math.max(0, parseFloat((remainingMs / (1000 * 60 * 60)).toFixed(2)));
    }

    /**
     * Clean up expired caches from all layers
     */
    async cleanupExpiredCaches() {
        console.log('🧹 Cleaning up expired caches from all layers...');
        
        const results = {
            postgresql: 0,
            redis: 0,
            memory: 0
        };
        
        // PostgreSQL cleanup
        try {
            const query = `DELETE FROM user_gemini_caches WHERE expires_at < NOW()`;
            const result = await pgClient.query(query);
            results.postgresql = result.rowCount || 0;
        } catch (error) {
            console.error('❌ PostgreSQL cleanup failed:', error.message);
        }
        
        // Redis cleanup (would need to scan all keys - expensive, skip for now)
        // Redis auto-expires with TTL, so not critical
        
        // Memory cleanup
        for (const [userId, cacheData] of this.memoryCache.entries()) {
            if (this.isCacheExpired(cacheData)) {
                this.memoryCache.delete(userId);
                results.memory++;
            }
        }
        
        console.log('✅ Cleanup results:', results);
        return results;
    }

    /**
     * Get cache statistics
     */
    async getCacheStats() {
        const stats = {
            memory_caches: this.memoryCache.size,
            postgresql: null,
            redis: null
        };
        
        // PostgreSQL stats
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_caches,
                    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_caches,
                    COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_caches,
                    AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600) as avg_age_hours
                FROM user_gemini_caches
            `;
            
            const result = await pgClient.query(query);
            stats.postgresql = result.rows[0];
        } catch (error) {
            console.error('❌ PostgreSQL stats failed:', error.message);
        }
        
        // Redis stats (would need dbsize command)
        if (redisClient) {
            try {
                const keys = await redisClient.keys('gemini_cache:*');
                stats.redis = { total_keys: keys.length };
            } catch (error) {
                console.error('❌ Redis stats failed:', error.message);
            }
        }
        
        return stats;
    }
}

module.exports = new CacheManager();