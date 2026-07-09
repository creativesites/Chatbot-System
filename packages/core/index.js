// packages/core/index.js - Fixed exports with proper module loading
const path = require('path');
const cacheManager = require('./src/cacheManager');

// Helper function to safely load modules
function safeRequire(modulePath, moduleName) {
    try {
        const module = require(modulePath);
        console.log(`✅ Successfully loaded ${moduleName}`);
        return module;
    } catch (error) {
        console.error(`❌ Failed to load ${moduleName}:`, error.message);
        return null;
    }
}

// Load all modules with error handling
const modules = {
    // Database and utilities (Enhanced)
    connectDatabases: safeRequire('./src/database', 'database').connectDatabases,
    pgClient: safeRequire('./src/database', 'database').pgClient,
    redisClient: safeRequire('./src/database', 'database').redisClient,
    
    // Enhanced database management
    DatabaseManager: safeRequire('./src/enhancedDatabase', 'DatabaseManager')?.DatabaseManager,
    createDatabaseManager: safeRequire('./src/enhancedDatabase', 'DatabaseManager')?.createDatabaseManager,
    getDatabaseManager: safeRequire('./src/enhancedDatabase', 'DatabaseManager')?.getDatabaseManager,
  
    // AI and session management
    ai: safeRequire('./src/ai', 'ai'),
    DatabaseSessionStore: safeRequire('./src/session', 'DatabaseSessionStore'),
    cacheManager: safeRequire('./src/cacheManager', 'cacheManager'),
    
  
    // User and conversation management
    getUserDetails: safeRequire('./src/user', 'user')?.getUserDetails,
    getAllConversationsSummary: safeRequire('./src/conversation', 'conversation')?.getAllConversationsSummary,
    getConversationHistory: safeRequire('./src/conversation', 'conversation')?.getConversationHistory,
    saveConversation: safeRequire('./src/conversation', 'conversation')?.saveConversation,
    generateConversationSummary: safeRequire('./src/conversation', 'conversation')?.generateConversationSummary,
  
    // Post-processing and hair issues
    postProcessConversation: safeRequire('./src/postResponseProcessing', 'postResponseProcessing')?.postProcessConversation,
    postResponseProcessing: safeRequire('./src/postResponseProcessing', 'postResponseProcessing')?.postResponseProcessing,
    updateUserProfile: safeRequire('./src/postResponseProcessing', 'postResponseProcessing')?.updateUserProfile,
    saveHairIssue: safeRequire('./src/hairIssues', 'hairIssues')?.saveHairIssue,
    getHairIssuesForUser: safeRequire('./src/hairIssues', 'hairIssues')?.getHairIssuesForUser,
    postResponseProductCheck: safeRequire('./src/postResponseProcessing', 'postResponseProcessing')?.postResponseProductCheck,
  
    // Utilities
    getAllProducts: safeRequire('./src/utils', 'utils')?.getAllProducts,
    getAllFaqs: safeRequire('./src/utils', 'utils')?.getAllFaqs,
    getAllYoutubeVideos: safeRequire('./src/utils', 'utils')?.getAllYoutubeVideos,
    getAllTestimonials: safeRequire('./src/utils', 'utils')?.getAllTestimonials,
    getAdditionalInstructions: safeRequire('./src/utils', 'utils')?.getAdditionalInstructions,
    getTrainingData: safeRequire('./src/utils', 'utils')?.getTrainingData,
    getChatbotWelcomeSettings: safeRequire('./src/utils', 'utils')?.getChatbotWelcomeSettings,
};

// Smart systems - Load with proper error handling and fallbacks
const smartModules = {
    SmartPromptManager: null,
    ResponseCache: null,
    ConversationAnalytics: null,
    ErrorRecoveryManager: null,
    PersonalizationEngine: null,
    UnifiedChatHandler: null
};

// Try to load smart modules
const smartModulePaths = {
    SmartPromptManager: './src/smartPromptManager',
    ResponseCache: './src/responseCache',
    ConversationAnalytics: './src/conversationAnalytics',
    ErrorRecoveryManager: './src/errorRecovery',
    PersonalizationEngine: './src/personalizationEngine',
    UnifiedChatHandler: './src/unifiedChatHandler'
};

// Load each smart module with fallback
for (const [moduleName, modulePath] of Object.entries(smartModulePaths)) {
    try {
        const loadedModule = require(modulePath);
        
        // Check if it's a constructor or needs default export
        if (typeof loadedModule === 'function') {
            smartModules[moduleName] = loadedModule;
            console.log(`✅ Loaded ${moduleName} as constructor`);
        } else if (loadedModule.default && typeof loadedModule.default === 'function') {
            smartModules[moduleName] = loadedModule.default;
            console.log(`✅ Loaded ${moduleName} from default export`);
        } else if (loadedModule[moduleName] && typeof loadedModule[moduleName] === 'function') {
            smartModules[moduleName] = loadedModule[moduleName];
            console.log(`✅ Loaded ${moduleName} from named export`);
        } else {
            throw new Error(`Module ${moduleName} is not a constructor`);
        }
    } catch (error) {
        console.error(`❌ Failed to load ${moduleName}:`, error.message);
        
        // Create fallback classes
        switch (moduleName) {
            case 'SmartPromptManager':
                smartModules[moduleName] = require('./src/fallbacks/smartPromptManagerFallback');
                break;
            case 'ResponseCache':
                smartModules[moduleName] = require('./src/fallbacks/responseCacheFallback');
                break;
            case 'ConversationAnalytics':
                smartModules[moduleName] = require('./src/fallbacks/conversationAnalyticsFallback');
                break;
            case 'ErrorRecoveryManager':
                smartModules[moduleName] = require('./src/fallbacks/errorRecoveryFallback');
                break;
            case 'PersonalizationEngine':
                smartModules[moduleName] = require('./src/fallbacks/personalizationEngineFallback');
                break;
            case 'UnifiedChatHandler':
                smartModules[moduleName] = require('./src/fallbacks/unifiedChatHandlerFallback');
                break;
        }
        console.log(`⚠️ Using fallback for ${moduleName}`);
    }
}

// Trend-aware knowledge
const trendModules = {
    trendManager: safeRequire('./src/trendManager', 'trendManager'),
    getTrendContext: safeRequire('./src/trendManager', 'trendManager')?.getTrendContext,
    generateTrends: safeRequire('./src/trendManager', 'trendManager')?.generateTrends,
};

// Conversation-driving behavior
const conversationDriverModules = {
    conversationDriver: safeRequire('./src/conversationDriver', 'conversationDriver'),
    getConversationDirective: safeRequire('./src/conversationDriver', 'conversationDriver')?.getConversationDirective,
};

// Adaptive Personality Engine
const personalityModules = {
    personaClassifier: safeRequire('./src/personaClassifier', 'personaClassifier'),
    buildMessageContext: safeRequire('./src/messageContextBuilder', 'messageContextBuilder')?.buildMessageContext,
};

// Tool-enabled agents
const agentToolModules = {
    agentTools: safeRequire('./src/agentTools', 'agentTools'),
    globalTools: safeRequire('./src/agentTools', 'agentTools')?.globalTools,
    createUserTools: safeRequire('./src/agentTools', 'agentTools')?.createUserTools,
};

// Enhanced systems
const enhancedModules = {
    Logger: safeRequire('./src/logger', 'Logger')?.Logger,
    createLogger: safeRequire('./src/logger', 'Logger')?.createLogger,
    getLogger: safeRequire('./src/logger', 'Logger')?.getLogger,
    Validator: safeRequire('./src/validation', 'Validator'),
    ErrorHandler: safeRequire('./src/errorHandler', 'ErrorHandler'),
    HealthMonitor: safeRequire('./src/healthMonitor', 'HealthMonitor')
};

// Export all modules
module.exports = {
    ...modules,
    ...smartModules,
    ...enhancedModules,
    ...trendModules,
    ...conversationDriverModules,
    ...personalityModules,
    ...agentToolModules,
};

// Log export summary
console.log('📦 Core module exports summary:');
console.log(`- Basic modules: ${Object.keys(modules).filter(k => modules[k] !== null).length}/${Object.keys(modules).length}`);
console.log(`- Smart modules: ${Object.keys(smartModules).filter(k => smartModules[k] !== null).length}/${Object.keys(smartModules).length}`);
console.log(`- Enhanced modules: ${Object.keys(enhancedModules).filter(k => enhancedModules[k] !== null).length}/${Object.keys(enhancedModules).length}`);