// responseCache.js - Intelligent response caching system
const { redisClient, pgClient } = require('./database');
const crypto = require('crypto');

class ResponseCache {
    constructor() {
        // Cache TTLs for different types of responses
        this.cacheTTL = {
            'faq_response': 3600 * 24, // 24 hours for FAQ responses
            'product_recommendation': 3600 * 12, // 12 hours for product recommendations
            'general_response': 3600 * 2, // 2 hours for general responses
            'user_specific': 1800, // 30 minutes for user-specific responses
            'image_analysis': 3600 * 6 // 6 hours for image analysis
        };
    }

    /**
     * Generate cache key from query and context
     */
    generateCacheKey(userQuery, contextData, responseType = 'general_response') {
        // Create a hash of the query + relevant context
        const normalizedQuery = userQuery.toLowerCase().trim();
        
        // For FAQ responses, we can be more aggressive with caching
        if (responseType === 'faq_response') {
            return `cache:faq:${crypto.createHash('md5').update(normalizedQuery).digest('hex')}`;
        }
        
        // For product recommendations, include user's hair profile if available
        if (responseType === 'product_recommendation' && contextData.userProfile) {
            const profileKey = JSON.stringify({
                hair_type: contextData.userProfile.hair_type,
                hair_texture: contextData.userProfile.hair_texture,
                hair_concerns: contextData.userProfile.hair_concerns
            });
            return `cache:product:${crypto.createHash('md5').update(normalizedQuery + profileKey).digest('hex')}`;
        }

        // For user-specific responses, include user ID
        if (responseType === 'user_specific' && contextData.userId) {
            return `cache:user:${contextData.userId}:${crypto.createHash('md5').update(normalizedQuery).digest('hex')}`;
        }

        // General cache key
        return `cache:general:${crypto.createHash('md5').update(normalizedQuery).digest('hex')}`;
    }

    /**
     * Check if query is cacheable based on content and context
     */
    isCacheable(userQuery, contextData) {
        const query = userQuery.toLowerCase();
        
        // Don't cache highly personal queries
        const personalIndicators = ['my name is', 'i am', 'my hair', 'my problem', 'help me'];
        if (personalIndicators.some(indicator => query.includes(indicator))) {
            return false;
        }

        // Don't cache time-sensitive queries
        const timeSensitiveKeywords = ['today', 'now', 'current', 'appointment', 'book', 'schedule'];
        if (timeSensitiveKeywords.some(keyword => query.includes(keyword))) {
            return false;
        }

        // Cache FAQ-style questions
        const faqIndicators = ['what is', 'how do', 'can you', 'tell me about', 'explain'];
        if (faqIndicators.some(indicator => query.includes(indicator))) {
            return true;
        }

        return true; // Default to cacheable
    }

    /**
     * Determine response type for appropriate caching strategy
     */
    determineResponseType(userQuery, contextAnalysis) {
        const query = userQuery.toLowerCase();

        // FAQ-style questions
        if (query.includes('what is') || query.includes('tell me about') || query.includes('explain')) {
            return 'faq_response';
        }

        // Product-related queries
        if (query.includes('product') || query.includes('recommend') || query.includes('best for')) {
            return 'product_recommendation';
        }

        // Image analysis
        if (contextAnalysis && contextAnalysis.queryType === 'image_followup') {
            return 'image_analysis';
        }

        // User-specific queries
        if (query.includes('my ') || query.includes('i have') || query.includes('help me')) {
            return 'user_specific';
        }

        return 'general_response';
    }

    /**
     * Get cached response if available
     */
    async getCachedResponse(userQuery, contextData, contextAnalysis = null) {
        try {
            if (!this.isCacheable(userQuery, contextData)) {
                return null;
            }

            const responseType = this.determineResponseType(userQuery, contextAnalysis);
            const cacheKey = this.generateCacheKey(userQuery, contextData, responseType);
            
            const cachedData = await redisClient.get(cacheKey);
            
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                
                // Log cache hit
                await this.logCacheMetrics('hit', responseType, cacheKey);
                
                console.log(`Cache HIT for query type: ${responseType}`);
                return {
                    response: parsed.response,
                    metadata: {
                        cached: true,
                        cacheKey,
                        responseType,
                        cachedAt: parsed.timestamp
                    }
                };
            }

            // Log cache miss
            await this.logCacheMetrics('miss', responseType, cacheKey);
            console.log(`Cache MISS for query type: ${responseType}`);
            
            return null;

        } catch (error) {
            console.error('Error checking cache:', error);
            return null;
        }
    }

    /**
     * Cache a response
     */
    async cacheResponse(userQuery, response, contextData, contextAnalysis = null, metadata = {}) {
        try {
            if (!this.isCacheable(userQuery, contextData)) {
                return false;
            }

            const responseType = this.determineResponseType(userQuery, contextAnalysis);
            const cacheKey = this.generateCacheKey(userQuery, contextData, responseType);
            const ttl = this.cacheTTL[responseType] || this.cacheTTL.general_response;

            const cacheData = {
                response,
                timestamp: new Date().toISOString(),
                metadata: {
                    ...metadata,
                    responseType,
                    originalQuery: userQuery
                }
            };

            await redisClient.set(cacheKey, JSON.stringify(cacheData), { EX: ttl });
            
            console.log(`Cached response for type: ${responseType}, TTL: ${ttl}s`);
            return true;

        } catch (error) {
            console.error('Error caching response:', error);
            return false;
        }
    }

    /**
     * Cache similar query responses (for FAQ-style responses)
     */
    async cacheSimilarQueries(baseQuery, response, similarQueries = []) {
        try {
            const responseType = 'faq_response';
            const ttl = this.cacheTTL[responseType];

            // Cache the base query
            const baseCacheKey = this.generateCacheKey(baseQuery, {}, responseType);
            const cacheData = {
                response,
                timestamp: new Date().toISOString(),
                metadata: {
                    responseType,
                    originalQuery: baseQuery,
                    cached_with_similar: true
                }
            };

            await redisClient.set(baseCacheKey, JSON.stringify(cacheData), { EX: ttl });

            // Cache similar variations
            for (const similarQuery of similarQueries) {
                const similarCacheKey = this.generateCacheKey(similarQuery, {}, responseType);
                await redisClient.set(similarCacheKey, JSON.stringify({
                    ...cacheData,
                    metadata: {
                        ...cacheData.metadata,
                        originalQuery: baseQuery,
                        queriedAs: similarQuery
                    }
                }), { EX: ttl });
            }

            console.log(`Cached ${similarQueries.length + 1} query variations for FAQ response`);
            return true;

        } catch (error) {
            console.error('Error caching similar queries:', error);
            return false;
        }
    }

    /**
     * Invalidate cache for specific patterns
     */
    async invalidateCache(pattern) {
        try {
            const keys = await redisClient.keys(`cache:*${pattern}*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
                console.log(`Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
            }
            return keys.length;
        } catch (error) {
            console.error('Error invalidating cache:', error);
            return 0;
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats() {
        try {
            const keys = await redisClient.keys('cache:*');
            const stats = {
                totalCacheEntries: keys.length,
                cacheTypes: {},
                oldestEntry: null,
                newestEntry: null
            };

            // Sample a few entries to get type distribution
            const sampleKeys = keys.slice(0, Math.min(100, keys.length));
            for (const key of sampleKeys) {
                const type = key.split(':')[1] || 'unknown';
                stats.cacheTypes[type] = (stats.cacheTypes[type] || 0) + 1;
            }

            return stats;
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return null;
        }
    }

    /**
     * Log cache metrics for analytics
     */
    async logCacheMetrics(result, cacheType, cacheKey) {
        try {
            // Extract pattern from cache key for grouping
            const keyParts = cacheKey.split(':');
            const pattern = keyParts.slice(0, -1).join(':'); // Remove the hash part

            const query = `
                INSERT INTO cache_analytics (cache_type, hit_count, miss_count, cache_key_pattern, date_tracked)
                VALUES ($1, $2, $3, $4, CURRENT_DATE)
                ON CONFLICT (cache_type, cache_key_pattern, date_tracked)
                DO UPDATE SET 
                    hit_count = cache_analytics.hit_count + $2,
                    miss_count = cache_analytics.miss_count + $3
            `;

            const hitCount = result === 'hit' ? 1 : 0;
            const missCount = result === 'miss' ? 1 : 0;

            await pgClient.query(query, [cacheType, hitCount, missCount, pattern]);

        } catch (error) {
            console.error('Error logging cache metrics:', error);
            // Don't throw - this shouldn't break the conversation
        }
    }

    /**
     * Warm up cache with common queries
     */
    async warmUpCache(commonQueries) {
        console.log('Starting cache warm-up...');
        let warmedCount = 0;

        for (const queryData of commonQueries) {
            try {
                // This would typically involve running the query through your AI system
                // For now, we'll just mark the cache keys as needing warming
                const cacheKey = this.generateCacheKey(queryData.query, {}, queryData.type || 'general_response');
                
                // Mark for warming (you'd implement the actual AI call here)
                await redisClient.set(`warm:${cacheKey}`, JSON.stringify(queryData), { EX: 300 }); // 5 min TTL
                warmedCount++;

            } catch (error) {
                console.error(`Error warming cache for query: ${queryData.query}`, error);
            }
        }

        console.log(`Cache warm-up completed. Marked ${warmedCount} queries for warming.`);
        return warmedCount;
    }
}

module.exports = ResponseCache;