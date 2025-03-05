// hairIssues.js
const { pgClient } = require('./database');

const saveHairIssue = async (userId, issueDescription, botAdvice) => {
    const query = `
        INSERT INTO hair_issues (user_id, issue_description, bot_advice, advice_given_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING *;
    `;
    const values = [userId, issueDescription, botAdvice];
    try {
        const res = await pgClient.query(query, values);
        return res.rows[0];
    } catch (err) {
        console.error('Error saving hair issue:', err);
        return [];
    }
};

const getHairIssuesForUser = async (userId) => {
    const query = `
        SELECT *
        FROM hair_issues
        WHERE user_id = $1
        ORDER BY reported_at DESC;
    `;
    const values = [userId];
    try {
        const res = await pgClient.query(query, values);
        return res.rows; // Returns an array of hair issue objects
    } catch (err) {
        console.error('Error retrieving hair issues for user:', err);
        return []
    }
};

module.exports = {
    saveHairIssue,
    getHairIssuesForUser
}
