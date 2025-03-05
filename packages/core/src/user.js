// user.js
const { pgClient, redisClient } = require('./database');

const getUserDetails = async (userId) => {
    try {
        const cachedUser = await redisClient.get(`user:${userId}`);
        if (cachedUser) return JSON.parse(cachedUser);

        const query = `SELECT * FROM users WHERE user_id = $1;`;
        const values = [userId];
        const res = await pgClient.query(query, values);

        if (res.rows[0]) {
            await redisClient.set(`user:${userId}`, JSON.stringify(res.rows[0]));
            return res.rows[0];
        }

        const createUserQuery = `
            INSERT INTO users (user_id)
            VALUES ($1)
            RETURNING *;
        `;
        const createUserRes = await pgClient.query(createUserQuery, [userId]);
        if (createUserRes.rows[0]) {
            await redisClient.set(`user:${userId}`, JSON.stringify(createUserRes.rows[0]));
            return createUserRes.rows[0];
        }
        return null;
    } catch (err) {
        console.error('Error retrieving user details:', err);
        throw err;
    }
};

module.exports = {
    getUserDetails,
};