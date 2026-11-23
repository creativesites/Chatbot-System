// packages/core/src/ai/index.js
const { AiCore, aiCore, zodToGeminiSchema, normalizeModelName } = require('./aiCore');
const {
    CLAUDE_MODELS,
    isClaudeModel,
    isComplexTask,
    getClaudeBackupModels,
    sendClaudeMessage,
} = require('./claudeBackup');

module.exports = aiCore;
module.exports.aiCore = aiCore;
module.exports.AiCore = AiCore;
module.exports.zodToGeminiSchema = zodToGeminiSchema;
module.exports.normalizeModelName = normalizeModelName;
module.exports.CLAUDE_MODELS = CLAUDE_MODELS;
module.exports.isClaudeModel = isClaudeModel;
module.exports.isComplexTask = isComplexTask;
module.exports.getClaudeBackupModels = getClaudeBackupModels;
module.exports.sendClaudeMessage = sendClaudeMessage;
