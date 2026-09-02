// funnelEvents.js
const { pgClient } = require('./database');

/**
 * Logs a D2C conversion-funnel milestone (intake_completed, paywall_shown,
 * purchase_completed, hhcp_delivered, consult_triaged, ...). Additive to
 * conversation_metrics.conversion_event — lets funnel drop-off be queried per stage.
 *
 * @param {string} userId
 * @param {string} conversationId
 * @param {string} eventType
 * @param {object} [metadata]
 */
const logFunnelEvent = async (userId, conversationId, eventType, metadata = {}) => {
    const query = `
        INSERT INTO chatbot_funnel_events (user_id, conversation_id, event_type, metadata)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;
    const values = [userId, conversationId, eventType, JSON.stringify(metadata)];
    try {
        const res = await pgClient.query(query, values);
        return res.rows[0];
    } catch (err) {
        console.error('Error logging funnel event:', err);
        return null;
    }
};

module.exports = {
    logFunnelEvent,
};
