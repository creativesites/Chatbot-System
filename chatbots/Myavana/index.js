// index.js (for Cloud Run inline function)
const { fulfillmentHandler } = require('../../packages/myavana');

// Main Cloud Run handler function
exports.myavanaBot = async (req, res) => {
    try {
        console.log('🚀 Cloud Run Myavana Bot - Processing request');
        console.log('📊 Request method:', req.method);
        console.log('📊 Request path:', req.path);
        console.log('📊 Request headers:', JSON.stringify(req.headers, null, 2));
        
        // Handle different HTTP methods
        if (req.method === 'GET') {
            // Health check or root endpoint
            if (req.path === '/health' || req.path === '/healthz') {
                return res.status(200).json({
                    status: 'healthy',
                    service: 'Myavana Chatbot',
                    timestamp: new Date().toISOString(),
                    version: '1.0.24'
                });
            } else {
                return res.json({
                    service: 'Myavana Chatbot',
                    status: 'running',
                    timestamp: new Date().toISOString(),
                    version: '1.0.24'
                });
            }
        }
        
        // Handle POST requests (chat requests)
        if (req.method === 'POST') {
            await fulfillmentHandler(req, res);
        } else {
            res.status(405).json({
                error: true,
                message: 'Method not allowed',
                allowedMethods: ['GET', 'POST']
            });
        }
    } catch (error) {
        console.error('❌ Error in Cloud Run function:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // Return proper error response
        if (!res.headersSent) {
            res.status(500).json({
                error: true,
                message: 'Internal server error - chatbot temporarily unavailable',
                timestamp: new Date().toISOString()
            });
        }
    }
};

// For compatibility with different naming conventions
exports.siennaNaturalsBot = exports.myavanaBot;