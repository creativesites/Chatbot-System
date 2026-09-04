// packages/core/src/ai/index.js
const { AiCore, aiCore, zodToGeminiSchema, normalizeModelName } = require('./aiCore');

module.exports = aiCore;
module.exports.aiCore = aiCore;
module.exports.AiCore = AiCore;
module.exports.zodToGeminiSchema = zodToGeminiSchema;
module.exports.normalizeModelName = normalizeModelName;
