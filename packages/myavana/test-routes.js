// Quick test to verify routes are working
const MyavanaChatbotServer = require('./src/index');

async function testRoutes() {
    console.log('🧪 Testing MyavanaChatbotServer routes...');
    
    try {
        // Create server instance
        const server = new MyavanaChatbotServer();
        
        // Wait for initialization
        await server.initPromise;
        console.log('✅ Server initialized successfully');
        
        // Start server on test port
        const testPort = process.env.TEST_PORT || 8081;
        const httpServer = server.start(testPort);
        
        console.log('🚀 Test server running on port', testPort);
        console.log('🧪 Routes should be available at:');
        console.log('   GET  http://localhost:' + testPort + '/');
        console.log('   GET  http://localhost:' + testPort + '/health');
        console.log('   POST http://localhost:' + testPort + '/ (for chat)');
        console.log('   POST http://localhost:' + testPort + '/webhook (for chat)');
        
        // Keep server running for 10 seconds for manual testing
        setTimeout(() => {
            console.log('🛑 Shutting down test server...');
            httpServer.close(() => {
                console.log('✅ Test server shut down successfully');
                process.exit(0);
            });
        }, 10000);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('❌ Error details:', {
            name: error.name,
            stack: error.stack
        });
        process.exit(1);
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testRoutes();
}

module.exports = testRoutes;