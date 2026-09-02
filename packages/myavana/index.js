const MyavanaChatbotServer = require('./src/index');

// Create a fulfillment handler that uses MyavanaChatbotServer
async function fulfillmentHandler(req, res) {
    console.log('🚀 Fulfillment Handler - Processing request with MyavanaChatbotServer');
    
    if (!global.myavanaServerInstance) {
        console.log('🔧 Creating new MyavanaChatbotServer instance...');
        global.myavanaServerInstance = new MyavanaChatbotServer();
        await global.myavanaServerInstance.initPromise;
        console.log('✅ MyavanaChatbotServer instance ready');
    }
    
    // Use the server's app to handle the request
    return global.myavanaServerInstance.app(req, res);
}

module.exports = {
    myavanaHandler: fulfillmentHandler,
    MyavanaChatbotServer: MyavanaChatbotServer,
    // For Cloud Run inline function compatibility
    fulfillmentHandler: fulfillmentHandler
};