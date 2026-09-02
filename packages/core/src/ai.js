// ai.js
const { genkit } = require('genkit/beta');
const { googleAI } = require('@genkit-ai/google-genai');

const config = require('./config');

const ai = genkit({
    plugins: [googleAI({
        apiKey: config.genkitApiKey,
    })],
    model: googleAI.model('gemini-3.7-flash'),
});

module.exports = ai;