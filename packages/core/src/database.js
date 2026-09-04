// database.js
const { Pool } = require('pg');
const { createClient } = require('redis');
const config = require('./config');
require('dotenv').config();

const pgClient = new Pool({
    ...config.dbConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pgClient.on('error', (err) => {
    console.error('PostgreSQL Pool idle client error (non-fatal):', err.message);
});

const redisConfig = { ...config.redisConfig };
if (!redisConfig.socket) {
    redisConfig.socket = {};
}
redisConfig.socket.reconnectStrategy = (retries) => {
    if (retries > 20) {
        return 10000;
    }
    return Math.min(retries * 500, 3000);
};

const redisClient = createClient(redisConfig);
redisClient.on('error', (err) => console.error('Redis error (handled):', err.message));

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