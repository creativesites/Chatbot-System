// responseCacheFallback.js - Minimal fallback for ResponseCache
class ResponseCacheFallback {
    constructor() {
        console.log('⚠️ Using ResponseCache fallback implementation');
        this.cache = new Map();
        this.maxCacheSize = 100;
        this.ttl = 300000; // 5 minutes
    }

    async getCachedResponse(userId, query) {
        const key = `${userId}:${query.toLowerCase().trim()}`;
        const cached = this.cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < this.ttl) {
            console.log('📦 Cache hit (fallback)');
            return cached.response;
        }
        
        return null;
    }

    async cacheResponse(userId, query, response) {
        // Don't cache emergency responses or errors
        if (response.emergency || response.error) return;
        
        const key = `${userId}:${query.toLowerCase().trim()}`;
        
        // Simple LRU - remove oldest if at capacity
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            response,
            timestamp: Date.now()
        });
        
        console.log('💾 Response cached (fallback)');
    }

    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache cleared (fallback)');
    }
}

module.exports = ResponseCacheFallback;