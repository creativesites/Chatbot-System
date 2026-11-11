// database.js
const { Pool } = require('pg');
const { createClient } = require('redis');
const config = require('./config');
require('dotenv').config();

const pgClient = new Pool({
    ...config.dbConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
    query_timeout: 10000,
    statement_timeout: 10000,
    // The database is remote, so an idle TCP socket can be dropped by the
    // network (NAT/firewall) without a FIN ever reaching us. Without keepalive
    // the pool then hands out a half-open connection and the first query after
    // an idle period dies with "Connection terminated unexpectedly" - which on
    // a chat turn means no profile grounding, no history, and no save.
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});

pgClient.on('error', (err) => {
    console.error('PostgreSQL Pool idle client error (non-fatal):', err.message);
});

const redisConfig = {
    ...config.redisConfig,
    disableOfflineQueue: true,
};
if (!redisConfig.socket) {
    redisConfig.socket = {};
}
// Same idle-drop problem as the pg pool above: keep the socket warm so a
// dropped connection is detected and reconnected rather than timing out on the
// next request.
if (redisConfig.socket.keepAlive === undefined) {
    redisConfig.socket.keepAlive = 10000;
}
if (redisConfig.socket.connectTimeout === undefined) {
    redisConfig.socket.connectTimeout = 5000;
}
redisConfig.socket.reconnectStrategy = (retries) => {
    if (retries > 20) {
        return 10000;
    }
    return Math.min(retries * 500, 3000);
};

const rawRedisClient = createClient(redisConfig);
rawRedisClient.on('error', (err) => console.error('Redis error (handled):', err.message));

// Wrap get/set with a 1500ms timeout guard so a stalled Redis socket after
// Cloud Run CPU throttling never blocks a chat turn for 300 seconds.
const REDIS_OP_TIMEOUT_MS = 1500;
function withRedisTimeout(promise, fallbackValue = null) {
    let timer;
    const timeoutPromise = new Promise((resolve) => {
        timer = setTimeout(() => resolve(fallbackValue), REDIS_OP_TIMEOUT_MS);
        if (timer && typeof timer.unref === 'function') timer.unref();
    });
    return Promise.race([
        Promise.resolve(promise).catch((err) => {
            console.warn('Redis op fallback:', err?.message || err);
            return fallbackValue;
        }),
        timeoutPromise,
    ]).finally(() => clearTimeout(timer));
}

const origRedisGet = rawRedisClient.get.bind(rawRedisClient);
const origRedisSet = rawRedisClient.set.bind(rawRedisClient);
rawRedisClient.get = (key) => {
    if (!rawRedisClient.isReady) return Promise.resolve(null);
    return withRedisTimeout(origRedisGet(key), null);
};
rawRedisClient.set = (key, value, options) => {
    if (!rawRedisClient.isReady) return Promise.resolve(null);
    return withRedisTimeout(
        options !== undefined ? origRedisSet(key, value, options) : origRedisSet(key, value),
        null
    );
};

const redisClient = rawRedisClient;

const connectDatabases = async () => {
    try {
        const client = await pgClient.connect();
        client.release();
        console.log('Connected to PostgreSQL pool');

        if (!redisClient.isOpen) {
            try {
                await redisClient.connect();
                console.log('Connected to Redis');
            } catch (redisErr) {
                console.warn('⚠️ Redis initial connect failed, will auto-retry in background:', redisErr.message);
            }
        }
    } catch (err) {
        console.error('Database connection error:', err);
        // Allow app to continue attempting recovery
    }
};

module.exports = {
    pgClient,
    redisClient,
    connectDatabases,
};