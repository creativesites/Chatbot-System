// Re-export all shared modules
module.exports = {
    // Database and utilities
    connectDatabases: require('./src/database').connectDatabases,
    pgClient: require('./src/database').pgClient,
    redisClient: require('./src/database').redisClient,
  
    // AI and session management
    ai: require('./src/ai'),
    DatabaseSessionStore: require('./src/session'),
  
    // User and conversation management
    getUserDetails: require('./src/user').getUserDetails,
    getAllConversationsSummary: require('./src/conversation').getAllConversationsSummary,
    getConversationHistory: require('./src/conversation').getConversationHistory,
    saveConversation: require('./src/conversation').saveConversation,
    generateConversationSummary: require('./src/conversation').generateConversationSummary,
  
    // Post-processing and hair issues
    postProcessConversation: require('./src/postResponseProcessing').postProcessConversation,
    postResponseProcessing: require('./src/postResponseProcessing').postResponseProcessing,
    saveHairIssue: require('./src/hairIssues').saveHairIssue,
    getHairIssuesForUser: require('./src/hairIssues').getHairIssuesForUser,
    postResponseProductCheck: require('./src/postResponseProcessing').postResponseProductCheck,
  
    // Utilities
    getAllProducts: require('./src/utils').getAllProducts,
    getAllFaqs: require('./src/utils').getAllFaqs,
    getAllYoutubeVideos: require('./src/utils').getAllYoutubeVideos,
    getAllTestimonials: require('./src/utils').getAllTestimonials,
    getAdditionalInstructions: require('./src/utils').getAdditionalInstructions
  };