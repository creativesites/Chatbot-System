// config.js
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../myavana/.env') });

module.exports = {
    dbConfig: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT, 10) || 5432, // Default PostgreSQL port
    },
    myavanaDbConfig: {
        host: process.env.MYAVANA_DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.MYAVANA_DB_NAME,
        port: parseInt(process.env.DB_PORT, 10) || 5432, // Default PostgreSQL port
    },
    redisConfig: {
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        socket: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT, 10) || 6379, // Default Redis port
        }

    },
    genkitApiKey: process.env.GENKIT_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    defaultModel: 'gemini-3.7-flash',
    experimentalModel: 'gemini-3.7-flash',
    temperature: 1.1,
};