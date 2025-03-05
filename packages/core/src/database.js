// database.js
const { Client } = require('pg');
const { createClient } = require('redis');
const config = require('./config');
require('dotenv').config();

const pgClient = new Client(config.dbConfig);
const redisClient = createClient(config.redisConfig);
redisClient.on('error', (err) => console.error('Redis error:', err));

const connectDatabases = async () => {
    try {
        await pgClient.connect();
        await redisClient.connect();
        console.log('Connected to PostgreSQL and Redis');
    } catch (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
};

module.exports = {
    pgClient,
    redisClient,
    connectDatabases,
};