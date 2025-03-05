// ai.js
const { genkit } = require('genkit');
const { googleAI, gemini15Flash, gemini20FlashExp } = require('@genkit-ai/googleai');
const config = require('./config');

const ai = genkit({
    plugins: [googleAI({
        apiKey: config.genkitApiKey,
    })],
    model: gemini20FlashExp,
});

module.exports = ai;