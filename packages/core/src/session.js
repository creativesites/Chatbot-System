// session.js
const { pgClient } = require('./database');

class DatabaseSessionStore {
    async get(sessionId) {
        const query = `
            SELECT session_data
            FROM sessions
            WHERE session_id = $1;
        `;
        const values = [sessionId];
        try {
            const res = await pgClient.query(query, values);
            if (res.rows.length > 0 && res.rows[0].session_data) {
                return res.rows[0].session_data;
            }
            return undefined; // Session not found or no data
        } catch (err) {
            console.error('Error retrieving session data from database:', err);
            return undefined;
        }
    }

    async save(sessionId, sessionData) {
        const query = `
            INSERT INTO sessions (session_id, user_id, session_data, last_accessed_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (session_id)
            DO UPDATE SET session_data = $3, last_accessed_at = NOW();
        `;
        const values = [sessionId, sessionId, sessionData];
        try {
            await pgClient.query(query, values);
            console.log(`Session data saved to database for sessionId: ${sessionId}`);
        } catch (err) {
            console.error('Error saving session data to database:', err);
        }
    }
}

module.exports = DatabaseSessionStore;