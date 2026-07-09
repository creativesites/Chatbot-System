// cacheMaintenanceScript.js
// Run this script daily via cron to cleanup expired caches and monitor cache health

const cacheManager = require('./cacheManager');
const { pgClient, redisClient } = require('./database');

/**
 * Comprehensive cache maintenance and monitoring script
 */
async function runMaintenance() {
    console.log('🧹 ===== CACHE MAINTENANCE SCRIPT START =====');
    console.log('📅 Timestamp:', new Date().toISOString());
    
    try {
        
        if (!pgClient) {
            throw new Error('Database connection not available');
        }
        
        console.log('✅ Database connection established');
        
        // Step 1: Get cache statistics BEFORE cleanup
        console.log('\n📊 ===== PRE-CLEANUP STATISTICS =====');
        const preStats = await cacheManager.getCacheStats();
        
        if (preStats) {
            console.log('Cache Statistics:', {
                totalCaches: preStats.total_caches,
                activeCaches: preStats.active_caches,
                expiredCaches: preStats.expired_caches,
                avgAgeHours: parseFloat(preStats.avg_age_hours).toFixed(2),
                hitRate: preStats.active_caches > 0 
                    ? ((preStats.active_caches / preStats.total_caches) * 100).toFixed(2) + '%'
                    : 'N/A'
            });
        } else {
            console.log('⚠️ Could not retrieve cache statistics');
        }
        
        // Step 2: Cleanup expired caches
        console.log('\n🧹 ===== CLEANING UP EXPIRED CACHES =====');
        const cleanupStartTime = Date.now();
        await cacheManager.cleanupExpiredCaches();
        const cleanupTime = Date.now() - cleanupStartTime;
        console.log(`✅ Cleanup completed in ${cleanupTime}ms`);
        
        // Step 3: Get cache statistics AFTER cleanup
        console.log('\n📊 ===== POST-CLEANUP STATISTICS =====');
        const postStats = await cacheManager.getCacheStats();
        
        if (postStats) {
            console.log('Updated Cache Statistics:', {
                totalCaches: postStats.total_caches,
                activeCaches: postStats.active_caches,
                expiredCaches: postStats.expired_caches,
                avgAgeHours: parseFloat(postStats.avg_age_hours).toFixed(2),
                hitRate: postStats.active_caches > 0 
                    ? ((postStats.active_caches / postStats.total_caches) * 100).toFixed(2) + '%'
                    : 'N/A'
            });
            
            // Calculate cleanup impact
            if (preStats) {
                const recordsRemoved = preStats.total_caches - postStats.total_caches;
                console.log('\n📈 Cleanup Impact:', {
                    recordsRemoved: recordsRemoved,
                    percentageRemoved: preStats.total_caches > 0 
                        ? ((recordsRemoved / preStats.total_caches) * 100).toFixed(2) + '%'
                        : '0%'
                });
            }
        }
        
        // Step 4: Get cache age distribution
        console.log('\n📊 ===== CACHE AGE DISTRIBUTION =====');
        const ageDistribution = await getCacheAgeDistribution();
        if (ageDistribution) {
            console.log('Age Distribution:', ageDistribution);
        }
        
        // Step 5: Identify users with stale or missing caches
        console.log('\n🔍 ===== CACHE HEALTH CHECK =====');
        const healthCheck = await performCacheHealthCheck();
        if (healthCheck) {
            console.log('Health Check Results:', healthCheck);
        }
        
        // Step 6: Generate recommendations
        console.log('\n💡 ===== RECOMMENDATIONS =====');
        generateRecommendations(preStats, postStats);
        
        console.log('\n✅ ===== CACHE MAINTENANCE COMPLETE =====');
        console.log('📅 Completed at:', new Date().toISOString());
        
        // Close database connection if needed
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ ===== MAINTENANCE SCRIPT FAILED =====');
        console.error('Error:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        process.exit(1);
    }
}

/**
 * Get cache age distribution
 */
async function getCacheAgeDistribution() {
    try {
        const query = `
            SELECT 
                CASE 
                    WHEN TIMESTAMPDIFF(HOUR, created_at, NOW()) < 6 THEN '0-6 hours'
                    WHEN TIMESTAMPDIFF(HOUR, created_at, NOW()) < 12 THEN '6-12 hours'
                    WHEN TIMESTAMPDIFF(HOUR, created_at, NOW()) < 18 THEN '12-18 hours'
                    WHEN TIMESTAMPDIFF(HOUR, created_at, NOW()) < 24 THEN '18-24 hours'
                    ELSE '24+ hours (expired)'
                END as age_range,
                COUNT(*) as count
            FROM user_gemini_caches
            WHERE expires_at > NOW()
            GROUP BY age_range
            ORDER BY MIN(TIMESTAMPDIFF(HOUR, created_at, NOW()))
        `;
        
        const result = await pgClient.query(query);
        return result;
        
    } catch (error) {
        console.error('Failed to get age distribution:', error.message);
        return null;
    }
}

/**
 * Perform cache health check
 */
async function performCacheHealthCheck() {
    try {
        // Check for users with very old caches (approaching expiration)
        const expiringQuery = `
            SELECT user_id, cache_name, 
                   TIMESTAMPDIFF(HOUR, NOW(), expires_at) as hours_until_expiration
            FROM user_gemini_caches
            WHERE expires_at > NOW() 
            AND TIMESTAMPDIFF(HOUR, NOW(), expires_at) < 2
            LIMIT 10
        `;
        
        const expiringSoon = await pgClient.query(expiringQuery);
        
        // Get total unique users who have used chat
        const totalUsersQuery = `
            SELECT COUNT(DISTINCT user_id) as total_users
            FROM user_gemini_caches
        `;
        
        const totalUsersResult = await pgClient.query(totalUsersQuery);
        const totalUsers = totalUsersResult[0].total_users;
        
        // Get active cache count
        const activeCacheQuery = `
            SELECT COUNT(*) as active_count
            FROM user_gemini_caches
            WHERE expires_at > NOW()
        `;
        
        const activeCacheResult = await pgClient.query(activeCacheQuery);
        const activeCaches = activeCacheResult[0].active_count;
        
        return {
            totalUsers: totalUsers,
            usersWithActiveCache: activeCaches,
            cacheHitPotential: totalUsers > 0 
                ? ((activeCaches / totalUsers) * 100).toFixed(2) + '%'
                : 'N/A',
            cachesExpiringSoon: expiringSoon.length,
            expiringSoonDetails: expiringSoon.slice(0, 3) // Show first 3
        };
        
    } catch (error) {
        console.error('Health check failed:', error.message);
        return null;
    }
}

/**
 * Generate recommendations based on statistics
 */
function generateRecommendations(preStats, postStats) {
    const recommendations = [];
    
    if (!postStats) {
        console.log('⚠️ Cannot generate recommendations without statistics');
        return;
    }
    
    // Check cache hit rate
    const hitRate = postStats.active_caches > 0 
        ? (postStats.active_caches / postStats.total_caches) * 100
        : 0;
    
    if (hitRate < 50) {
        recommendations.push('⚠️ Low cache hit rate (<50%). Consider:');
        recommendations.push('   - Investigating why caches are expiring quickly');
        recommendations.push('   - Checking if TTL needs adjustment');
    } else if (hitRate > 80) {
        recommendations.push('✅ Excellent cache hit rate (>80%)!');
    }
    
    // Check average age
    const avgAge = parseFloat(postStats.avg_age_hours);
    if (avgAge < 6) {
        recommendations.push('⚠️ Low average cache age (<6 hours). Consider:');
        recommendations.push('   - Checking if caches are being invalidated prematurely');
        recommendations.push('   - Verifying system time is correct');
    }
    
    // Check total cache count
    if (postStats.total_caches < 10) {
        recommendations.push('ℹ️ Low total cache count. This is normal for new deployments.');
    } else if (postStats.total_caches > 10000) {
        recommendations.push('⚠️ High cache count (>10k). Consider:');
        recommendations.push('   - More frequent cleanup runs');
        recommendations.push('   - Adding database indexes for performance');
    }
    
    // Check cleanup effectiveness
    if (preStats && postStats) {
        const recordsRemoved = preStats.total_caches - postStats.total_caches;
        if (recordsRemoved === 0 && preStats.expired_caches > 0) {
            recommendations.push('⚠️ Cleanup ran but removed no records. Check cleanup logic.');
        } else if (recordsRemoved > 0) {
            recommendations.push(`✅ Cleanup successfully removed ${recordsRemoved} expired records.`);
        }
    }
    
    if (recommendations.length === 0) {
        console.log('✅ All systems normal. No recommendations.');
    } else {
        recommendations.forEach(rec => console.log(rec));
    }
}

// Run the maintenance script
if (require.main === module) {
    runMaintenance();
}

module.exports = { runMaintenance };